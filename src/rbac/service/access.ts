/**
 * Host-facing RBAC helpers: load a user from the store, access payloads,
 * assignment sync, and super-admin guards. Host account lookup goes through
 * `hooks.loadAccount`. The plugin reads the app container the same way as
 * boot (config / router / database).
 */
import { getDatabaseAsync } from "@dreamer/database";
import type { RequestContext } from "@dreamer/plugin";
import { pathFromLegacyPermissionCode } from "../models/mod.ts";
import type { ServiceContainer } from "@dreamer/service";
import { getRbacService, getRbacServiceOrNull } from "./runtime.ts";
export { getRbacService, RBAC_SERVICE } from "./runtime.ts";
export type { MenuItem, RbacAccess, RbacUser } from "../types.ts";
import { allowRouteByPatterns, parseRoutePatterns } from "./route-pattern.ts";
import type { Permission, RbacAccess, RbacUser, Role } from "../types.ts";

export type EffectivePermissions = "*" | Set<string>;

export interface AdminAccess {
  effective: EffectivePermissions;
  isDeveloper: boolean;
  routeAllows: string[];
  routeExcludes: string[];
  permissionExcludes: string[];
}

export type RequireUserResult<T> =
  | { ok: true; user: T }
  | { ok: false; status: 401; error: string };

export function requestContextFrom(request: Request): RequestContext {
  const url = new URL(request.url);
  return {
    request,
    path: url.pathname,
    method: request.method,
    url,
    headers: request.headers,
  };
}

/** Login check via `hooks.getUser`. Route checks stay in the plugin hook. */
export async function requireUser<T = RbacUser>(
  container: ServiceContainer,
  request: Request,
): Promise<RequireUserResult<T>> {
  const service = getRbacServiceOrNull(container);
  if (!service) return { ok: false, status: 401, error: "unauthorized" };
  const user = await service.getUser(requestContextFrom(request));
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  return { ok: true, user: user as T };
}

export async function loadRbacUser(
  container: ServiceContainer,
  userId: string,
): Promise<RbacUser | null> {
  const service = getRbacServiceOrNull(container);
  if (!service || !userId) return null;
  const account = service.options.hooks?.loadAccount
    ? await service.options.hooks.loadAccount(userId)
    : { id: userId };
  if (!account || account.disabled) return null;
  const assignment = await service.store.getAssignment(account.id);
  return {
    id: account.id,
    roleIds: assignment.roleIds,
    permissionIds: assignment.permissionIds,
    routeAllows: parseRoutePatterns(assignment.routeAllows),
    routeExcludes: parseRoutePatterns(assignment.routeExcludes),
    roleExcludes: assignment.roleExcludes ?? [],
    permissionExcludes: assignment.permissionExcludes ?? [],
    isDeveloper: account.isDeveloper,
  };
}

export function invalidatePermissionCache(
  container: ServiceContainer,
  userId?: string,
): void {
  getRbacServiceOrNull(container)?.invalidate(userId);
}

export async function getAdminAccess(
  container: ServiceContainer,
  userId: string,
): Promise<AdminAccess> {
  const empty: AdminAccess = {
    effective: new Set(),
    isDeveloper: false,
    routeAllows: [],
    routeExcludes: [],
    permissionExcludes: [],
  };
  try {
    const service = getRbacService(container);
    const user = await loadRbacUser(container, userId);
    if (!user) return empty;
    return toAdminAccess(await service.getAccess(user));
  } catch {
    return empty;
  }
}

export function toAdminAccess(access: RbacAccess): AdminAccess {
  const grantAll = allowRouteByPatterns(
    "/_",
    access.routeAllows,
    access.routeExcludes,
  ) === "allow";
  return {
    effective: grantAll ? "*" : new Set(access.routeAllows),
    isDeveloper: access.isDeveloper,
    routeAllows: access.routeAllows,
    routeExcludes: access.routeExcludes,
    permissionExcludes: [],
  };
}

export async function getEffectivePermissions(
  container: ServiceContainer,
  userId: string,
): Promise<EffectivePermissions> {
  return (await getAdminAccess(container, userId)).effective;
}

export async function getPermissionsPayload(
  container: ServiceContainer,
  userId: string,
): Promise<"*" | string[]> {
  const effective = await getEffectivePermissions(container, userId);
  return effective === "*" ? "*" : [...effective];
}

export async function boundRolesForAdmin(
  container: ServiceContainer,
  userId: string,
): Promise<Awaited<ReturnType<typeof loadRolesForAdmin>>> {
  let ids: string[] = [];
  try {
    const assignment = await getRbacService(container).store.getAssignment(
      String(userId),
    );
    ids = unique(assignment.roleIds);
  } catch {
    // Plugin may not be ready during isolated tests.
  }
  return await loadRolesForAdmin(container, ids);
}

export async function loadRolesForAdmin(
  container: ServiceContainer,
  roleIds: string[] | undefined,
  fallbackRole?: string,
): Promise<{
  roleIds: string[];
  roles: { id: string; code: string; name: string }[];
}> {
  const service = getRbacService(container);
  let ids = roleIds?.filter(Boolean) ?? [];
  if (ids.length === 0 && fallbackRole) {
    const role = await service.store.getRoleByCode(fallbackRole);
    if (role) ids = [role.id];
  }
  const roles: Array<{ id: string; code: string; name: string }> = [];
  for (const id of ids) {
    const role = await service.store.getRole(id);
    if (!role) continue;
    roles.push({ id: role.id, code: role.code, name: role.name });
  }
  return { roleIds: ids, roles };
}

