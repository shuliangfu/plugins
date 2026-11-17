/**
 * JSON API for the RBAC admin pages. Served from the plugin onRequest hook.
 */
import type { RequestContext } from "@dreamer/plugin";
import { listQueryFrom, paginateItems } from "../list-query.ts";
import {
  buildRouteTransferLists,
  normalizePath,
  parseRoutePatterns,
} from "../service/route-pattern.ts";
import { RbacFieldError, type RbacService } from "../service/service.ts";
import { collectScannedRoutes } from "../service/route-scan.ts";
import type { Permission, Role } from "../types.ts";
import { handleMenuApi } from "../menus/api.ts";

export async function handleRbacApi(
  ctx: RequestContext,
  service: RbacService,
): Promise<Response | null> {
  const path = normalizePath(ctx.path || ctx.url?.pathname || "/");
  const prefix = service.apiBasePath;
  if (path !== prefix && !path.startsWith(`${prefix}/`)) return null;
  const rel = path.slice(prefix.length) || "/";
  const method = (ctx.method || "GET").toUpperCase();
  try {
    if (method === "GET" && rel === "/roles") {
      return json(paginate(
        (await visibleCatalog(service)).roles,
        ctx,
        (item) => [item.code, item.name, item.description ?? ""],
      ));
    }
    if (method === "GET" && rel === "/roles/view") {
      const id = query(ctx, "id");
      const item = id ? await service.store.getRole(id) : null;
      return item
        ? json({ ok: true, data: await roleViewData(service, item) })
        : json({ ok: false, error: "not found" }, 404);
    }
    if (method === "POST" && rel === "/roles/create") {
      const body = await readBody(ctx);
      const item = await service.saveRole(roleFromBody(service, body));
      return json({ ok: true, item });
    }
    if (method === "POST" && rel === "/roles/update") {
      const body = await readBody(ctx);
      const current = await service.store.getRole(String(body.id ?? ""));
      if (!current) return json({ ok: false, error: "not found" }, 404);
      const item = await service.saveRole({
        ...current,
        ...rolePatch(body),
        id: current.id,
        code: current.isSystem
          ? current.code
          : String(body.code ?? current.code),
      });
      return json({ ok: true, item });
    }
    if (method === "POST" && rel === "/roles/remove") {
      const body = await readBody(ctx);
      await service.removeRole(String(body.id ?? ""));
      return json({ ok: true });
    }
    if (method === "POST" && rel === "/roles/remote-batch") {
      return await removeMany(
        await readBody(ctx),
        (id) => service.removeRole(id),
      );
    }
    if (method === "GET" && rel === "/roles/children") {
      const id = query(ctx, "id");
      const item = id ? await service.store.getRole(id) : null;
      if (!item) {
        return json({ ok: false, error: "not found" }, 404);
      }
      const catalog = await visibleCatalog(service);
      return json({
        ok: true,
        item,
        roleIds: item.childRoleIds,
        permissionIds: item.childPermissionIds,
        routes: item.routeAllows,
        roleExcludeIds: item.roleExcludes ?? [],
        permissionExcludeIds: item.permissionExcludes ?? [],
        routeExcludes: item.routeExcludes ?? [],
        roles: catalog.roles,
        permissions: catalog.permissions,
        managedRoutes: withOwnRoutes(
          catalog.routes,
          item.routeAllows,
          item.routeExcludes ?? [],
        ),
      });
    }
    if (method === "POST" && rel === "/roles/children") {
      const body = await readBody(ctx);
      const item = await service.setRoleChildren(String(body.id ?? ""), {
        roleIds: optionalStringArray(body, "roleIds"),
        permissionIds: optionalStringArray(body, "permissionIds"),
        routes: optionalStringArray(body, "routes"),
        roleExcludes: optionalStringArray(
          body,
          "roleExcludeIds",
          "roleExcludes",
        ),
        permissionExcludes: optionalStringArray(
          body,
          "permissionExcludeIds",
          "permissionExcludes",
        ),
        routeExcludes: optionalStringArray(body, "routeExcludes"),
      });
      return json({ ok: true, item });
    }

    if (method === "GET" && rel === "/permissions") {
      return json(paginate(
        (await visibleCatalog(service)).permissions,
        ctx,
        (item) => [item.name, item.description ?? ""],
      ));
    }
    if (method === "GET" && rel === "/permissions/view") {
      const id = query(ctx, "id");
      const item = id ? await service.store.getPermission(id) : null;
      return item
        ? json({ ok: true, data: await permissionViewData(service, item) })
        : json({ ok: false, error: "not found" }, 404);
    }
    if (method === "POST" && rel === "/permissions/create") {
      const body = await readBody(ctx);
      const item = await service.savePermission(
        permissionFromBody(service, body),
      );
      return json({ ok: true, item });
    }
    if (method === "POST" && rel === "/permissions/update") {
      const body = await readBody(ctx);
      const current = await service.store.getPermission(String(body.id ?? ""));
      if (!current) return json({ ok: false, error: "not found" }, 404);
      const item = await service.savePermission({
        ...current,
        ...permissionPatch(body),
        id: current.id,
      });
      return json({ ok: true, item });
    }
    if (method === "POST" && rel === "/permissions/remove") {
      const body = await readBody(ctx);
      await service.removePermission(String(body.id ?? ""));
      return json({ ok: true });
    }
    if (method === "POST" && rel === "/permissions/remote-batch") {
      return await removeMany(
        await readBody(ctx),
        (id) => service.removePermission(id),
      );
    }
    if (method === "GET" && rel === "/permissions/children") {
      const id = query(ctx, "id");
      const item = id ? await service.store.getPermission(id) : null;
      if (!item) {
        return json({ ok: false, error: "not found" }, 404);
      }
      const catalog = await visibleCatalog(service);
      return json({
        ok: true,
        item,
        permissionIds: item.childPermissionIds,
        routes: item.routeAllows,
        permissionExcludeIds: item.permissionExcludes ?? [],
        routeExcludes: item.routeExcludes ?? [],
        permissions: catalog.permissions,
        managedRoutes: withOwnRoutes(
          catalog.routes,
          item.routeAllows,
          item.routeExcludes ?? [],
        ),
      });
    }
    if (method === "POST" && rel === "/permissions/children") {
      const body = await readBody(ctx);
      const item = await service.setPermissionChildren(
        String(body.id ?? ""),
        {
          permissionIds: optionalStringArray(body, "permissionIds"),
          routes: optionalStringArray(body, "routes"),
          permissionExcludes: optionalStringArray(
            body,
            "permissionExcludeIds",
            "permissionExcludes",
          ),
          routeExcludes: optionalStringArray(body, "routeExcludes"),
        },
      );
      return json({ ok: true, item });
    }

    if (method === "GET" && rel === "/assign") {
      const userId = query(ctx, "userId");
      if (userId) {
        const user = await findListUser(service, userId);
        const item = await assignmentRow(service, userId, user);
        return json({ ok: true, item });
      }
      return json(
        paginate(await listAssignmentRows(service), ctx, (item) => [
          item.name,
          item.username ?? "",
          item.phone ?? "",
          item.email ?? "",
          item.id,
        ]),
      );
    }
    if (method === "GET" && rel === "/assign/view") {
      const id = query(ctx, "id") || query(ctx, "userId");
      if (!id) return json({ ok: false, error: "id required" }, 400);
      const user = await findListUser(service, id);
      const item = await assignmentRow(service, id, user);
      return json({ ok: true, data: item });
    }
    if (method === "GET" && rel === "/assign/users") {
      const users = await service.options.hooks?.listUsers?.() ?? [];
      return json({ ok: true, items: users });
    }
    if (method === "POST" && (rel === "/assign" || rel === "/assign/update")) {
      const body = await readBody(ctx);
      const userId = String(body.userId ?? body.id ?? "");
      if (!userId) return json({ ok: false, error: "userId required" }, 400);
      const current = await service.store.getAssignment(userId);
      await service.store.saveAssignment({
        userId,
        roleIds: body.roleIds != null
          ? asStringArray(body.roleIds)
          : current.roleIds,
        permissionIds: body.permissionIds != null
          ? asStringArray(body.permissionIds)
          : current.permissionIds,
        routeAllows: body.routes != null || body.routeAllows != null
          ? asStringArray(body.routes ?? body.routeAllows)
          : current.routeAllows,
        roleExcludes: body.roleExcludeIds != null || body.roleExcludes != null
          ? asStringArray(body.roleExcludeIds ?? body.roleExcludes)
          : current.roleExcludes,
        permissionExcludes: body.permissionExcludeIds != null ||
            body.permissionExcludes != null
          ? asStringArray(
            body.permissionExcludeIds ?? body.permissionExcludes,
          )
          : current.permissionExcludes,
        routeExcludes: body.routeExcludes != null
          ? asStringArray(body.routeExcludes)
          : current.routeExcludes,
      });
      service.invalidate(userId);
      return json({ ok: true });
    }

    if (method === "GET" && rel === "/routes/transfer") {
      return json({ ok: true, ...(await listRouteTransfer(service)) });
    }
    if (method === "GET" && rel === "/routes") {
      const rows = (await visibleCatalog(service)).routes.map(routeRow);
      return json(
        paginate(rows, ctx, (item) => [item.path, item.source ?? ""]),
      );
    }
    if (
      method === "POST" && (rel === "/routes/create" || rel === "/routes/add")
    ) {
      const body = await readBody(ctx);
      for (
        const path of parseRoutePatterns(asStringArray(body.paths ?? body.path))
      ) {
        await service.store.saveRoute({ path, source: "manual" });
      }
      return json({ ok: true, items: await service.store.listRoutes() });
    }
    if (method === "POST" && rel === "/routes/remove") {
      const body = await readBody(ctx);
      const paths = asStringArray(
        body.paths ?? body.path ?? body.id ?? body.ids,
      );
      for (const path of paths) await service.store.removeRoute(path);
      return json({ ok: true });
    }
    if (method === "POST" && rel === "/routes/sync") {
      const body = await readBody(ctx);
      const add = parseRoutePatterns(asStringArray(body.add));
      const drop = parseRoutePatterns(asStringArray(body.remove));
      if (add.length || drop.length) {
        for (const path of add) {
          await service.store.saveRoute({
            path,
            source: body.source === "manual" ? "manual" : "scan",
          });
        }
        for (const path of drop) await service.store.removeRoute(path);
        return json({ ok: true, ...(await listRouteTransfer(service)) });
      }
      await service.syncScannedRoutes([
        ...asStringArray(body.paths),
        ...collectScannedRoutes(service),
      ], {
        saveRoutes: true,
      });
      return json({ ok: true, ...(await listRouteTransfer(service)) });
    }

    const menuRes = await handleMenuApi(ctx, service, rel, method);
    if (menuRes) return menuRes;

    if (method === "GET" && (rel === "/access" || rel === "/me")) {
      const user = await service.getUser(ctx);
      if (!user) return json({ ok: false, error: "unauthorized" }, 401);
      const access = await service.getAccess(user);
      return json({
        ok: true,
        apiMode: service.apiMode,
        item: service.viewAccess(access),
      });
    }

    if (service.apiMode === "restful") {
      const rest = await handleRestful(ctx, service, method, rel);
      if (rest) return rest;
    }

    // Host apps may own extra routes under the same apiBasePath.
    // Fall through so those handlers run.
    const section = rel.split("/").filter(Boolean)[0];
    if (section && PLUGIN_API_SECTIONS.has(section)) {
      return json({ ok: false, error: "not found" }, 404);
    }
    return null;
  } catch (error) {
    if (error instanceof RbacFieldError) {
      return json({
        ok: false,
        error: error.message,
        messages: { [error.field]: error.message },
      }, 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message }, 400);
  }
}

