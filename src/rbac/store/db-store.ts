/**
 * RbacStore backed by the plugin models (Mongo, MySQL, PostgreSQL, SQLite).
 */
import type { DatabaseAdapter, DatabaseType } from "@dreamer/database";
import {
  createRbacModels,
  DEFAULT_TABLE_PREFIX,
  ensureRbacTables,
  type RbacModels,
} from "../models/mod.ts";
import type {
  Assignment,
  ManagedRoute,
  Permission,
  RbacStore,
  Role,
} from "../types.ts";

export async function createDatabaseRbacStore(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  prefix = DEFAULT_TABLE_PREFIX,
): Promise<RbacStore> {
  await ensureRbacTables(adapter, type, prefix);
  const models = createRbacModels(adapter, type, prefix);
  return new ModelRbacStore(models, type);
}

export class ModelRbacStore implements RbacStore {
  #models: RbacModels;
  #mongo: boolean;

  constructor(models: RbacModels, type: DatabaseType = "sqlite") {
    this.#models = models;
    this.#mongo = type === "mongodb";
  }

  async listRoles(): Promise<Role[]> {
    const rows = await this.#models.Role.findAll();
    return rows.map((row) => toRole(row as Record<string, unknown>));
  }

  async getRole(id: string): Promise<Role | null> {
    const row = await this.#models.Role.findOne({ id });
    return row ? toRole(row as Record<string, unknown>) : null;
  }

  async getRoleByCode(code: string): Promise<Role | null> {
    const row = await this.#models.Role.findOne({ code });
    return row ? toRole(row as Record<string, unknown>) : null;
  }

  async saveRole(role: Role): Promise<Role> {
    await upsert(this.#models.Role, role.id, fromRole(role, this.#mongo));
    return role;
  }

  async removeRole(id: string): Promise<void> {
    await removeById(this.#models.Role, id);
  }

  async listPermissions(): Promise<Permission[]> {
    const rows = await this.#models.Permission.findAll();
    return rows.map((row) => toPermission(row as Record<string, unknown>));
  }

  async getPermission(id: string): Promise<Permission | null> {
    const row = await this.#models.Permission.findOne({ id });
    return row ? toPermission(row as Record<string, unknown>) : null;
  }

  async savePermission(permission: Permission): Promise<Permission> {
    await upsert(
      this.#models.Permission,
      permission.id,
      fromPermission(permission, this.#mongo),
    );
    return permission;
  }

  async removePermission(id: string): Promise<void> {
    await removeById(this.#models.Permission, id);
  }

  async getAssignment(userId: string): Promise<Assignment> {
    const query = this.#mongo ? { userId } : { user_id: userId };
    let row = await this.#models.Assignment.findOne(query);
    if (!row && this.#mongo) {
      row = await this.#models.Assignment.findOne({ user_id: userId });
    }
    return row
      ? toAssignment(row as Record<string, unknown>)
      : { userId, roleIds: [], permissionIds: [], routeAllows: [] };
  }

  async saveAssignment(assignment: Assignment): Promise<void> {
    const query = this.#mongo
      ? { userId: assignment.userId }
      : { user_id: assignment.userId };
    let existing = await this.#models.Assignment.findOne(query);
    if (!existing && this.#mongo) {
      existing = await this.#models.Assignment.findOne({
        user_id: assignment.userId,
      });
    }
    const id = existing
      ? String((existing as Record<string, unknown>).id ?? assignment.userId)
      : assignment.userId;
    await upsert(
      this.#models.Assignment,
      id,
      fromAssignment(
        { ...assignment, userId: assignment.userId },
        id,
        this.#mongo,
      ),
    );
  }

  async listAssignments(): Promise<Assignment[]> {
    const rows = await this.#models.Assignment.findAll();
    return rows.map((row) => toAssignment(row as Record<string, unknown>));
  }

  async listRoutes(): Promise<ManagedRoute[]> {
    const rows = await this.#models.Route.findAll();
    return rows.map((row) => toRoute(row as Record<string, unknown>));
  }

  async saveRoute(route: ManagedRoute): Promise<void> {
    await upsert(this.#models.Route, route.path, {
      id: route.path,
      path: route.path,
      source: route.source ?? "",
    });
  }

  async removeRoute(path: string): Promise<void> {
    const row = await this.#models.Route.findOne({ path });
    if (row) {
      await this.#models.Route.deleteById(
        rowKey(row as Record<string, unknown>, path),
      );
    }
  }
}

type ModelClass = RbacModels["Role"];

function rowKey(row: Record<string, unknown>, fallback: string): string {
  return String(row._id ?? row.id ?? fallback);
}

async function upsert(
  model: ModelClass,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await model.findOne({ id }) as
    | Record<string, unknown>
    | null;
  if (existing) {
    await model.updateById(rowKey(existing, id), data);
    return;
  }
  await model.create(data);
}

