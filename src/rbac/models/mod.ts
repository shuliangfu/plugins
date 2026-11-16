/**
 * RBAC models live in this plugin. SQL and Mongo share one schema;
 * @dreamer/database provides SQLModel and MongoModel.
 */
import {
  type DatabaseAdapter,
  type DatabaseType,
  MongoModel,
  SQLModel,
} from "@dreamer/database";

export const DEFAULT_TABLE_PREFIX = "rbac_";

export const roleSchema = {
  id: { type: "string", validate: { required: true } },
  code: { type: "string", validate: { required: true } },
  name: { type: "string", validate: { required: true } },
  description: { type: "text" },
  is_system: { type: "number", default: 0 },
  is_super_admin: { type: "number", default: 0 },
  is_developer: { type: "number", default: 0 },
  route_allows: { type: "text", default: "[]" },
  route_excludes: { type: "text", default: "[]" },
  child_role_ids: { type: "text", default: "[]" },
  child_permission_ids: { type: "text", default: "[]" },
  role_excludes: { type: "text", default: "[]" },
  permission_excludes: { type: "text", default: "[]" },
};

export const permissionSchema = {
  id: { type: "string", validate: { required: true } },
  name: { type: "string", validate: { required: true } },
  description: { type: "text" },
  route_allows: { type: "text", default: "[]" },
  route_excludes: { type: "text", default: "[]" },
  child_permission_ids: { type: "text", default: "[]" },
  permission_excludes: { type: "text", default: "[]" },
  source: { type: "string", default: "manual" },
};

export const assignmentSchema = {
  id: { type: "string", validate: { required: true } },
  user_id: { type: "string", validate: { required: true } },
  role_ids: { type: "text", default: "[]" },
  permission_ids: { type: "text", default: "[]" },
  route_allows: { type: "text", default: "[]" },
  route_excludes: { type: "text", default: "[]" },
  role_excludes: { type: "text", default: "[]" },
  permission_excludes: { type: "text", default: "[]" },
};

export const routeSchema = {
  id: { type: "string", validate: { required: true } },
  path: { type: "string", validate: { required: true } },
  source: { type: "string" },
};

/** Narrow model API used by the store (SQL and Mongo signatures differ). */
export interface StoreModel {
  findAll(): Promise<unknown[]>;
  findById(id: string): Promise<unknown | null>;
  findOne(condition: Record<string, unknown>): Promise<unknown | null>;
  create(data: Record<string, unknown>): Promise<unknown>;
  updateById(id: string, data: Record<string, unknown>): Promise<unknown>;
  deleteById(id: string): Promise<unknown>;
}

export interface RbacModels {
  Role: StoreModel;
  Permission: StoreModel;
  Assignment: StoreModel;
  Route: StoreModel;
}

export function createRbacModels(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  prefix = DEFAULT_TABLE_PREFIX,
): RbacModels {
  if (type === "mongodb") {
    class RbacRole extends MongoModel {
      static override collectionName = `${prefix}roles`;
      static override schema = roleSchema as (typeof MongoModel)["schema"];
    }
    class RbacPermission extends MongoModel {
      static override collectionName = `${prefix}permissions`;
      static override schema =
        permissionSchema as (typeof MongoModel)["schema"];
    }
    class RbacAssignment extends MongoModel {
      static override collectionName = `${prefix}assignments`;
      static override schema =
        assignmentSchema as (typeof MongoModel)["schema"];
    }
    class RbacRoute extends MongoModel {
      static override collectionName = `${prefix}routes`;
      static override schema = routeSchema as (typeof MongoModel)["schema"];
    }
    RbacRole.setAdapter(adapter);
    RbacPermission.setAdapter(adapter);
    RbacAssignment.setAdapter(adapter);
    RbacRoute.setAdapter(adapter);
    return {
      Role: RbacRole,
      Permission: RbacPermission,
      Assignment: RbacAssignment,
      Route: RbacRoute,
    } as unknown as RbacModels;
  }

  class RbacRole extends SQLModel {
    static override tableName = `${prefix}roles`;
    static override primaryKey = "id";
    static schema = roleSchema;
  }
  class RbacPermission extends SQLModel {
    static override tableName = `${prefix}permissions`;
    static override primaryKey = "id";
    static schema = permissionSchema;
  }
  class RbacAssignment extends SQLModel {
    static override tableName = `${prefix}assignments`;
    static override primaryKey = "id";
    static schema = assignmentSchema;
  }
  class RbacRoute extends SQLModel {
    static override tableName = `${prefix}routes`;
    static override primaryKey = "id";
    static schema = routeSchema;
  }
  RbacRole.setAdapter(adapter);
  RbacPermission.setAdapter(adapter);
  RbacAssignment.setAdapter(adapter);
  RbacRoute.setAdapter(adapter);
  return {
    Role: RbacRole,
    Permission: RbacPermission,
    Assignment: RbacAssignment,
    Route: RbacRoute,
  } as unknown as RbacModels;
}

