/**
 * @module @dreamer/plugins/rbac
 *
 * RBAC plugin for dweb: route checks, role/permission/route admin,
 * and stores for MongoDB, MySQL, PostgreSQL, SQLite, or memory.
 *
 * Admin pages are DataPanel components. Embed them in the host layout:
 *
 * ```ts
 * import { RolesPage } from "@dreamer/plugins/rbac";
 * export default RolesPage;
 * ```
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
 *   getUser: (ctx) => getSessionAdmin(ctx),
 *   allowActions: ["/login", "/api/auth/login", "/assets/*"],
 *   seed: { assignUserId: "admin-id" },
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
  AssignPage,
  listPanelProps,
  PermissionsPage,
  type RbacListPageData,
  type RbacPanelProps,
  RolesPage,
  RoutesPage,
} from "./pages/mod.ts";
export {
  loadAssign,
  loadPermissions,
  loadRoles,
  loadRoutes,
} from "./pages/load.ts";
export type { RbacPageLoadContext } from "./pages/load.ts";
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
