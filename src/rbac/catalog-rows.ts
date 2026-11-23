/**
 * Role / permission list and view rows, seeded with the visible catalog
 * so GrantTransfer can render at final size on the first paint.
 */
import type { RbacService } from "./service/service.ts";
import type { Permission, Role } from "./types.ts";

export type VisibleCatalog = {
  roles: Role[];
  permissions: Permission[];
  routes: Array<{ path: string; source?: string }>;
};

export async function visibleCatalog(
  service: RbacService,
): Promise<VisibleCatalog> {
  return {
    roles: await service.store.listRoles(),
    permissions: await service.store.listPermissions(),
    routes: await service.store.listRoutes(),
  };
}

export function withOwnRoutes(
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

export function roleListRow(item: Role, catalog: VisibleCatalog) {
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

export function permissionListRow(
  item: Permission,
  catalog: VisibleCatalog,
) {
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

export async function listRoleRows(service: RbacService) {
  const catalog = await visibleCatalog(service);
  return catalog.roles.map((item) => roleListRow(item, catalog));
}

export async function listPermissionRows(service: RbacService) {
  const catalog = await visibleCatalog(service);
  return catalog.permissions.map((item) => permissionListRow(item, catalog));
}
