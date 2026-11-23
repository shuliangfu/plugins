/**
 * RBAC runtime: expand the role tree, checkRoute, seed, menus, cache.
 */
import {
  allowRouteByPatterns,
  matchAnyRoutePattern,
  normalizePath,
  normalizeRoutePattern,
  normalizeScannedRoutes,
  parseRoutePatterns,
} from "./route-pattern.ts";
import {
  resolveMenusPagePath,
  resolveRbacGetUser,
} from "../resolve-options.ts";
import type { RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import type { MenuStore } from "../menus/types.ts";
import { MenuManager } from "../menus/service.ts";
import { MemoryMenuStore } from "../menus/store.ts";
import type {
  CheckDecision,
  MenuItem,
  Permission,
  RbacAccess,
  RbacAccessView,
  RbacApiMode,
  RbacPluginOptions,
  RbacStore,
  RbacUser,
  Role,
} from "../types.ts";

const CACHE_TTL_MS = 60_000;

export class RbacFieldError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "RbacFieldError";
    this.field = field;
  }
}

function sameName(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

/** Turn a flat parentKey list into a tree. Already-nested menus are returned as-is. */
export function nestMenus(menus: MenuItem[]): MenuItem[] {
  if (!menus.some((item) => item.parentKey)) return menus;
  const children = new Map<string, MenuItem[]>();
  const tops: MenuItem[] = [];
  for (const item of menus) {
    const parent = item.parentKey ?? "";
    if (!parent) {
      tops.push(item);
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(item);
    children.set(parent, list);
  }
  const bySort = (a: MenuItem, b: MenuItem) => {
    if (a.sort == null && b.sort == null) return 0;
    return (a.sort ?? 0) - (b.sort ?? 0);
  };
  const attach = (item: MenuItem): MenuItem => {
    const nested = (children.get(item.key ?? "") ?? item.children ?? [])
      .slice()
      .sort(bySort)
      .map(attach);
    return nested.length ? { ...item, children: nested } : { ...item };
  };
  return tops.slice().sort(bySort).map(attach);
}

export class RbacService {
  readonly store: RbacStore;
  readonly basePath: string;
  readonly apiBasePath: string;
  readonly loginPath: string;
  readonly forbiddenPath: string;
  readonly allowActions: string[];
  readonly sessionAllowActions: string[];
  readonly developerPrefix: string[];
  readonly options: RbacPluginOptions;
  readonly menu: MenuManager;
  apiMode: RbacApiMode;
  /** App service container, set during plugin boot. */
  container?: ServiceContainer;
  #cache = new Map<string, { at: number; access: RbacAccess }>();

  constructor(
    store: RbacStore,
    options: RbacPluginOptions,
    menuStore: MenuStore = new MemoryMenuStore(),
  ) {
    this.store = store;
    this.options = options;
    this.basePath = normalizePath(options.basePath ?? "/rbac");
    this.apiBasePath = normalizePath(options.apiBasePath ?? "/api/rbac");
    this.loginPath = options.loginPath ?? "/login";
    this.forbiddenPath = options.forbiddenPath ?? "/forbidden";
    this.allowActions = parseRoutePatterns([
      this.loginPath,
      this.forbiddenPath,
      "/assets/*",
      "/favicon.ico",
      ...(options.allowActions ?? []),
    ]);
    this.sessionAllowActions = parseRoutePatterns(
      options.sessionAllowActions ?? [],
    );
    this.developerPrefix = parseRoutePatterns([
      ...(options.developerPrefix ?? ["/developer/*", "/api/developer/*"]),
      ...(options.menus?.requireDeveloper === false
        ? []
        : [resolveMenusPagePath(options)]),
    ]);
    this.apiMode = options.apiMode === "restful" ? "restful" : "action";
    this.menu = new MenuManager(menuStore, {
      seed: options.menus?.seed,
      structureSyncKeys: options.menus?.structureSyncKeys,
      retiredKeys: options.menus?.retiredKeys,
      pagePath: resolveMenusPagePath(options),
      requireDeveloper: options.menus?.requireDeveloper,
      getLocale: options.hooks?.getLocale,
      prepareMenuItem: options.hooks?.prepareMenuItem,
    }, this);
  }

  getUser(ctx: RequestContext): Promise<RbacUser | null> {
    return Promise.resolve(resolveRbacGetUser(this.options)(ctx));
  }

  /** Stored menus, prepared by the host hook, then filtered by access. */
  loadMenusForAccess(
    access: RbacAccess,
    locale?: string,
    prepare?: Parameters<MenuManager["loadForAccess"]>[2],
  ): Promise<MenuItem[]> {
    return this.menu.loadForAccess(access, locale, prepare);
  }

  invalidate(userId?: string): void {
    if (userId) this.#cache.delete(userId);
    else this.#cache.clear();
  }

  newId(): string {
    return crypto.randomUUID();
  }

  async seed(): Promise<void> {
    const superCode = this.options.seed?.superRole ?? "super-admin";
    const superName = this.options.seed?.superRoleName ?? "超级管理员";
    const grant = normalizeRoutePattern(this.options.seed?.grant ?? "/*") ??
      "/*";
    let role = await this.store.getRoleByCode(superCode);
    if (!role) {
      role = await this.store.saveRole({
        id: this.newId(),
        code: superCode,
        name: superName,
        isSystem: true,
        isSuperAdmin: true,
        routeAllows: [grant],
        routeExcludes: [],
        childRoleIds: [],
        childPermissionIds: [],
      });
    } else if (!role.routeAllows.includes(grant)) {
      role = await this.store.saveRole({
        ...role,
        isSuperAdmin: true,
        isSystem: true,
        routeAllows: [...role.routeAllows, grant],
      });
    }

    const assignUserId = this.options.seed?.assignUserId;
    if (assignUserId && role) {
      const assignment = await this.store.getAssignment(assignUserId);
      if (!assignment.roleIds.includes(role.id)) {
        await this.store.saveAssignment({
          ...assignment,
          roleIds: [...assignment.roleIds, role.id],
        });
      }
    }
  }

  /** Save registered router paths into the managed route table. */
  async syncScannedRoutes(
    input: unknown,
    opts?: { saveRoutes?: boolean },
  ): Promise<void> {
    if (!opts?.saveRoutes) return;
    const rows = normalizeScannedRoutes(input);
    const known = new Set(
      (await this.store.listRoutes()).map((row) => row.path),
    );
    for (const row of rows) {
      if (known.has(row.path)) continue;
      await this.store.saveRoute({ path: row.path, source: "scan" });
      known.add(row.path);
    }
  }

  async getAccess(user: RbacUser): Promise<RbacAccess> {
    const hit = this.#cache.get(user.id);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.access;
    const access = await this.#buildAccess(user);
    this.#cache.set(user.id, { at: Date.now(), access });
    return access;
  }

  async checkRoute(
    path: string,
    user: RbacUser | null,
  ): Promise<CheckDecision> {
    const pathname = normalizePath(path);
    if (matchAnyRoutePattern(pathname, this.allowActions)) return { ok: true };
    if (!user) return { ok: false, status: 401 };
    if (matchAnyRoutePattern(pathname, this.sessionAllowActions)) {
      return { ok: true };
    }
    if (matchAnyRoutePattern(pathname, this.developerPrefix)) {
      return this.#isDeveloper(user)
        ? { ok: true }
        : { ok: false, status: 403, reason: "developer" };
    }
    if (this.isSelfAccessPath(pathname)) return { ok: true };
    const access = await this.getAccess(user);
    const byPattern = allowRouteByPatterns(
      pathname,
      access.routeAllows,
      access.routeExcludes,
    );
    if (byPattern === "deny") return { ok: false, status: 403 };
    if (byPattern === "allow") return { ok: true };
    for (const page of this.#apiPagePaths(pathname)) {
      if (this.can(access, page)) return { ok: true };
    }
    return { ok: false, status: 403 };
  }

  pagePathForApi(path: string): string | null {
    const pathname = normalizePath(path);
    if (this.isSelfAccessPath(pathname)) return null;
    if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
      return `${this.basePath}/admin`;
    }
    if (
      pathname !== this.apiBasePath &&
      !pathname.startsWith(`${this.apiBasePath}/`)
    ) {
      return null;
    }
    const section = pathname.slice(this.apiBasePath.length).split("/").filter(
      Boolean,
    )[0];
    if (
      section !== "roles" && section !== "permissions" &&
      section !== "assign" && section !== "routes"
    ) {
      return null;
    }
    return `${this.basePath}/${section}`;
  }

  /** Page paths that can authorize an API request (plugin section or host /api/*). */
  #apiPagePaths(path: string): string[] {
    const pathname = normalizePath(path);
    const out: string[] = [];
    const add = (item: string | null) => {
      if (item && !out.includes(item)) out.push(item);
    };
    add(this.pagePathForApi(pathname));
    if (!pathname.startsWith("/api/")) return out;
    let rest = pathname.slice("/api".length) || "/";
    if (!rest.startsWith("/")) rest = `/${rest}`;
    while (rest !== "/") {
      add(rest);
      const i = rest.lastIndexOf("/");
      rest = i <= 0 ? "/" : rest.slice(0, i);
    }
    return out;
  }

  can(access: RbacAccess, path: string): boolean {
    const pathname = normalizePath(path);
    if (
      access.isDeveloper &&
      matchAnyRoutePattern(pathname, this.developerPrefix)
    ) {
      return true;
    }
    if (allowRouteByPatterns(pathname, access.routeExcludes, []) === "allow") {
      return false;
    }
    if (allowRouteByPatterns(pathname, access.routeAllows, []) === "allow") {
      return true;
    }
    return false;
  }

  filterMenus(access: RbacAccess, menus: MenuItem[]): MenuItem[] {
    return this.#filterMenuTree(access, nestMenus(menus));
  }

  #filterMenuTree(access: RbacAccess, menus: MenuItem[]): MenuItem[] {
    const out: MenuItem[] = [];
    for (const item of menus) {
      if (item.show === false) continue;
      if (item.status && item.status !== "active") continue;
      if (
        !access.isDeveloper && item.path &&
        matchAnyRoutePattern(normalizePath(item.path), this.developerPrefix)
      ) {
        continue;
      }
      const children = item.children
        ? this.#filterMenuTree(access, item.children)
        : [];
      const selfPath = item.path || null;
      const selfOk = selfPath
        ? this.can(access, selfPath)
        : children.length > 0;
      if (selfOk || children.length > 0) {
        out.push({ ...item, children: children.length ? children : undefined });
      }
    }
    return out;
  }

  isSelfAccessPath(path: string): boolean {
    const pathname = normalizePath(path);
    return (
      pathname === `${this.apiBasePath}/access` ||
      pathname === `${this.apiBasePath}/me`
    );
  }

  viewAccess(access: RbacAccess): RbacAccessView {
    return {
      userId: access.userId,
      roleIds: access.roleIds,
      routeAllows: access.routeAllows,
      routeExcludes: access.routeExcludes,
      isDeveloper: access.isDeveloper,
    };
  }

  async menusFor(
    user: RbacUser,
    menus: MenuItem[] = this.defaultMenus(),
  ): Promise<MenuItem[]> {
    return this.filterMenus(await this.getAccess(user), menus);
  }

  defaultMenus(): MenuItem[] {
    const base = this.basePath;
    return [{
      key: "rbac",
      title: "管理员",
      children: [
        { key: "rbac-assign", title: "权限分配", path: `${base}/assign` },
        { key: "rbac-roles", title: "角色列表", path: `${base}/roles` },
        {
          key: "rbac-permissions",
          title: "权限列表",
          path: `${base}/permissions`,
        },
        { key: "rbac-routes", title: "路由列表", path: `${base}/routes` },
      ],
    }];
  }

  isSuperRole(role: Role): boolean {
    return !!role.isSuperAdmin || this.hasGrantAll(role);
  }

  hasGrantAll(role: Role): boolean {
    return role.routeAllows.includes("/*");
  }

  async countGrantAllRoles(): Promise<number> {
    const roles = await this.store.listRoles();
    return roles.filter((role) => this.hasGrantAll(role)).length;
  }

  countSuperRoles(): Promise<number> {
    return this.countGrantAllRoles();
  }

  async setRoleChildren(
    roleId: string,
    child: {
      roleIds?: string[];
      permissionIds?: string[];
      routes?: string[];
      roleExcludes?: string[];
      permissionExcludes?: string[];
      routeExcludes?: string[];
    },
  ): Promise<Role> {
    const role = await this.store.getRole(roleId);
    if (!role) throw new Error("role not found");
    const roleIds = unique(child.roleIds ?? role.childRoleIds);
    if (roleIds.includes(roleId) || await this.#roleCycle(roleId, roleIds)) {
      throw new Error("role children would create a cycle");
    }
    const permissionIds = unique(
      child.permissionIds ?? role.childPermissionIds,
    );
    const routes = parseRoutePatterns(child.routes ?? role.routeAllows);
    if (
      this.hasGrantAll(role) && !routes.includes("/*") &&
      (await this.countGrantAllRoles()) <= 1
    ) {
      throw new Error("cannot remove /* from the last super-admin role");
    }
    const saved = await this.store.saveRole({
      ...role,
      childRoleIds: roleIds,
      childPermissionIds: permissionIds,
      routeAllows: routes,
      roleExcludes: unique(child.roleExcludes ?? role.roleExcludes ?? []),
      permissionExcludes: unique(
        child.permissionExcludes ?? role.permissionExcludes ?? [],
      ),
      routeExcludes: parseRoutePatterns(
        child.routeExcludes ?? role.routeExcludes,
      ),
    });
    this.invalidate();
    return saved;
  }

  async setPermissionChildren(
    permissionId: string,
    child: {
      permissionIds?: string[];
      routes?: string[];
      permissionExcludes?: string[];
      routeExcludes?: string[];
    },
  ): Promise<Permission> {
    const item = await this.store.getPermission(permissionId);
    if (!item) throw new Error("permission not found");
    const permissionIds = unique(
      child.permissionIds ?? item.childPermissionIds,
    );
    if (
      permissionIds.includes(permissionId) ||
      await this.#permissionCycle(permissionId, permissionIds)
    ) {
      throw new Error("permission children would create a cycle");
    }
    const saved = await this.store.savePermission({
      ...item,
      childPermissionIds: permissionIds,
      routeAllows: parseRoutePatterns(child.routes ?? item.routeAllows),
      permissionExcludes: unique(
        child.permissionExcludes ?? item.permissionExcludes ?? [],
      ),
      routeExcludes: parseRoutePatterns(
        child.routeExcludes ?? item.routeExcludes,
      ),
    });
    this.invalidate();
    return saved;
  }

  async saveRole(role: Role): Promise<Role> {
    const code = role.code.trim();
    const name = role.name.trim();
    if (!code) throw new RbacFieldError("code", "请填写标识");
    if (!name) throw new RbacFieldError("name", "请填写名称");
    role = { ...role, code, name };
    const byCode = await this.store.getRoleByCode(code);
    if (byCode && byCode.id !== role.id) {
      throw new RbacFieldError("code", "标识已存在");
    }
    const byName = (await this.store.listRoles()).find((item) =>
      sameName(item.name, name) && item.id !== role.id
    );
    if (byName) throw new RbacFieldError("name", "名称已存在");
    const current = await this.store.getRole(role.id);
    if (
      current && this.hasGrantAll(current) && !this.hasGrantAll(role) &&
      (await this.countGrantAllRoles()) <= 1
    ) {
      throw new Error("cannot remove /* from the last super-admin role");
    }
    const saved = await this.store.saveRole(role);
    this.invalidate();
    return saved;
  }

  async savePermission(permission: Permission): Promise<Permission> {
    const name = permission.name.trim();
    if (!name) throw new RbacFieldError("name", "请填写名称");
    permission = { ...permission, name };
    const byName = (await this.store.listPermissions()).find((item) =>
      sameName(item.name, name) && item.id !== permission.id
    );
    if (byName) throw new RbacFieldError("name", "名称已存在");
    const saved = await this.store.savePermission(permission);
    this.invalidate();
    return saved;
  }

  async removeRole(id: string): Promise<void> {
    const role = await this.store.getRole(id);
    if (!role) return;
    for (const item of await this.store.listRoles()) {
      if (!item.childRoleIds.includes(id)) continue;
      await this.store.saveRole({
        ...item,
        childRoleIds: item.childRoleIds.filter((roleId) => roleId !== id),
      });
    }
    for (const assignment of await this.store.listAssignments()) {
      if (!assignment.roleIds.includes(id)) continue;
      await this.store.saveAssignment({
        ...assignment,
        roleIds: assignment.roleIds.filter((roleId) => roleId !== id),
      });
    }
    await this.store.removeRole(id);
    this.invalidate();
  }

  async removePermission(id: string): Promise<void> {
    const item = await this.store.getPermission(id);
    if (!item) return;
    for (const role of await this.store.listRoles()) {
      if (!role.childPermissionIds.includes(id)) continue;
      await this.store.saveRole({
        ...role,
        childPermissionIds: role.childPermissionIds.filter(
          (permissionId) => permissionId !== id,
        ),
      });
    }
    for (const permission of await this.store.listPermissions()) {
      if (!permission.childPermissionIds.includes(id)) continue;
      await this.store.savePermission({
        ...permission,
        childPermissionIds: permission.childPermissionIds.filter(
          (permissionId) => permissionId !== id,
        ),
      });
    }
    for (const assignment of await this.store.listAssignments()) {
      if (!assignment.permissionIds.includes(id)) continue;
      await this.store.saveAssignment({
        ...assignment,
        permissionIds: assignment.permissionIds.filter(
          (permissionId) => permissionId !== id,
        ),
      });
    }
    await this.store.removePermission(id);
    this.invalidate();
  }

  #isDeveloper(user: RbacUser): boolean {
    if (this.options.hooks?.isDeveloper) {
      return this.options.hooks.isDeveloper(user);
    }
    return user.isDeveloper === true;
  }

  async #buildAccess(user: RbacUser): Promise<RbacAccess> {
    const assignment = await this.store.getAssignment(user.id);
    const roleExclude = new Set([
      ...(user.roleExcludes ?? []),
      ...(assignment.roleExcludes ?? []),
    ]);
    const permExclude = new Set([
      ...(user.permissionExcludes ?? []),
      ...(assignment.permissionExcludes ?? []),
    ]);
    const roleIds = unique([
      ...assignment.roleIds,
      ...(user.roleIds ?? []),
    ]).filter((id) => !roleExclude.has(id));
    const permissionIds = unique([
      ...assignment.permissionIds,
      ...(user.permissionIds ?? []),
    ]).filter((id) => !permExclude.has(id));
    const allRoles = await this.store.listRoles();
    const allPermissions = await this.store.listPermissions();
    const roleMap = new Map(allRoles.map((role) => [role.id, role]));
    const permMap = new Map(
      allPermissions.map((item) => [item.id, item]),
    );
    const expandedRoles = new Set<string>();
    const queue = [...roleIds];
    while (queue.length) {
      const id = queue.pop()!;
      if (expandedRoles.has(id)) continue;
      expandedRoles.add(id);
      const role = roleMap.get(id);
      if (!role) continue;
      for (const ex of role.roleExcludes ?? []) roleExclude.add(ex);
      for (const child of role.childRoleIds) {
        if (!expandedRoles.has(child) && !roleExclude.has(child)) {
          queue.push(child);
        }
      }
    }
    for (const id of roleExclude) expandedRoles.delete(id);
    const expandedPerms = new Set<string>(permissionIds);
    for (const id of expandedRoles) {
      const role = roleMap.get(id);
      if (!role) continue;
      for (const ex of role.permissionExcludes ?? []) permExclude.add(ex);
      for (const pid of role.childPermissionIds) {
        if (!permExclude.has(pid)) expandedPerms.add(pid);
      }
    }
    const permQueue = [...expandedPerms];
    while (permQueue.length) {
      const id = permQueue.pop()!;
      const item = permMap.get(id);
      if (!item) continue;
      for (const ex of item.permissionExcludes ?? []) permExclude.add(ex);
      for (const child of item.childPermissionIds) {
        if (!expandedPerms.has(child) && !permExclude.has(child)) {
          expandedPerms.add(child);
          permQueue.push(child);
        }
      }
    }
    for (const id of permExclude) expandedPerms.delete(id);
    const routeAllows: string[] = [];
    const routeExcludes: string[] = [];
    const seenAllow = new Set<string>();
    const seenDeny = new Set<string>();
    const addAllows = (list: string[]) => {
      for (const pat of parseRoutePatterns(list)) {
        if (seenAllow.has(pat)) continue;
        seenAllow.add(pat);
        routeAllows.push(pat);
      }
    };
    const addExcludes = (list: string[]) => {
      for (const pat of parseRoutePatterns(list)) {
        if (seenDeny.has(pat)) continue;
        seenDeny.add(pat);
        routeExcludes.push(pat);
      }
    };
    for (const id of expandedRoles) {
      const role = roleMap.get(id);
      if (!role) continue;
      addAllows(role.routeAllows);
      addExcludes(role.routeExcludes);
    }
    for (const id of expandedPerms) {
      const item = permMap.get(id);
      if (!item) continue;
      addAllows(item.routeAllows);
      addExcludes(item.routeExcludes);
    }
    addAllows(assignment.routeAllows ?? []);
    addAllows(user.routeAllows ?? []);
    addExcludes(assignment.routeExcludes ?? []);
    addExcludes(user.routeExcludes ?? []);
    const isDeveloper = this.#isDeveloper(user);
    return {
      userId: user.id,
      roleIds: [...expandedRoles],
      routeAllows,
      routeExcludes,
      isDeveloper,
    };
  }

  async #roleCycle(parentId: string, childIds: string[]): Promise<boolean> {
    const all = await this.store.listRoles();
    const map = new Map(all.map((role) => [role.id, role.childRoleIds]));
    const seen = new Set<string>();
    const stack = [...childIds];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === parentId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const child of map.get(id) ?? []) stack.push(child);
    }
    return false;
  }

  async #permissionCycle(
    parentId: string,
    childIds: string[],
  ): Promise<boolean> {
    const all = await this.store.listPermissions();
    const map = new Map(all.map((item) => [item.id, item.childPermissionIds]));
    const seen = new Set<string>();
    const stack = [...childIds];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === parentId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const child of map.get(id) ?? []) stack.push(child);
    }
    return false;
  }
}

export { canManageFromAccess } from "./route-pattern.ts";

function unique(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