/** Create plugin tables on SQL databases. Mongo collections are created on first write. */
export async function ensureRbacTables(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  prefix = DEFAULT_TABLE_PREFIX,
): Promise<void> {
  if (type === "mongodb") return;
  const roles = `${prefix}roles`;
  const permissions = `${prefix}permissions`;
  const assignments = `${prefix}assignments`;
  const routes = `${prefix}routes`;
  const idType = type === "mysql" ? "VARCHAR(64)" : "TEXT";
  const nameType = type === "mysql" ? "VARCHAR(255)" : "TEXT";
  const codeType = type === "mysql" ? "VARCHAR(128)" : "TEXT";
  const statements = [
    `CREATE TABLE IF NOT EXISTS ${roles} (
      id ${idType} PRIMARY KEY,
      code ${codeType} NOT NULL UNIQUE,
      name ${nameType} NOT NULL,
      description TEXT,
      is_system INT NOT NULL DEFAULT 0,
      is_super_admin INT NOT NULL DEFAULT 0,
      is_developer INT NOT NULL DEFAULT 0,
      route_allows TEXT NOT NULL,
      route_excludes TEXT NOT NULL,
      child_role_ids TEXT NOT NULL,
      child_permission_ids TEXT NOT NULL,
      role_excludes TEXT NOT NULL DEFAULT '[]',
      permission_excludes TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS ${permissions} (
      id ${idType} PRIMARY KEY,
      name ${nameType} NOT NULL,
      description TEXT,
      route_allows TEXT NOT NULL,
      route_excludes TEXT NOT NULL,
      child_permission_ids TEXT NOT NULL,
      permission_excludes TEXT NOT NULL DEFAULT '[]',
      source ${codeType}
    )`,
    `CREATE TABLE IF NOT EXISTS ${assignments} (
      id ${idType} PRIMARY KEY,
      user_id ${codeType} NOT NULL UNIQUE,
      role_ids TEXT NOT NULL,
      permission_ids TEXT NOT NULL,
      route_allows TEXT NOT NULL DEFAULT '[]',
      route_excludes TEXT NOT NULL DEFAULT '[]',
      role_excludes TEXT NOT NULL DEFAULT '[]',
      permission_excludes TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS ${routes} (
      id ${idType} PRIMARY KEY,
      path ${nameType} NOT NULL UNIQUE,
      source ${codeType}
    )`,
  ];
  for (const sql of statements) {
    await adapter.execute(sql, []);
  }
  const extraCols = [
    [assignments, "route_allows"],
    [assignments, "route_excludes"],
    [assignments, "role_excludes"],
    [assignments, "permission_excludes"],
    [roles, "role_excludes"],
    [roles, "permission_excludes"],
    [permissions, "permission_excludes"],
  ];
  for (const [table, column] of extraCols) {
    try {
      await adapter.execute(
        `ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT '[]'`,
        [],
      );
    } catch {
      // column already exists
    }
  }
  try {
    await adapter.execute(`ALTER TABLE ${permissions} DROP COLUMN type`, []);
  } catch {
    // column already dropped, or the engine cannot drop it
  }
  await dropPermissionCode(adapter, type, prefix);
}

/** Path previously encoded in a permission code (`route:/x` or `api:METHOD:/x`). */
export function pathFromLegacyPermissionCode(code: string): string | null {
  const c = (code ?? "").trim();
  if (c.startsWith("route:")) {
    return normalizeLegacyPath(c.slice("route:".length));
  }
  const api = /^api:([A-Z]+|\*):(\/\S+)$/.exec(c);
  if (api) return normalizeLegacyPath(api[2]!);
  return normalizeLegacyPath(c.startsWith("/") ? c : "");
}

function normalizeLegacyPath(input: string): string | null {
  let pat = input.trim();
  if (!pat) return null;
  if (pat === "*") pat = "/*";
  if (!pat.startsWith("/")) return null;
  return pat.replace(/\/{2,}/g, "/");
}

function asRouteList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // stored as a single path
    }
    return value.startsWith("[") ? [] : [value];
  }
  return [];
}

function uniqueRoutes(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Backfill routeAllows from leftover code, then drop the permission code field. */
export async function dropPermissionCode(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  prefix = DEFAULT_TABLE_PREFIX,
): Promise<void> {
  const name = `${prefix}permissions`;
  if (type === "mongodb") {
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
    } | undefined;
    const col = db?.collection?.(name);
    if (!col) return;
    try {
      await col.dropIndex?.("code_1");
    } catch {
      // index may not exist
    }
    const docs = await col.find({}).toArray().catch(() => []);
    for (const doc of docs) {
      const id = doc._id ?? doc.id;
      if (id == null) continue;
      const code = typeof doc.code === "string" ? doc.code : "";
      const fromCode = code ? pathFromLegacyPermissionCode(code) : null;
      const current = uniqueRoutes([
        ...asRouteList(doc.routeAllows),
        ...asRouteList(doc.route_allows),
      ]);
      const routeAllows = uniqueRoutes(
        fromCode ? [...current, fromCode] : current,
      );
      const patch: Record<string, unknown> = { $unset: { code: "" } };
      if (fromCode && !current.includes(fromCode)) {
        if ("routeAllows" in doc || !("route_allows" in doc)) {
          patch.$set = { routeAllows };
        } else {
          patch.$set = { route_allows: JSON.stringify(routeAllows) };
        }
      }
      if (!code && !("$set" in patch)) continue;
      await col.updateOne({ _id: id }, patch);
    }
    return;
  }
  try {
    const rows = await adapter.query(`SELECT * FROM ${name}`, []) as Array<
      Record<string, unknown>
    >;
    for (const row of rows) {
      const code = typeof row.code === "string" ? row.code : "";
      const fromCode = code ? pathFromLegacyPermissionCode(code) : null;
      if (!fromCode) continue;
      const current = asRouteList(row.route_allows ?? row.routeAllows);
      if (current.includes(fromCode)) continue;
      const next = uniqueRoutes([...current, fromCode]);
      const id = row.id ?? row._id;
      if (id == null) continue;
      await adapter.execute(
        `UPDATE ${name} SET route_allows = ? WHERE id = ?`,
        [JSON.stringify(next), String(id)],
      );
    }
  } catch {
    // table or column may not exist yet
  }
  try {
    await adapter.execute(`ALTER TABLE ${name} DROP COLUMN code`, []);
  } catch {
    // column already dropped, or the engine cannot drop it
  }
}