export async function resolveRoleIdsFromInput(
  container: ServiceContainer,
  input: {
    roleIds?: string[];
    role?: string;
  },
): Promise<{ roleIds: string[] }> {
  const service = getRbacService(container);
  let roleIds = (input.roleIds ?? []).map(String).filter(Boolean);
  if (roleIds.length === 0 && input.role) {
    const role = await service.store.getRoleByCode(input.role);
    if (!role) throw new Error(`未知角色: ${input.role}`);
    roleIds = [role.id];
  }
  if (roleIds.length === 0) throw new Error("至少绑定一个角色");
  for (const id of roleIds) {
    const role = await service.store.getRole(id);
    if (!role) throw new Error(`包含无效角色 id: ${id}`);
  }
  return { roleIds };
}

export async function syncAssignment(
  container: ServiceContainer,
  userId: string,
  roleIds: string[],
  permissionIds: string[] = [],
): Promise<void> {
  const service = getRbacService(container);
  await service.store.saveAssignment({ userId, roleIds, permissionIds });
  service.invalidate(userId);
}

export async function countSuperAdminHolders(
  container: ServiceContainer,
  excludeUserId?: string,
): Promise<number> {
  const service = getRbacService(container);
  const superRoles = (await service.store.listRoles()).filter((role) =>
    role.isSuperAdmin || role.routeAllows.includes("/*")
  );
  const superIds = new Set(superRoles.map((role) => role.id));
  if (superIds.size === 0) return 0;
  const assignments = await service.store.listAssignments();
  return assignments.filter((row) =>
    row.userId !== excludeUserId &&
    row.roleIds.some((id) => superIds.has(id))
  ).length;
}

export async function assertNotRemovingLastSuperAdmin(
  container: ServiceContainer,
  userId: string,
  nextRoleIds: string[],
): Promise<void> {
  const service = getRbacService(container);
  const superRoles = (await service.store.listRoles()).filter((role) =>
    role.isSuperAdmin || role.routeAllows.includes("/*")
  );
  const superIds = new Set(superRoles.map((role) => role.id));
  if (superIds.size === 0) return;
  const current = await service.store.getAssignment(userId);
  const had = current.roleIds.some((id) => superIds.has(id));
  const willHave = nextRoleIds.some((id) => superIds.has(id));
  if (
    had && !willHave && (await countSuperAdminHolders(container, userId)) < 1
  ) {
    throw new Error("不能移除最后一个超级管理员角色绑定");
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids.map(String).filter(Boolean))];
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export async function getRoleById(
  container: ServiceContainer,
  id: string,
): Promise<Role | null> {
  if (!id) return null;
  try {
    return await getRbacService(container).store.getRole(id);
  } catch {
    return null;
  }
}

export async function getPermissionById(
  container: ServiceContainer,
  id: string,
): Promise<Permission | null> {
  if (!id) return null;
  try {
    return await getRbacService(container).store.getPermission(id);
  } catch {
    return null;
  }
}

/** Copy leftover permission codes into routeAllows, then $unset `code`. */
export async function dropPermissionCodeFields(
  container: ServiceContainer,
): Promise<boolean> {
  try {
    const service = getRbacService(container);
    const adapter = await getDatabaseAsync(
      service.options.connectionName ?? "default",
    );
    const db = adapter.getDatabase?.() as {
      collection: (name: string) => {
        find: (filter?: Record<string, unknown>) => {
          toArray: () => Promise<Array<Record<string, unknown>>>;
        };
        updateOne: (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ) => Promise<unknown>;
        dropIndex?: (index: string) => Promise<unknown>;
      };
    } | null;
    if (!db) return false;
    let changed = false;
    const prefix = service.options.tablePrefix ?? "rbac_";

    for (const item of await service.store.listPermissions()) {
      const rec = item as typeof item & { code?: string };
      const fromCode = rec.code ? pathFromLegacyPermissionCode(rec.code) : null;
      if (!fromCode || item.routeAllows.includes(fromCode)) continue;
      await service.store.savePermission({
        ...item,
        routeAllows: unique([...item.routeAllows, fromCode]),
      });
      changed = true;
    }

    const col = db.collection(`${prefix}permissions`);
    try {
      await col.dropIndex?.("code_1");
    } catch {
      // index may not exist
    }
    const docs = await col.find({ code: { $exists: true } }).toArray().catch(
      () => [],
    );
    for (const doc of docs) {
      const id = doc._id ?? doc.id;
      if (id == null) continue;
      const code = typeof doc.code === "string" ? doc.code : "";
      const fromCode = code ? pathFromLegacyPermissionCode(code) : null;
      const current = unique([
        ...asStringList(doc.routeAllows ?? doc.route_allows),
        ...(fromCode ? [fromCode] : []),
      ]);
      const patch: Record<string, unknown> = { $unset: { code: "" } };
      if (
        fromCode &&
        !asStringList(doc.routeAllows ?? doc.route_allows).includes(fromCode)
      ) {
        if ("routeAllows" in doc || !("route_allows" in doc)) {
          patch.$set = { routeAllows: current };
        } else {
          patch.$set = { route_allows: current };
        }
      }
      await col.updateOne({ _id: id }, patch);
      changed = true;
    }
    return changed;
  } catch {
    return false;
  }
}
