/**
 * Mongo-shaped RBAC store. Pass collection accessors; no driver is imported.
 */
import type {
  Assignment,
  ManagedRoute,
  Permission,
  RbacStore,
  Role,
} from "../types.ts";

export interface MongoLikeCursor<T> {
  toArray(): Promise<T[]>;
}

export interface MongoLikeCollection<T extends { id: string }> {
  find(filter?: Record<string, unknown>): Promise<T[]> | MongoLikeCursor<T>;
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  insertOne(doc: T): Promise<unknown>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ): Promise<unknown>;
  deleteOne(filter: Record<string, unknown>): Promise<unknown>;
}

export type MongoCollectionFactory = (
  name: string,
) => MongoLikeCollection<Record<string, unknown> & { id: string }>;

export interface MongoRbacStoreOptions {
  collection: MongoCollectionFactory;
  /** Prefix for collection names (default `rbac_`). */
  prefix?: string;
}

type Doc = Record<string, unknown> & { id: string };

export function mongoRbacStore(options: MongoRbacStoreOptions): RbacStore {
  const prefix = options.prefix ?? "rbac_";
  const roles = options.collection(`${prefix}roles`) as MongoLikeCollection<
    Role & Doc
  >;
  const permissions = options.collection(
    `${prefix}permissions`,
  ) as MongoLikeCollection<Permission & Doc>;
  const assignments = options.collection(
    `${prefix}assignments`,
  ) as MongoLikeCollection<Assignment & Doc>;
  const routes = options.collection(`${prefix}routes`) as MongoLikeCollection<
    ManagedRoute & Doc
  >;

  return {
    async listRoles() {
      return await findAll(roles);
    },
    async getRole(id) {
      return await roles.findOne({ id });
    },
    async getRoleByCode(code) {
      return await roles.findOne({ code });
    },
    async saveRole(role) {
      await upsert(roles, role.id, role);
      return role;
    },
    async removeRole(id) {
      await roles.deleteOne({ id });
    },
    async listPermissions() {
      return await findAll(permissions);
    },
    async getPermission(id) {
      return await permissions.findOne({ id });
    },
    async savePermission(permission) {
      await upsert(permissions, permission.id, permission);
      return permission;
    },
    async removePermission(id) {
      await permissions.deleteOne({ id });
    },
    async getAssignment(userId) {
      const hit = await assignments.findOne({ userId });
      return hit ??
        {
          userId,
          roleIds: [],
          permissionIds: [],
          routeAllows: [],
          routeExcludes: [],
          roleExcludes: [],
          permissionExcludes: [],
        };
    },
    async saveAssignment(assignment) {
      await assignments.updateOne(
        { userId: assignment.userId },
        { $set: assignment },
        { upsert: true },
      );
    },
    async listAssignments() {
      return await findAll(assignments);
    },
    async listRoutes() {
      return await findAll(routes);
    },
    async saveRoute(route) {
      await routes.updateOne(
        { path: route.path },
        { $set: { id: route.path, ...route } },
        { upsert: true },
      );
    },
    async removeRoute(path) {
      await routes.deleteOne({ path });
    },
  };
}

async function findAll<T>(col: MongoLikeCollection<T & Doc>): Promise<T[]> {
  const ret = col.find({});
  if (typeof (ret as MongoLikeCursor<T>).toArray === "function") {
    return await (ret as MongoLikeCursor<T>).toArray();
  }
  return await (ret as Promise<T[]>);
}

async function upsert<T extends { id: string }>(
  col: MongoLikeCollection<T & Doc>,
  id: string,
  doc: T,
): Promise<void> {
  await col.updateOne({ id }, { $set: doc }, { upsert: true });
}
