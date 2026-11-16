/**
 * Resolve the RBAC store from plugin options: custom store, database config,
 * an existing adapter, or an in-memory store.
 */
import {
  createDatabaseManager,
  type DatabaseAdapter,
  type DatabaseType,
  getDatabaseAsync,
  isDatabaseInitialized,
} from "@dreamer/database";
import { createDatabaseRbacStore } from "./db-store.ts";
import { MemoryRbacStore } from "./memory-store.ts";
import { DEFAULT_TABLE_PREFIX } from "../models/mod.ts";
import type {
  RbacDatabaseType,
  RbacPluginOptions,
  RbacStore,
} from "../types.ts";

export interface ResolvedStore {
  store: RbacStore;
  /** Close a connection opened by the plugin itself. */
  close?: () => Promise<void>;
}

export async function resolveRbacStore(
  options: Pick<
    RbacPluginOptions,
    | "store"
    | "database"
    | "adapter"
    | "databaseType"
    | "connectionName"
    | "tablePrefix"
  >,
): Promise<ResolvedStore> {
  const prefix = options.tablePrefix ?? DEFAULT_TABLE_PREFIX;

  if (options.store) {
    return { store: options.store };
  }

  if (options.database) {
    const manager = createDatabaseManager({ name: "rbac" });
    await manager.connect("default", options.database);
    const adapter = manager.getConnection("default");
    const store = await createDatabaseRbacStore(
      adapter,
      options.database.adapter,
      prefix,
    );
    return { store, close: () => manager.close() };
  }

  if (options.adapter) {
    const type = options.databaseType ?? inferAdapterType(options.adapter);
    const store = await createDatabaseRbacStore(options.adapter, type, prefix);
    return { store };
  }

  const connectionName = options.connectionName ?? "default";
  if (options.connectionName || isDatabaseInitialized()) {
    if (!options.databaseType) {
      throw new Error(
        "rbacPlugin: set databaseType when using an existing database connection",
      );
    }
    const adapter = await getDatabaseAsync(connectionName);
    const store = await createDatabaseRbacStore(
      adapter,
      options.databaseType,
      prefix,
    );
    return { store };
  }

  return { store: new MemoryRbacStore() };
}

export function inferAdapterType(adapter: DatabaseAdapter): DatabaseType {
  const name = adapter.constructor?.name ?? "";
  if (name.includes("Mongo")) return "mongodb";
  if (name.includes("MySQL") || name.includes("Mysql")) return "mysql";
  if (name.includes("Postgres") || name.includes("Postgre")) {
    return "postgresql";
  }
  if (name.includes("SQLite") || name.includes("Sqlite")) return "sqlite";
  throw new Error(
    "rbacPlugin: cannot infer database type from adapter; pass databaseType",
  );
}

export type { RbacDatabaseType };
