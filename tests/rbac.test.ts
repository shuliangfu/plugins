/**
 * RBAC plugin tests
 */
import { ServiceContainer } from "@dreamer/service";
import type { RequestContext } from "@dreamer/plugin";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  MemoryRbacStore,
  rbacPlugin,
  RbacService,
  type RbacUser,
} from "../src/rbac/mod.ts";
import { RbacFieldError } from "../src/rbac/service/service.ts";
import { listRouteTransfer } from "../src/rbac/api/mod.ts";

function ctx(
  path: string,
  method = "GET",
  body?: unknown,
): RequestContext {
  const url = new URL(path, "http://localhost");
  return {
    request: new Request(url, {
      method,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body == null || method === "GET" ? undefined : JSON.stringify(body),
    }),
    path: url.pathname,
    method,
    url,
    headers: new Headers({
      "content-type": "application/json",
      accept: "application/json",
    }),
    query: Object.fromEntries(url.searchParams),
    body,
  };
}

describe("RBAC 插件", () => {
  let store: MemoryRbacStore;
  let service: RbacService;
  let admin: RbacUser;

  beforeEach(async () => {
    store = new MemoryRbacStore();
    admin = { id: "u-admin" };
    service = new RbacService(store, {
      store,
      getUser: () => admin,
      allowActions: ["/login", "/assets/*"],
      seed: { assignUserId: "u-admin" },
    });
    await service.seed();
  });

  it("种子超级管理员靠 /* 放行，而不是代码短路", async () => {
    const access = await service.getAccess(admin);
    expect(access.routeAllows.includes("/*")).toBe(true);
    expect((await service.checkRoute("/anything", admin)).ok).toBe(true);
    const role = await store.getRoleByCode("super-admin");
    expect(role?.isSuperAdmin).toBe(true);
  });

  it("isSuperAdmin 标记本身不能通过检查", async () => {
    const role = await store.saveRole({
      id: "r-flag",
      code: "flag-only",
      name: "仅标记",
      isSuperAdmin: true,
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-flag" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const decision = await service.checkRoute("/users", user);
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.status).toBe(403);
  });

  it("模块通配 /users/* 放行子路径，未授权模块拒绝", async () => {
    const role = await store.saveRole({
      id: "r-users",
      code: "users",
      name: "用户管理",
      routeAllows: ["/users/*"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-users" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    expect((await service.checkRoute("/users", user)).ok).toBe(true);
    expect((await service.checkRoute("/users/edit", user)).ok).toBe(true);
    expect((await service.checkRoute("/cgm", user)).ok).toBe(false);
  });

  it("排除通配优先于允许", async () => {
    const role = await store.saveRole({
      id: "r-ex",
      code: "ex",
      name: "排除",
      routeAllows: ["/users/*"],
      routeExcludes: ["/users/secret"],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-ex" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    expect((await service.checkRoute("/users/list", user)).ok).toBe(true);
    expect((await service.checkRoute("/users/secret", user)).ok).toBe(false);
  });

  it("未登录返回 401，白名单放行", async () => {
    const unauth = await service.checkRoute("/users", null);
    expect(unauth.ok).toBe(false);
    if (!unauth.ok) expect(unauth.status).toBe(401);
    expect((await service.checkRoute("/login", null)).ok).toBe(true);
    expect((await service.checkRoute("/forbidden", null)).ok).toBe(true);
    expect((await service.checkRoute("/assets/app.js", null)).ok).toBe(true);
  });

  it("菜单按路由通配过滤", async () => {
    const role = await store.saveRole({
      id: "r-menu",
      code: "menu",
      name: "菜单",
      routeAllows: ["/cgm/*"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-menu" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const access = await service.getAccess(user);
    const menus = service.filterMenus(access, [
      {
        title: "业务",
        children: [
          { title: "CGM", path: "/cgm/devices" },
          { title: "用户", path: "/users" },
        ],
      },
    ]);
    expect(menus.length).toBe(1);
    expect(menus[0]!.children?.map((item) => item.path)).toEqual([
      "/cgm/devices",
    ]);
  });

  it("扁平 parentKey 菜单在没有可见子项时隐藏父级", async () => {
    const role = await store.saveRole({
      id: "r-menu-flat",
      code: "menu-flat",
      name: "扁平菜单",
      routeAllows: ["/cgm/*"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-menu-flat" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const access = await service.getAccess(user);
    const menus = service.filterMenus(access, [
      { key: "settings", title: "系统管理", parentKey: "", sort: 1 },
      {
        key: "settings.basic",
        title: "基础设置",
        path: "/system/base",
        parentKey: "settings",
        sort: 1,
      },
      { key: "cgm", title: "CGM管理", parentKey: "", sort: 2 },
      {
        key: "cgm.devices",
        title: "CGM 设备",
        path: "/cgm/devices",
        parentKey: "cgm",
        sort: 1,
      },
      {
        key: "off",
        title: "已停用",
        path: "/cgm/vendors",
        parentKey: "cgm",
        status: "disabled",
        sort: 2,
      },
    ]);
    expect(menus.map((item) => item.key)).toEqual(["cgm"]);
    expect(menus[0]!.children?.map((item) => item.path)).toEqual([
      "/cgm/devices",
    ]);
  });

  it("角色子项循环会被拒绝", async () => {
    const a = await store.saveRole({
      id: "ra",
      code: "a",
      name: "A",
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const b = await store.saveRole({
      id: "rb",
      code: "b",
      name: "B",
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [a.id],
      childPermissionIds: [],
    });
    let failed = false;
    try {
      await service.setRoleChildren(a.id, {
        roleIds: [b.id],
        permissionIds: [],
        routes: [],
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("可以删除最后一个超级管理员角色", async () => {
    const role = await store.getRoleByCode("super-admin");
    await service.removeRole(role!.id);
    expect(await store.getRole(role!.id)).toBeNull();
  });

  it("非开发者不能进入开发者专区", async () => {
    const role = await store.saveRole({
      id: "r-all",
      code: "wide",
      name: "宽",
      routeAllows: ["/*"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-wide" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const decision = await service.checkRoute("/developer/menus", user);
    expect(decision.ok).toBe(false);
    const dev = { id: "dev", isDeveloper: true };
    await store.saveAssignment({
      userId: dev.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    expect((await service.checkRoute("/developer/menus", dev)).ok).toBe(true);
  });

  it("插件 onRequest 对未登录的 API 返回 401 JSON", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => null,
      allowActions: ["/login"],
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const res = await plugin.onRequest?.(ctx("/api/rbac/roles"), container);
    expect(res).toBeTruthy();
    expect(res!.status).toBe(401);
  });

  it("已授权用户可以通过 API 创建角色", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const res = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    expect(res).toBeTruthy();
    expect(res!.status).toBe(200);
    const payload = await res!.json();
    expect(payload.ok).toBe(true);
    expect(payload.item.code).toBe("ops");
  });

  it("view 接口用 data 返回单条记录", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    const id = (await created!.json()).item.id as string;
    const res = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/view?id=${id}`),
      container,
    );
    expect(res).toBeTruthy();
    expect(res!.status).toBe(200);
    const payload = await res!.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.id).toBe(id);
    expect(payload.data.code).toBe("ops");
    expect(payload.data.name).toBe("运维");
    expect(payload.item).toBeUndefined();
    expect(Array.isArray(payload.data.permissions)).toBe(true);
    expect(Array.isArray(payload.data.managedRoutes)).toBe(true);
  });

  it("角色和权限详情可以列出并同步子项", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    const roleId = (await created!.json()).item.id as string;
    const permCreated = await plugin.onRequest?.(
      ctx("/api/rbac/permissions/create", "POST", { name: "详情子项权限" }),
      container,
    );
    const permissionId = (await permCreated!.json()).item.id as string;
    expect(permissionId).toBeTruthy();
    const children = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/children?id=${roleId}`),
      container,
    );
    const catalog = await children!.json();
    expect(catalog.ok).toBe(true);
    expect(Array.isArray(catalog.roles)).toBe(true);
    expect(Array.isArray(catalog.permissions)).toBe(true);
    expect(Array.isArray(catalog.managedRoutes)).toBe(true);
    const synced = await plugin.onRequest?.(
      ctx("/api/rbac/roles/children", "POST", {
        id: roleId,
        permissionIds: [permissionId],
        routes: [],
        roleIds: [],
      }),
      container,
    );
    expect((await synced!.json()).ok).toBe(true);
    const after = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/children?id=${roleId}`),
      container,
    );
    const assigned = await after!.json();
    expect(assigned.permissionIds).toContain(permissionId);

    const permView = await plugin.onRequest?.(
      ctx(`/api/rbac/permissions/view?id=${permissionId}`),
      container,
    );
    const permData = (await permView!.json()).data;
    expect(Array.isArray(permData.permissions)).toBe(true);
    expect(Array.isArray(permData.managedRoutes)).toBe(true);
    const permChildren = await plugin.onRequest?.(
      ctx(`/api/rbac/permissions/children?id=${permissionId}`),
      container,
    );
    expect((await permChildren!.json()).ok).toBe(true);
  });

  it("路由穿梭框可以列出并同步已管理路由", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    container.registerSingleton("router", () => ({
      getRoutes: () => [{ path: "/users" }, { path: "/users/list" }],
    }));
    await plugin.onInit?.(container);
    const listed = await plugin.onRequest?.(
      ctx("/api/rbac/routes/transfer"),
      container,
    );
    expect(listed).toBeTruthy();
    expect(listed!.status).toBe(200);
    const first = await listed!.json();
    expect(first.ok).toBe(true);
    expect(first.available.map((row: { key: string }) => row.key)).toContain(
      "/users",
    );
    expect(first.managed.map((row: { key: string }) => row.key)).not
      .toContain("/users");
    const synced = await plugin.onRequest?.(
      ctx("/api/rbac/routes/sync", "POST", { add: ["/users"], remove: [] }),
      container,
    );
    const after = await synced!.json();
    expect(after.ok).toBe(true);
    expect(after.managed.map((row: { key: string }) => row.key)).toContain(
      "/users",
    );
    expect(after.available.map((row: { key: string }) => row.key)).not
      .toContain("/users");
  });

  it("can 按路由通配判断", async () => {
    const role = await store.saveRole({
      id: "r-can",
      code: "can",
      name: "判断",
      routeAllows: ["/users/*"],
      routeExcludes: ["/users/secret"],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-can" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const access = await service.getAccess(user);
    expect(service.can(access, "/users/list")).toBe(true);
    expect(service.can(access, "/users/secret")).toBe(false);
    expect(service.can(access, "/cgm")).toBe(false);
    expect(service.viewAccess(access).routeAllows).toEqual(["/users/*"]);
  });

  it("扫描到的路由只出现在待添加，种子不会写入已管理", async () => {
    const local = new MemoryRbacStore();
    const svc = new RbacService(local, {
      store: local,
      getUser: () => admin,
    });
    const container = new ServiceContainer();
    container.registerSingleton("router", () => ({
      getRoutes: () => [{ path: "/orders/*" }, { path: "/api/orders" }],
    }));
    svc.container = container;
    await svc.seed();
    const paths = (await local.listRoutes()).map((row) => row.path);
    expect(paths.includes("/orders/*")).toBe(false);
    expect(paths.includes("/api/orders")).toBe(false);
    const listed = await listRouteTransfer(svc);
    expect(listed.available.map((row: { key: string }) => row.key)).toContain(
      "/orders/*",
    );
    expect(listed.available.map((row: { key: string }) => row.key)).toContain(
      "/api/orders",
    );
  });

  it("种子不会根据已注册路由自动创建权限", async () => {
    const local = new MemoryRbacStore();
    const svc = new RbacService(local, {
      store: local,
      getUser: () => admin,
    });
    const container = new ServiceContainer();
    container.registerSingleton("router", () => ({
      getRoutes: () => [
        { path: "/api/admin" },
        { path: "/users" },
      ],
    }));
    svc.container = container;
    await svc.seed();
    const names = (await local.listPermissions()).map((row) => row.name);
    expect(names.includes("管理员列表")).toBe(false);
    expect(names.includes("/api/admin")).toBe(false);
    expect(names.includes("/users")).toBe(false);
    const paths = (await local.listRoutes()).map((row) => row.path);
    expect(paths.includes("/users")).toBe(false);
  });

  it("GET /access 返回当前用户权限", async () => {
    const role = await store.saveRole({
      id: "r-page",
      code: "rbac-roles-only",
      name: "只看角色",
      routeAllows: ["/rbac/roles"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-page" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const plugin = rbacPlugin({
      store,
      getUser: () => user,
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const accessRes = await plugin.onRequest?.(
      ctx("/api/rbac/access"),
      container,
    );
    expect(accessRes?.status).toBe(200);
    const accessBody = await accessRes!.json();
    expect(accessBody.ok).toBe(true);
    expect(accessBody.item.routeAllows).toEqual(["/rbac/roles"]);
    expect(accessBody.menus).toBeUndefined();
  });

  it("已授权用户可以通过 API 分配角色并列出", async () => {
    const role = await store.getRoleByCode("super-admin");
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
      hooks: {
        listUsers: () =>
          Promise.resolve([
            { id: "u-admin", name: "管理员", username: "admin" },
            { id: "u-ops", name: "运维", username: "ops" },
          ]),
      },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const listRes = await plugin.onRequest?.(
      ctx("/api/rbac/assign"),
      container,
    );
    const listBody = await listRes!.json();
    expect(listBody.ok).toBe(true);
    expect(listBody.items.map((row: { id: string }) => row.id)).toEqual([
      "u-admin",
      "u-ops",
    ]);
    const updateRes = await plugin.onRequest?.(
      ctx("/api/rbac/assign/update", "POST", {
        id: "u-ops",
        roleIds: [role!.id],
        permissionIds: [],
        routes: ["/settings"],
      }),
      container,
    );
    expect((await updateRes!.json()).ok).toBe(true);
    const assignment = await store.getAssignment("u-ops");
    expect(assignment.roleIds).toEqual([role!.id]);
    expect(assignment.routeAllows).toEqual(["/settings"]);
    const viewRes = await plugin.onRequest?.(
      ctx("/api/rbac/assign/view?id=u-ops"),
      container,
    );
    const viewBody = await viewRes!.json();
    expect(viewBody.data.username).toBe("ops");
    expect(viewBody.data.routes).toEqual(["/settings"]);
  });

  it("分配和排除可以分别保存，排除会从有效权限里去掉", async () => {
    const role = await store.saveRole({
      id: "r-grant",
      code: "grant",
      name: "授权角色",
      routeAllows: ["/*"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const denied = await store.savePermission({
      id: "p-secret",
      name: "机密",
      routeAllows: ["/secret"],
      routeExcludes: [],
      childPermissionIds: [],
      source: "manual",
    });
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
      hooks: {
        listUsers: () =>
          Promise.resolve([{ id: "u-ops", name: "运维", username: "ops" }]),
      },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);

    const assignRes = await plugin.onRequest?.(
      ctx("/api/rbac/assign/update", "POST", {
        id: "u-ops",
        roleIds: [role.id],
        permissionIds: [denied.id],
        routes: ["/settings"],
        roleExcludeIds: [],
        permissionExcludeIds: [denied.id],
        routeExcludes: ["/secret"],
      }),
      container,
    );
    expect((await assignRes!.json()).ok).toBe(true);
    const assignment = await store.getAssignment("u-ops");
    expect(assignment.roleIds).toEqual([role.id]);
    expect(assignment.permissionIds).toEqual([denied.id]);
    expect(assignment.permissionExcludes).toEqual([denied.id]);
    expect(assignment.routeExcludes).toEqual(["/secret"]);
    const viewRes = await plugin.onRequest?.(
      ctx("/api/rbac/assign/view?id=u-ops"),
      container,
    );
    const viewBody = await viewRes!.json();
    expect(viewBody.data.permissionExcludeIds).toEqual([denied.id]);
    expect(viewBody.data.routeExcludes).toEqual(["/secret"]);

    const access = await service.getAccess({ id: "u-ops" });
    expect(access.routeAllows.includes("/*")).toBe(true);
    expect(service.can(access, "/settings")).toBe(true);
    expect(service.can(access, "/secret")).toBe(false);

    const childrenRes = await plugin.onRequest?.(
      ctx("/api/rbac/roles/children", "POST", {
        id: role.id,
        roleIds: [],
        permissionIds: [denied.id],
        routes: ["/*"],
        roleExcludeIds: [],
        permissionExcludeIds: [denied.id],
        routeExcludes: ["/secret"],
      }),
      container,
    );
    expect((await childrenRes!.json()).ok).toBe(true);
    const saved = await store.getRole(role.id);
    expect(saved?.permissionExcludes).toEqual([denied.id]);
    expect(saved?.routeExcludes).toEqual(["/secret"]);
  });

  it("有页面权限即可调用对应管理 API", async () => {
    const role = await store.saveRole({
      id: "r-api-page",
      code: "roles-page",
      name: "角色页",
      routeAllows: ["/rbac/roles"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-api-page" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    expect((await service.checkRoute("/api/rbac/roles", user)).ok).toBe(true);
    expect((await service.checkRoute("/api/rbac/roles/create", user)).ok).toBe(
      true,
    );
    expect((await service.checkRoute("/api/rbac/permissions", user)).ok).toBe(
      false,
    );
  });

  it("角色标识不能重复，删除角色会清掉引用", async () => {
    const child = await service.saveRole({
      id: "r-child",
      code: "child",
      name: "子角色",
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const parent = await service.saveRole({
      id: "r-parent",
      code: "parent",
      name: "父角色",
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [child.id],
      childPermissionIds: [],
    });
    await store.saveAssignment({
      userId: "u-holder",
      roleIds: [child.id],
      permissionIds: [],
    });
    let failed = false;
    try {
      await service.saveRole({ ...child, id: "r-other", code: "child" });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    await service.removeRole(child.id);
    expect((await store.getRole(parent.id))?.childRoleIds).toEqual([]);
    expect((await store.getAssignment("u-holder")).roleIds).toEqual([]);
  });

  it("角色和权限名称不能重复", async () => {
    await service.saveRole({
      id: "r-named",
      code: "named",
      name: "同名角色",
      routeAllows: [],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    let error: unknown;
    try {
      await service.saveRole({
        id: "r-named-2",
        code: "named-2",
        name: " 同名角色 ",
        routeAllows: [],
        routeExcludes: [],
        childRoleIds: [],
        childPermissionIds: [],
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RbacFieldError);
    expect((error as RbacFieldError).field).toBe("name");
    expect((error as RbacFieldError).message).toBe("名称已存在");

    const first = await store.getRole("r-named");
    await service.saveRole({ ...first!, description: "可更新自己" });

    await service.savePermission({
      id: "p-named",
      name: "同名权限",
      routeAllows: [],
      routeExcludes: [],
      childPermissionIds: [],
      source: "manual",
    });
    error = undefined;
    try {
      await service.savePermission({
        id: "p-named-2",
        name: "同名权限",
        routeAllows: [],
        routeExcludes: [],
        childPermissionIds: [],
        source: "manual",
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RbacFieldError);
    expect((error as RbacFieldError).field).toBe("name");

    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const res = await plugin.onRequest?.(
      ctx("/api/rbac/permissions/create", "POST", { name: "同名权限" }),
      container,
    );
    expect(res).toBeTruthy();
    expect(res!.status).toBe(400);
    const payload = await res!.json();
    expect(payload.ok).toBe(false);
    expect(payload.messages).toEqual({ name: "名称已存在" });
  });

  it("不能通过更新去掉最后一个超级管理员的 /*，可以删除内置权限", async () => {
    const role = await store.getRoleByCode("super-admin");
    let failed = false;
    try {
      await service.saveRole({ ...role!, routeAllows: ["/rbac/*"] });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    const builtin = await store.savePermission({
      id: "p-seed",
      name: "内置权限",
      routeAllows: ["/rbac/roles"],
      routeExcludes: [],
      childPermissionIds: [],
      source: "seed",
    });
    await service.removePermission(builtin.id);
    expect(await store.getPermission(builtin.id)).toBeNull();
  });

  async function boot(apiMode?: "action" | "restful", config?: unknown) {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
      ...(apiMode ? { apiMode } : {}),
    });
    const container = new ServiceContainer();
    if (config !== undefined) {
      container.registerSingleton("config", () => config);
    }
    await plugin.onInit?.(container);
    return { plugin, container };
  }

  it("权限和角色列表都可以批量删除，含内置权限和超级管理员角色", async () => {
    const { plugin, container } = await boot();
    await store.savePermission({
      id: "p-manual-1",
      name: "手动一",
      routeAllows: [],
      routeExcludes: [],
      childPermissionIds: [],
      source: "manual",
    });
    const builtin = await store.savePermission({
      id: "p-seed-batch",
      name: "内置权限",
      routeAllows: ["/rbac/roles"],
      routeExcludes: [],
      childPermissionIds: [],
      source: "seed",
    });
    const permRes = await plugin.onRequest?.(
      ctx("/api/rbac/permissions/remote-batch", "POST", {
        ids: ["p-manual-1", builtin!.id],
      }),
      container,
    );
    expect(permRes!.status).toBe(200);
    const permBody = await permRes!.json();
    expect(permBody.removed).toBe(2);
    expect(permBody.failed).toEqual([]);
    expect(await store.getPermission("p-manual-1")).toBeNull();
    expect(await store.getPermission(builtin!.id)).toBeNull();

    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    const opsId = (await created!.json()).item.id as string;
    const superRole = await store.getRoleByCode("super-admin");
    const roleRes = await plugin.onRequest?.(
      ctx("/api/rbac/roles/remote-batch", "POST", {
        ids: [opsId, superRole!.id],
      }),
      container,
    );
    expect(roleRes!.status).toBe(200);
    const roleBody = await roleRes!.json();
    expect(roleBody.removed).toBe(2);
    expect(roleBody.failed).toEqual([]);
    expect(await store.getRole(opsId)).toBeNull();
    expect(await store.getRole(superRole!.id)).toBeNull();
  });

  it("action 模式拒绝 PUT 和 DELETE，只走 GET/POST 动作路径", async () => {
    const { plugin, container } = await boot();
    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    const id = (await created!.json()).item.id as string;
    const put = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`, "PUT", { name: "运维组" }),
      container,
    );
    expect(put!.status).toBe(404);
    const deleted = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`, "DELETE"),
      container,
    );
    expect(deleted!.status).toBe(404);
    const update = await plugin.onRequest?.(
      ctx("/api/rbac/roles/update", "POST", { id, name: "运维组" }),
      container,
    );
    expect(update!.status).toBe(200);
    expect((await update!.json()).item.name).toBe("运维组");
  });

  it("从容器 AppConfig.router.apiMode 打开 restful 的 PUT/DELETE", async () => {
    const { plugin, container } = await boot(undefined, {
      router: { apiMode: "restful" },
    });
    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles", "POST", { code: "ops", name: "运维" }),
      container,
    );
    expect(created!.status).toBe(200);
    const id = (await created!.json()).item.id as string;
    const viewed = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`),
      container,
    );
    expect(viewed!.status).toBe(200);
    expect((await viewed!.json()).data.code).toBe("ops");
    const put = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`, "PUT", { name: "运维组" }),
      container,
    );
    expect(put!.status).toBe(200);
    expect((await put!.json()).item.name).toBe("运维组");
    const deleted = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`, "DELETE"),
      container,
    );
    expect(deleted!.status).toBe(200);
    const missing = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/view?id=${id}`),
      container,
    );
    expect(missing!.status).toBe(404);
  });

  it("插件 apiMode 选项优先于容器配置", async () => {
    const { plugin, container } = await boot("action", {
      router: { apiMode: "restful" },
    });
    const created = await plugin.onRequest?.(
      ctx("/api/rbac/roles/create", "POST", { code: "ops", name: "运维" }),
      container,
    );
    const id = (await created!.json()).item.id as string;
    const put = await plugin.onRequest?.(
      ctx(`/api/rbac/roles/${id}`, "PUT", { name: "运维组" }),
      container,
    );
    expect(put!.status).toBe(404);
  });

  it("目录不再隐藏开发路径；isDeveloper 来自用户标记并授予 /*", async () => {
    const flagged = await store.saveRole({
      id: "r-flagged",
      code: "flagged",
      name: "标记角色",
      isDeveloper: true,
      routeAllows: ["/rbac/roles"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    await store.savePermission({
      id: "p-dev",
      name: "开发者菜单",
      routeAllows: ["/developer/menus"],
      routeExcludes: [],
      childPermissionIds: [],
      source: "manual",
    });
    await store.saveRoute({ path: "/developer/menus", source: "manual" });

    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);

    const permissions = await (await plugin.onRequest?.(
      ctx("/api/rbac/permissions?q=开发者菜单"),
      container,
    ))!.json();
    expect(
      (permissions.items as Array<{ name: string; routeAllows?: string[] }>)
        .some((row) =>
          row.name === "开发者菜单" ||
          (row.routeAllows ?? []).includes("/developer/menus")
        ),
    ).toBe(true);

    const routes = await (await plugin.onRequest?.(
      ctx("/api/rbac/routes"),
      container,
    ))!.json();
    expect(
      (routes.items as Array<{ path: string }>).some((row) =>
        row.path === "/developer/menus"
      ),
    ).toBe(true);

    const flaggedUser = { id: "u-flagged", roleIds: [flagged.id] };
    await store.saveAssignment({
      userId: flaggedUser.id,
      roleIds: [flagged.id],
      permissionIds: [],
    });
    const flaggedAccess = await service.getAccess(flaggedUser);
    expect(flaggedAccess.isDeveloper).toBe(false);
    expect(flaggedAccess.routeAllows.includes("/*")).toBe(false);

    const dev = { id: "u-dev", isDeveloper: true };
    await store.saveAssignment({
      userId: dev.id,
      roleIds: [],
      permissionIds: [],
    });
    const access = await service.getAccess(dev);
    expect(access.isDeveloper).toBe(true);
    expect(access.routeAllows.includes("/*")).toBe(true);
  });

  it("非开发者即使有 /* 也看不到开发管理菜单", async () => {
    const menus = [
      { key: "rbac-roles", title: "角色列表", path: "/rbac/roles" },
      { key: "developer", title: "开发管理", path: "/developer/menus" },
    ];
    const wide = { id: "u-menu-wide" };
    await store.saveAssignment({
      userId: wide.id,
      roleIds: [],
      permissionIds: [],
      routeAllows: ["/*"],
    });
    const hidden = await service.menusFor(wide, menus);
    expect(hidden.some((item) => item.path === "/developer/menus")).toBe(false);
    expect(hidden.some((item) => item.path === "/rbac/roles")).toBe(true);

    const dev = { id: "u-menu-dev", isDeveloper: true };
    await store.saveAssignment({
      userId: dev.id,
      roleIds: [],
      permissionIds: [],
    });
    const shown = await service.menusFor(dev, menus);
    expect(shown.some((item) => item.path === "/developer/menus")).toBe(true);
  });

  it("isDeveloper 不受角色对 /developer/* 的排除影响", async () => {
    const role = await store.saveRole({
      id: "r-super-exclude",
      code: "super-exclude",
      name: "超级管理员",
      routeAllows: ["/*"],
      routeExcludes: ["/developer/*", "/api/developer/*"],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-super-dev", isDeveloper: true, roleIds: [role.id] };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    const access = await service.getAccess(user);
    expect(access.isDeveloper).toBe(true);
    expect(access.routeAllows.includes("/*")).toBe(true);
    expect(access.routeExcludes).toEqual([]);
    expect(service.can(access, "/developer/menus")).toBe(true);
    expect((await service.checkRoute("/developer/menus", user)).ok).toBe(true);
    const menus = await service.menusFor(user, [
      { key: "developer", title: "开发管理", path: "/developer/menus" },
      { key: "rbac-roles", title: "角色列表", path: "/rbac/roles" },
    ]);
    expect(menus.some((item) => item.path === "/developer/menus")).toBe(true);
  });

  it("管理员页面权限可调用宿主 /api/admin", async () => {
    const role = await store.saveRole({
      id: "r-admin-page",
      code: "admin-page",
      name: "管理员页",
      routeAllows: ["/rbac/admin"],
      routeExcludes: [],
      childRoleIds: [],
      childPermissionIds: [],
    });
    const user = { id: "u-admin-page" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [role.id],
      permissionIds: [],
    });
    expect((await service.checkRoute("/api/admin", user)).ok).toBe(true);
    expect((await service.checkRoute("/api/admin/update", user)).ok).toBe(
      true,
    );
    expect((await service.checkRoute("/api/rbac/roles", user)).ok).toBe(
      false,
    );
  });

  it("插件不接管宿主 /api/admin 路径，已授权请求放行给宿主处理", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    const res = await plugin.onRequest?.(
      ctx("/api/admin/update", "POST", {
        id: "u-admin",
        name: "开发者",
      }),
      container,
    );
    expect(res).toBeUndefined();
  });

  it("插件拦截未登录和未授权的宿主 API，登录会话路径放行", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => null,
      sessionAllowActions: ["/lock"],
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);

    const unauth = await plugin.onRequest?.(
      ctx("/api/cgm/devices"),
      container,
    );
    expect(unauth).toBeInstanceOf(Response);
    expect(unauth!.status).toBe(401);
    expect(unauth!.headers.get("content-type") ?? "").toContain("json");
    expect((await unauth!.json()).ok).toBe(false);
    expect(await plugin.onRequest?.(ctx("/forbidden"), container))
      .toBeUndefined();

    const user = { id: "u-plain" };
    await store.saveAssignment({
      userId: user.id,
      roleIds: [],
      permissionIds: [],
    });
    const gated = rbacPlugin({
      store,
      getUser: () => user,
      sessionAllowActions: ["/lock"],
    });
    const next = new ServiceContainer();
    await gated.onInit?.(next);
    const denied = await gated.onRequest?.(ctx("/api/cgm/devices"), next);
    expect(denied!.status).toBe(403);
    expect((await denied!.json()).error).toBe("forbidden");
    expect(await gated.onRequest?.(ctx("/lock"), next)).toBeUndefined();
  });

  it("onRoute 自动挂载四个管理页，并保留 API 占位路由", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
    });
    const routes = await plugin.onRoute?.([], new ServiceContainer()) ?? [];
    const paths = routes.map((route) => route.path);
    expect(paths).toContain("/api/rbac/*");
    expect(paths).toContain("/rbac/roles");
    expect(paths).toContain("/rbac/permissions");
    expect(paths).toContain("/rbac/assign");
    expect(paths).toContain("/rbac/routes");
    for (const slug of ["roles", "permissions", "assign", "routes"]) {
      const page = routes.find((route) => route.path === `/rbac/${slug}`);
      expect(page?.meta?.type).toBe("page");
      expect(page?.meta?.component).toBe(`rbac/${slug}`);
      expect(String(page?.meta?.fullPath ?? "")).toContain(
        `/pages/${slug}.tsx`,
      );
    }
  });

  it("onRoute 在宿主已有同路径页面时不重复挂载", async () => {
    const plugin = rbacPlugin({
      store,
      getUser: () => admin,
    });
    const routes = await plugin.onRoute?.([
      {
        path: "/rbac/roles",
        method: "GET",
        handler: () => new Response(null),
        meta: { file: "rbac/roles/index.tsx" },
      },
    ], new ServiceContainer()) ?? [];
    const rolePages = routes.filter((route) => route.path === "/rbac/roles");
    expect(rolePages).toHaveLength(1);
    expect(rolePages[0]?.meta?.file).toBe("rbac/roles/index.tsx");
    expect(routes.some((route) => route.path === "/rbac/permissions")).toBe(
      true,
    );
  });
});
