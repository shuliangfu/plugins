/**
 * RBAC menu store, seed, CRUD API, and auto-mounted page route.
 */
import { ServiceContainer } from "@dreamer/service";
import type { RequestContext } from "@dreamer/plugin";
import { describe, expect, it } from "@dreamer/test";
import {
  MemoryRbacStore,
  parseMenuListQuery,
  pickLocalized,
  type RbacAccess,
  rbacPlugin,
  RbacService,
  type SeedMenu,
} from "../src/rbac/mod.ts";
import { MemoryMenuStore } from "../src/rbac/menus/store.ts";

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

const seed: SeedMenu[] = [
  {
    key: "users",
    parentKey: "",
    title: { "zh-CN": "用户", "en-US": "Users" },
    path: "",
    icon: "users",
    sort: 10,
    status: "active",
  },
  {
    key: "users.all",
    parentKey: "users",
    title: { "zh-CN": "用户列表", "en-US": "User list" },
    path: "/users",
    permission: "route:/users",
    icon: "star",
    sort: 10,
    status: "active",
  },
  {
    key: "developer",
    parentKey: "",
    title: { "zh-CN": "开发管理", "en-US": "Development" },
    path: "",
    icon: "database",
    sort: 90,
    status: "active",
  },
  {
    key: "developer.menus",
    parentKey: "developer",
    title: { "zh-CN": "菜单管理", "en-US": "Menus" },
    path: "/developer/menus",
    permission: "route:/developer/menus",
    icon: "star",
    sort: 10,
    status: "active",
  },
];

describe("RBAC menus", () => {
  it("pickLocalized and parseMenuListQuery stay stable", () => {
    expect(pickLocalized({ "zh-CN": "用户", "en-US": "Users" }, "en-US", "x"))
      .toBe("Users");
    const q = parseMenuListQuery(new URLSearchParams("parentKey=users"));
    expect(q.filters.parentKey).toBe("users");
    expect(q.pageSize).toBe(20);
  });

  it("seeds missing rows and does not overwrite titles", async () => {
    const menus = new MemoryMenuStore();
    const service = new RbacService(new MemoryRbacStore(), {
      getUser: () => ({ id: "u-dev", isDeveloper: true }),
      menus: { seed, structureSyncKeys: ["users.all"] },
    }, menus);
    expect(await service.menu.seed()).toEqual({ created: 4, updated: 0 });
    await menus.updateMenuByKey("users.all", {
      title: { "zh-CN": "自定义", "en-US": "Custom" },
      path: "/old-users",
    });
    expect(await service.menu.seed()).toEqual({ created: 0, updated: 1 });
    const row = await menus.getMenuByKey("users.all");
    expect(row?.title["zh-CN"]).toBe("自定义");
    expect(row?.path).toBe("/users");
  });

  it("loadMenusForAccess uses a host prepare hook and hides developer menus", async () => {
    const service = new RbacService(new MemoryRbacStore(), {
      getUser: () => ({ id: "u" }),
      menus: { seed },
    }, new MemoryMenuStore());
    await service.menu.seed();
    const access: RbacAccess = {
      userId: "u",
      roleIds: [],
      routeAllows: ["/*"],
      routeExcludes: ["/developer/*"],
      isDeveloper: false,
    };
    const hidden = await service.loadMenusForAccess(
      access,
      "zh-CN",
      (item) => ({
        key: item.key,
        title: item.title["zh-CN"] ?? item.key,
        path: item.path || undefined,
        parentKey: item.parentKey || undefined,
        icon: item.icon,
        sort: item.sort,
        status: item.status,
      }),
    );
    expect(hidden.some((item) => item.key === "developer")).toBe(false);
    expect(hidden.some((item) => item.key === "users")).toBe(true);

    const shown = await service.loadMenusForAccess({
      ...access,
      isDeveloper: true,
    }, "en-US");
    expect(shown.some((item) => item.key === "developer")).toBe(true);
    const users = shown.find((item) => item.key === "users");
    expect(users?.title).toBe("Users");
  });

  it("CRUD API is developer-only and serves list/create/update/remove", async () => {
    const plugin = rbacPlugin({
      store: new MemoryRbacStore(),
      menuStore: new MemoryMenuStore(),
      getUser: () => ({ id: "u-dev", isDeveloper: true }),
      menus: { seed },
      hooks: { isDeveloper: (user) => user.isDeveloper === true },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    // isDeveloper comes from getUser().isDeveloper via getAccess
    const service = (await import("../src/rbac/mod.ts")).getRbacService(
      container,
    );
    await service.menu.seed();

    const list = await plugin.onRequest?.(
      ctx("/api/rbac/menus?pageSize=50"),
      container,
    );
    expect(list).toBeInstanceOf(Response);
    const listed = await list!.json() as { rows: Array<{ key: string }> };
    expect(listed.rows.some((row) => row.key === "users")).toBe(true);

    const created = await plugin.onRequest?.(
      ctx("/api/rbac/menus/create", "POST", {
        key: "users.wearing",
        parentKey: "users",
        titleZh: "佩戴中",
        titleEn: "Wearing",
        path: "/users/wearing",
        sort: 20,
      }),
      container,
    );
    expect(created!.status).toBe(201);

    const updated = await plugin.onRequest?.(
      ctx("/api/rbac/menus/update", "POST", {
        key: "users.wearing",
        titleZh: "佩戴用户",
      }),
      container,
    );
    expect((await updated!.json()).ok).toBe(true);

    const removed = await plugin.onRequest?.(
      ctx("/api/rbac/menus/remove", "POST", { ids: ["users.wearing"] }),
      container,
    );
    expect((await removed!.json()).removed).toBe(1);

    const guest = rbacPlugin({
      store: new MemoryRbacStore(),
      getUser: () => ({ id: "u-plain" }),
    });
    const next = new ServiceContainer();
    await guest.onInit?.(next);
    const denied = await guest.onRequest?.(ctx("/api/rbac/menus"), next);
    expect(denied!.status).toBe(403);
  });

  it("onRoute mounts the menus page at /developer/menus", async () => {
    const plugin = rbacPlugin({
      store: new MemoryRbacStore(),
      getUser: () => ({ id: "u-dev", isDeveloper: true }),
    });
    const routes = await plugin.onRoute?.([], new ServiceContainer()) ?? [];
    const page = routes.find((route) => route.path === "/developer/menus");
    expect(page?.meta?.type).toBe("page");
    expect(page?.meta?.component).toBe("developer/menus");
    expect(String(page?.meta?.fullPath ?? "")).toContain(
      "/pages/menus.tsx",
    );
  });
});