async function removeById(model: ModelClass, id: string): Promise<void> {
  const existing = await model.findOne({ id }) as
    | Record<string, unknown>
    | null;
  if (!existing) return;
  await model.deleteById(rowKey(existing, id));
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function packList(value: string[] | undefined): string {
  return JSON.stringify(value ?? []);
}

function packFlag(value: boolean | undefined): number {
  return value ? 1 : 0;
}

function field(
  row: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  return row[camel] !== undefined ? row[camel] : row[snake];
}

function toRole(row: Record<string, unknown>): Role {
  return {
    id: String(row.id ?? row._id),
    code: String(row.code),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    isSystem: asFlag(field(row, "isSystem", "is_system")),
    isSuperAdmin: asFlag(field(row, "isSuperAdmin", "is_super_admin")),
    isDeveloper: asFlag(field(row, "isDeveloper", "is_developer")),
    routeAllows: asList(field(row, "routeAllows", "route_allows")),
    routeExcludes: asList(field(row, "routeExcludes", "route_excludes")),
    childRoleIds: asList(field(row, "childRoleIds", "child_role_ids")),
    childPermissionIds: asList(
      field(row, "childPermissionIds", "child_permission_ids"),
    ),
    roleExcludes: asList(field(row, "roleExcludes", "role_excludes")),
    permissionExcludes: asList(
      field(row, "permissionExcludes", "permission_excludes"),
    ),
  };
}

function fromRole(role: Role, mongo = false): Record<string, unknown> {
  if (mongo) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? "",
      isSystem: packFlag(role.isSystem),
      isSuperAdmin: packFlag(role.isSuperAdmin),
      isDeveloper: packFlag(role.isDeveloper),
      routeAllows: packList(role.routeAllows),
      routeExcludes: packList(role.routeExcludes),
      childRoleIds: packList(role.childRoleIds),
      childPermissionIds: packList(role.childPermissionIds),
      roleExcludes: packList(role.roleExcludes),
      permissionExcludes: packList(role.permissionExcludes),
    };
  }
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? "",
    is_system: packFlag(role.isSystem),
    is_super_admin: packFlag(role.isSuperAdmin),
    is_developer: packFlag(role.isDeveloper),
    route_allows: packList(role.routeAllows),
    route_excludes: packList(role.routeExcludes),
    child_role_ids: packList(role.childRoleIds),
    child_permission_ids: packList(role.childPermissionIds),
    role_excludes: packList(role.roleExcludes),
    permission_excludes: packList(role.permissionExcludes),
  };
}

function toPermission(row: Record<string, unknown>): Permission {
  return {
    id: String(row.id ?? row._id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    routeAllows: asList(field(row, "routeAllows", "route_allows")),
    routeExcludes: asList(field(row, "routeExcludes", "route_excludes")),
    childPermissionIds: asList(
      field(row, "childPermissionIds", "child_permission_ids"),
    ),
    permissionExcludes: asList(
      field(row, "permissionExcludes", "permission_excludes"),
    ),
    source: (row.source as Permission["source"]) ?? "manual",
  };
}

function fromPermission(
  permission: Permission,
  mongo = false,
): Record<string, unknown> {
  if (mongo) {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description ?? "",
      routeAllows: packList(permission.routeAllows),
      routeExcludes: packList(permission.routeExcludes),
      childPermissionIds: packList(permission.childPermissionIds),
      permissionExcludes: packList(permission.permissionExcludes),
      source: permission.source ?? "manual",
    };
  }
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description ?? "",
    route_allows: packList(permission.routeAllows),
    route_excludes: packList(permission.routeExcludes),
    child_permission_ids: packList(permission.childPermissionIds),
    permission_excludes: packList(permission.permissionExcludes),
    source: permission.source ?? "manual",
  };
}

function toAssignment(row: Record<string, unknown>): Assignment {
  return {
    userId: String(field(row, "userId", "user_id") ?? ""),
    roleIds: asList(field(row, "roleIds", "role_ids")),
    permissionIds: asList(field(row, "permissionIds", "permission_ids")),
    routeAllows: asList(field(row, "routeAllows", "route_allows")),
    routeExcludes: asList(field(row, "routeExcludes", "route_excludes")),
    roleExcludes: asList(field(row, "roleExcludes", "role_excludes")),
    permissionExcludes: asList(
      field(row, "permissionExcludes", "permission_excludes"),
    ),
  };
}

function fromAssignment(
  assignment: Assignment,
  id: string,
  mongo = false,
): Record<string, unknown> {
  if (mongo) {
    return {
      id,
      userId: assignment.userId,
      roleIds: packList(assignment.roleIds),
      permissionIds: packList(assignment.permissionIds),
      routeAllows: packList(assignment.routeAllows ?? []),
      routeExcludes: packList(assignment.routeExcludes ?? []),
      roleExcludes: packList(assignment.roleExcludes ?? []),
      permissionExcludes: packList(assignment.permissionExcludes ?? []),
    };
  }
  return {
    id,
    user_id: assignment.userId,
    role_ids: packList(assignment.roleIds),
    permission_ids: packList(assignment.permissionIds),
    route_allows: packList(assignment.routeAllows ?? []),
    route_excludes: packList(assignment.routeExcludes ?? []),
    role_excludes: packList(assignment.roleExcludes ?? []),
    permission_excludes: packList(assignment.permissionExcludes ?? []),
  };
}

function toRoute(row: Record<string, unknown>): ManagedRoute {
  return {
    path: String(row.path ?? row.id),
    source: row.source ? String(row.source) : undefined,
  };
}
