/**
 * Route `load` helpers so RBAC DataPanels can SSR the current page of rows.
 */
import type { ServiceContainer } from "@dreamer/service";
import { getRbacService } from "../service/runtime.ts";
import {
  listQueryFrom,
  type ListQuerySource,
  type PagedList,
  paginateItems,
} from "../list-query.ts";
import { listAssignmentRows, listRouteTransfer } from "../api/mod.ts";
import type { Permission, Role } from "../types.ts";
import type { RoutesPageData } from "./types.ts";
export type { RoutesPageData } from "./types.ts";
export type { RbacListPageData } from "./list-props.ts";
import type { RbacListPageData } from "./list-props.ts";
export type RbacPageLoadContext = ListQuerySource & {
  container: ServiceContainer;
};

function loadList<T>(
  items: T[],
  ctx: RbacPageLoadContext,
  keys: (item: T) => string[],
): PagedList<T> {
  return paginateItems(items, listQueryFrom(ctx), keys);
}

export async function loadRoles(
  ctx: RbacPageLoadContext,
): Promise<PagedList<Role>> {
  return loadList(
    await getRbacService(ctx.container).store.listRoles(),
    ctx,
    (item) => [item.code, item.name, item.description ?? ""],
  );
}

export async function loadPermissions(
  ctx: RbacPageLoadContext,
): Promise<PagedList<Permission>> {
  return loadList(
    await getRbacService(ctx.container).store.listPermissions(),
    ctx,
    (item) => [item.name, item.description ?? ""],
  );
}

export async function loadAssign(
  ctx: RbacPageLoadContext,
): Promise<RbacListPageData> {
  const rows = await listAssignmentRows(getRbacService(ctx.container));
  return loadList(rows, ctx, (item) => [item.name, item.id]);
}

export async function loadRoutes(
  _ctx: RbacPageLoadContext,
): Promise<RoutesPageData> {
  return await listRouteTransfer(getRbacService(_ctx.container));
}
