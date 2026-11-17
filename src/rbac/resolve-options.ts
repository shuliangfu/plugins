/**
 * Resolve optional RBAC plugin options to their effective values.
 */
import { normalizePath } from "./service/route-pattern.ts";
import type { RbacGetUser, RbacPluginOptions } from "./types.ts";

export function resolveRbacGetUser(options: RbacPluginOptions): RbacGetUser {
  const getUser = options.hooks?.getUser ?? options.getUser;
  if (!getUser) throw new Error("rbacPlugin requires hooks.getUser");
  return getUser;
}

/** Menus admin page path: `menus.pagePath`, or `{basePath}/menus`. */
export function resolveMenusPagePath(options: RbacPluginOptions): string {
  const custom = options.menus?.pagePath?.trim();
  if (custom) return normalizePath(custom);
  return `${normalizePath(options.basePath ?? "/rbac")}/menus`;
}