const PLUGIN_API_SECTIONS = new Set([
  "roles",
  "permissions",
  "assign",
  "routes",
  "menus",
  "access",
  "me",
]);

const RESTFUL_RESERVED = new Set([
  "view",
  "create",
  "update",
  "remove",
  "remote-batch",
  "children",
  "transfer",
  "add",
  "sync",
  "users",
  "filter",
  "access",
  "me",
]);

function restfulId(rel: string, prefix: string): string | undefined {
  if (rel === prefix || !rel.startsWith(`${prefix}/`)) return;
  const id = rel.slice(prefix.length + 1);
  if (!id || id.includes("/") || RESTFUL_RESERVED.has(id)) return;
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

async function handleRestful(
  ctx: RequestContext,
  service: RbacService,
  method: string,
  rel: string,
): Promise<Response | null> {
  if (method === "POST" && rel === "/roles") {
    const body = await readBody(ctx);
    const item = await service.saveRole(roleFromBody(service, body));
    return json({ ok: true, item });
  }
  const roleId = restfulId(rel, "/roles");
  if (roleId) {
    if (method === "GET") {
      const item = await service.store.getRole(roleId);
      return item
        ? json({ ok: true, data: await roleViewData(service, item) })
        : json({ ok: false, error: "not found" }, 404);
    }
    if (method === "PUT") {
      const body = await readBody(ctx);
      const current = await service.store.getRole(roleId);
      if (!current) return json({ ok: false, error: "not found" }, 404);
      const item = await service.saveRole({
        ...current,
        ...rolePatch(body),
        id: current.id,
        code: current.isSystem
          ? current.code
          : String(body.code ?? current.code),
      });
      return json({ ok: true, item });
    }
    if (method === "DELETE") {
      await service.removeRole(roleId);
      return json({ ok: true });
    }
  }

  if (method === "POST" && rel === "/permissions") {
    const body = await readBody(ctx);
    const item = await service.savePermission(
      permissionFromBody(service, body),
    );
    return json({ ok: true, item });
  }
  const permissionId = restfulId(rel, "/permissions");
  if (permissionId) {
    if (method === "GET") {
      const item = await service.store.getPermission(permissionId);
      return item
        ? json({ ok: true, data: await permissionViewData(service, item) })
        : json({ ok: false, error: "not found" }, 404);
    }
    if (method === "PUT") {
      const body = await readBody(ctx);
      const current = await service.store.getPermission(permissionId);
      if (!current) return json({ ok: false, error: "not found" }, 404);
      const item = await service.savePermission({
        ...current,
        ...permissionPatch(body),
        id: current.id,
      });
      return json({ ok: true, item });
    }
    if (method === "DELETE") {
      await service.removePermission(permissionId);
      return json({ ok: true });
    }
  }

  const assignId = restfulId(rel, "/assign");
  if (assignId) {
    if (method === "GET") {
      const item = await assignmentRow(
        service,
        assignId,
        await findListUser(service, assignId),
      );
      return json({ ok: true, data: item });
    }
    if (method === "PUT") {
      const body = await readBody(ctx);
      await service.store.saveAssignment({
        userId: assignId,
        roleIds: asStringArray(body.roleIds),
        permissionIds: asStringArray(body.permissionIds),
        routeAllows: asStringArray(body.routes ?? body.routeAllows),
      });
      service.invalidate(assignId);
      return json({ ok: true });
    }
  }

  if (method === "POST" && rel === "/routes") {
    const body = await readBody(ctx);
    for (
      const path of parseRoutePatterns(asStringArray(body.paths ?? body.path))
    ) {
      await service.store.saveRoute({ path, source: "manual" });
    }
    return json({ ok: true, items: await service.store.listRoutes() });
  }
  const routeId = restfulId(rel, "/routes");
  if (routeId && method === "DELETE") {
    await service.store.removeRoute(routeId);
    return json({ ok: true });
  }
  return null;
}

function paginate<T>(
  items: T[],
  ctx: RequestContext,
  keys: (item: T) => string[],
): { ok: true; items: T[]; total: number } {
  const result = paginateItems(items, listQueryFrom(ctx), keys);
  return { ok: true, items: result.rows, total: result.total };
}

async function visibleCatalog(service: RbacService) {
  return {
    roles: await service.store.listRoles(),
    permissions: await service.store.listPermissions(),
    routes: await service.store.listRoutes(),
  };
}

async function roleViewData(
  service: RbacService,
  item: Role,
) {
  const catalog = await visibleCatalog(service);
  return {
    ...item,
    roleIds: item.childRoleIds,
    permissionIds: item.childPermissionIds,
    routes: item.routeAllows,
    roleExcludeIds: item.roleExcludes ?? [],
    permissionExcludeIds: item.permissionExcludes ?? [],
    routeExcludes: item.routeExcludes ?? [],
    roles: catalog.roles,
    permissions: catalog.permissions,
    managedRoutes: withOwnRoutes(
      catalog.routes,
      item.routeAllows,
      item.routeExcludes ?? [],
    ),
  };
}

function withOwnRoutes(
  catalog: Array<{ path: string; source?: string }>,
  ...lists: Array<string[] | undefined>
): Array<{ path: string; source?: string }> {
  const have = new Map(catalog.map((row) => [row.path, row]));
  for (const list of lists) {
    for (const path of list ?? []) {
      if (path && !have.has(path)) have.set(path, { path });
    }
  }
  return [...have.values()];
}

async function permissionViewData(
  service: RbacService,
  item: Permission,
) {
  const catalog = await visibleCatalog(service);
  return {
    ...item,
    permissionIds: item.childPermissionIds,
    routes: item.routeAllows,
    permissionExcludeIds: item.permissionExcludes ?? [],
    routeExcludes: item.routeExcludes ?? [],
    permissions: catalog.permissions,
    managedRoutes: withOwnRoutes(
      catalog.routes,
      item.routeAllows,
      item.routeExcludes ?? [],
    ),
  };
}

export async function listRouteTransfer(service: RbacService) {
  const scanned = collectScannedRoutes(service);
  return buildRouteTransferLists(
    parseRoutePatterns(scanned),
    await service.store.listRoutes(),
  );
}

export function routeRow(row: { path: string; source?: string }) {
  return { id: row.path, path: row.path, source: row.source ?? "" };
}

export async function listAssignmentRows(service: RbacService) {
  const users = await service.options.hooks?.listUsers?.() ?? [];
  if (users.length) {
    const rows = [];
    for (const user of users) {
      rows.push(await assignmentRow(service, user.id, user));
    }
    return rows;
  }
  const assignments = await service.store.listAssignments();
  const rows = [];
  for (const item of assignments) {
    rows.push(await assignmentRow(service, item.userId));
  }
  return rows;
}

async function findListUser(service: RbacService, userId: string) {
  const users = await service.options.hooks?.listUsers?.() ?? [];
  return users.find((user) => user.id === userId);
}

async function assignmentRow(
  service: RbacService,
  userId: string,
  user?: { name?: string; username?: string; phone?: string; email?: string },
) {
  const assignment = await service.store.getAssignment(userId);
  const catalog = await visibleCatalog(service);
  const roleMap = new Map(catalog.roles.map((role) => [role.id, role]));
  return {
    id: userId,
    userId,
    name: user?.name ?? userId,
    username: user?.username,
    phone: user?.phone,
    email: user?.email,
    roleIds: assignment.roleIds,
    permissionIds: assignment.permissionIds,
    routes: assignment.routeAllows ?? [],
    roleExcludeIds: assignment.roleExcludes ?? [],
    permissionExcludeIds: assignment.permissionExcludes ?? [],
    routeExcludes: assignment.routeExcludes ?? [],
    roles: assignment.roleIds.map((id) => roleMap.get(id)?.name ?? id),
    catalogRoles: catalog.roles,
    catalogPermissions: catalog.permissions,
    managedRoutes: withOwnRoutes(
      catalog.routes,
      assignment.routeAllows ?? [],
      assignment.routeExcludes ?? [],
    ),
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function query(ctx: RequestContext, key: string): string {
  if (ctx.query && ctx.query[key]) return ctx.query[key];
  return ctx.url?.searchParams.get(key) ?? "";
}

async function readBody(ctx: RequestContext): Promise<Record<string, unknown>> {
  if (ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)) {
    return ctx.body as Record<string, unknown>;
  }
  try {
    const data = await ctx.request.json();
    return data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function optionalStringArray(
  body: Record<string, unknown>,
  ...keys: string[]
): string[] | undefined {
  for (const key of keys) {
    if (body[key] != null) return asStringArray(body[key]);
  }
  return undefined;
}

async function removeMany(
  body: Record<string, unknown>,
  remove: (id: string) => Promise<void>,
) {
  const ids = asStringArray(body.ids ?? body.id).filter((id) => id.trim());
  const failed: { id: string; error: string }[] = [];
  let removed = 0;
  for (const id of ids) {
    try {
      await remove(id);
      removed++;
    } catch (e) {
      failed.push({
        id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return json({ ok: failed.length === 0, removed, failed });
}

function roleFromBody(
  service: RbacService,
  body: Record<string, unknown>,
): Role {
  return {
    id: String(body.id ?? service.newId()),
    code: String(body.code ?? ""),
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : undefined,
    isSystem: false,
    isSuperAdmin: Boolean(body.isSuperAdmin),
    isDeveloper: Boolean(body.isDeveloper),
    routeAllows: parseRoutePatterns(body.routeAllows),
    routeExcludes: parseRoutePatterns(body.routeExcludes),
    childRoleIds: asStringArray(body.childRoleIds),
    childPermissionIds: asStringArray(body.childPermissionIds),
  };
}

function rolePatch(body: Record<string, unknown>): Partial<Role> {
  const patch: Partial<Role> = {};
  if (body.name != null) patch.name = String(body.name);
  if (body.description != null) patch.description = String(body.description);
  if (body.isDeveloper != null) patch.isDeveloper = Boolean(body.isDeveloper);
  if (body.routeExcludes != null) {
    patch.routeExcludes = parseRoutePatterns(body.routeExcludes);
  }
  return patch;
}

function permissionFromBody(
  service: RbacService,
  body: Record<string, unknown>,
): Permission {
  return {
    id: String(body.id ?? service.newId()),
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : undefined,
    routeAllows: parseRoutePatterns(body.routeAllows),
    routeExcludes: parseRoutePatterns(body.routeExcludes),
    childPermissionIds: asStringArray(body.childPermissionIds),
    source: "manual",
  };
}

function permissionPatch(body: Record<string, unknown>): Partial<Permission> {
  const patch: Partial<Permission> = {};
  if (body.name != null) patch.name = String(body.name);
  if (body.description != null) patch.description = String(body.description);
  if (body.routeExcludes != null) {
    patch.routeExcludes = parseRoutePatterns(body.routeExcludes);
  }
  return patch;
}
