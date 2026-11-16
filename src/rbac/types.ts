/**
 * RBAC plugin types.
 */
import type { DatabaseAdapter, DatabaseConfig } from "@dreamer/database";
import type { RequestContext } from "@dreamer/plugin";

export type RbacDatabaseType = "mongodb" | "mysql" | "postgresql" | "sqlite";

export interface RbacUser {
  id: string;
  roleIds?: string[];
  permissionIds?: string[];
  isDeveloper?: boolean;
  /** Extra path globs granted to this user. */
  routeAllows?: string[];
  /** Extra path globs denied for this user. */
  routeExcludes?: string[];
  /** Role ids subtracted from the assignment. */
  roleExcludes?: string[];
  /** Permission ids subtracted from the assignment. */
  permissionExcludes?: string[];
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isSuperAdmin?: boolean;
  isDeveloper?: boolean;
  routeAllows: string[];
  routeExcludes: string[];
  childRoleIds: string[];
  childPermissionIds: string[];
  /** Role ids subtracted when this role is expanded. */
  roleExcludes?: string[];
  /** Permission ids subtracted when this role is expanded. */
  permissionExcludes?: string[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  routeAllows: string[];
  routeExcludes: string[];
  childPermissionIds: string[];
  /** Permission ids subtracted when this permission is expanded. */
  permissionExcludes?: string[];
  source?: "seed" | "manual" | "registry" | "scan";
}

export interface Assignment {
  userId: string;
  roleIds: string[];
  permissionIds: string[];
  routeAllows?: string[];
  routeExcludes?: string[];
  roleExcludes?: string[];
  permissionExcludes?: string[];
}

export interface ManagedRoute {
  path: string;
  source?: string;
}

export interface MenuItem {
  key?: string;
  title: string;
  path?: string;
  permission?: string;
  show?: boolean;
  icon?: string;
  parentKey?: string;
  sort?: number;
  status?: string;
  children?: MenuItem[];
}

export interface RbacAccess {
  userId: string;
  roleIds: string[];
  routeAllows: string[];
  routeExcludes: string[];
  isDeveloper: boolean;
}

export interface RbacAccessView {
  userId: string;
  roleIds: string[];
  routeAllows: string[];
  routeExcludes: string[];
  isDeveloper: boolean;
}

export type CheckDecision =
  | { ok: true }
  | { ok: false; status: 401 | 403; reason?: string };

export interface RbacStore {
  listRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | null>;
  getRoleByCode(code: string): Promise<Role | null>;
  saveRole(role: Role): Promise<Role>;
  removeRole(id: string): Promise<void>;

  listPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | null>;
  savePermission(permission: Permission): Promise<Permission>;
  removePermission(id: string): Promise<void>;

  getAssignment(userId: string): Promise<Assignment>;
  saveAssignment(assignment: Assignment): Promise<void>;
  listAssignments(): Promise<Assignment[]>;

  listRoutes(): Promise<ManagedRoute[]>;
  saveRoute(route: ManagedRoute): Promise<void>;
  removeRoute(path: string): Promise<void>;
}

export interface RbacListUser {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  isDeveloper?: boolean;
}

export interface ScannedRoute {
  path: string;
  name?: string;
  description?: string;
}

/** Host account used by `loadRbacUser` to fill `isDeveloper` and skip disabled users. */
export interface RbacAccount {
  id: string;
  isDeveloper?: boolean;
  disabled?: boolean;
}

export interface RbacHooks {
  isDeveloper?: (user: RbacUser) => boolean;
  authorize?: (
    ctx: RequestContext,
    decision: CheckDecision,
    access: RbacAccess | null,
  ) => CheckDecision | Promise<CheckDecision>;
  listUsers?: () => Promise<RbacListUser[]>;
  /** Look up a host user by id (status, developer flag). */
  loadAccount?: (userId: string) => Promise<RbacAccount | null>;
}

export type RbacApiMode = "action" | "restful";

export interface RbacPluginOptions {
  /**
   * API style. When omitted, read `router.apiMode` from the app
   * `config` in the service container (dweb AppConfig). Defaults to
   * `"action"` when no config is present. Action mode is GET/POST only;
   * restful also serves PUT/DELETE on `/resource/:id`.
   */
  apiMode?: RbacApiMode;
  /** Custom store. When set, database options are ignored. */
  store?: RbacStore;
  /**
   * @dreamer/database config, e.g.
   * `{ adapter: "mongodb", connection: { host, port, database } }`
   * or `{ adapter: "sqlite", connection: { filename: ":memory:" } }`.
   */
  database?: DatabaseConfig;
  /** Already-connected adapter; also pass `databaseType`. */
  adapter?: DatabaseAdapter;
  databaseType?: RbacDatabaseType;
  /** Existing @dreamer/database connection name (default "default"). */
  connectionName?: string;
  /** Table / collection prefix (default `rbac_`). */
  tablePrefix?: string;
  getUser: (
    ctx: RequestContext,
  ) => RbacUser | null | Promise<RbacUser | null>;
  loginPath?: string;
  forbiddenPath?: string;
  basePath?: string;
  apiBasePath?: string;
  /** Public paths that skip auth (login, assets). loginPath and forbiddenPath are always included. */
  allowActions?: string[];
  /** Paths any logged-in user may access (lock, self-account, chat). */
  sessionAllowActions?: string[];
  developerPrefix?: string[];
  seed?: {
    superRole?: string;
    superRoleName?: string;
    grant?: string;
    assignUserId?: string;
  };
  hooks?: RbacHooks;
  permissions?: Array<{
    name: string;
    description?: string;
    routeAllows?: string[];
  }>;
}
