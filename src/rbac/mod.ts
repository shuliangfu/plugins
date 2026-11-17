/**
 * @module @dreamer/plugins/rbac
 *
 * RBAC plugin for dweb: route checks, role/permission/route admin,
 * and stores for MongoDB, MySQL, PostgreSQL, SQLite, or memory.
 *
 * Admin pages at `{basePath}/roles|permissions|assign|routes|menus` are registered
 * automatically (default basePath `/rbac`, so menus default to `/rbac/menus`).
 * Override with `menus.pagePath`. CRUD is under the plugin API base. The host layout still wraps them.
 *
 * @example
 * ```ts
 * import { rbacPlugin } from "@dreamer/plugins/rbac";
 *
 * app.registerPlugin(rbacPlugin({
 *   database: {
 *     adapter: "mongodb",
 *     connection: { host: "127.0.0.1", port: 27017, database: "app" },
 *   },
 *   allowActions: ["/login", "/api/auth/login", "/assets/*"],
 *   seed: { assignUserId: "admin-id" },
 *   hooks: { getUser: (ctx) => getSessionAdmin(ctx) },
 * }));
 * ```
 */
export {
  ensureRbacReady,
  getRbacService,
  RBAC_SERVICE,
  rbacPlugin,
} from "./plugin.ts";
export {
  canManageFromAccess,
  nestMenus,
  RbacService,
} from "./service/service.ts";
export { MemoryRbacStore } from "./store/memory-store.ts";
export { createDatabaseRbacStore, ModelRbacStore } from "./store/db-store.ts";
export { mongoRbacStore } from "./store/mongo-store.ts";
export {
  assignmentSchema,
  createRbacModels,
  DEFAULT_TABLE_PREFIX,
  dropPermissionCode,
  ensureRbacTables,
  pathFromLegacyPermissionCode,
  permissionSchema,
  roleSchema,
  routeSchema,
} from "./models/mod.ts";
export {
  allowRouteByPatterns,
  matchAnyRoutePattern,
  matchRoutePattern,
  normalizePath,
  normalizeRoutePattern,
  parseRoutePatterns,
} from "./service/route-pattern.ts";
export { handleRbacApi } from "./api/mod.ts";
export { resolveApiMode } from "./api-mode.ts";
export {
  assertNotRemovingLastSuperAdmin,
  boundRolesForAdmin,
  countSuperAdminHolders,
  dropPermissionCodeFields,
  getAdminAccess,
  getEffectivePermissions,
  getPermissionById,
  getPermissionsPayload,
  getRoleById,
  invalidatePermissionCache,
  loadRbacUser,
  loadRolesForAdmin,
  requestContextFrom,
  requireUser,
  resolveRoleIdsFromInput,
  syncAssignment,
  toAdminAccess,
} from "./service/access.ts";
export type {
  AdminAccess,
  EffectivePermissions,
  RequireUserResult,
} from "./service/access.ts";
export type {
  Assignment,
  CheckDecision,
  ManagedRoute,
  MenuItem,
  Permission,
  RbacAccess,
  RbacAccessView,
  RbacAccount,
  RbacApiMode,
  RbacDatabaseType,
  RbacHooks,
  RbacListUser,
  RbacPluginOptions,
  RbacStore,
  RbacUser,
  Role,
  ScannedRoute,
} from "./types.ts";

export {
  allMenuRows,
  MenuManager,
  parseMenuListQuery,
  pickLocalized,
} from "./menus/service.ts";
export { DEFAULT_MENU_COLLECTION, MemoryMenuStore } from "./menus/store.ts";
export type {
  MenuFail,
  MenuListQuery,
  MenuOk,
  MenuRecord,
  MenuRow,
  MenuStore,
  SeedMenu,
} from "./menus/types.ts";

import type { ServiceContainer } from "@dreamer/service";
import type { MenuItem, RbacAccess } from "./types.ts";
import { getRbacService } from "./service/runtime.ts";
import type { MenuManager } from "./menus/service.ts";
import type { MenuRecord } from "./menus/types.ts";

/** Load stored menus, apply an optional host prepare hook, and filter by access. */
export function loadMenusForAccess(
  container: ServiceContainer,
  access: RbacAccess,
  locale?: string,
  prepare?: Parameters<MenuManager["loadForAccess"]>[2],
): Promise<MenuItem[]> {
  return getRbacService(container).loadMenusForAccess(access, locale, prepare);
}

export type { MenuRecord as RbacMenuRecord };
