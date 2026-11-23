/**
 * Menu stores: memory, or the same @dreamer/database adapter as RBAC.
 */
import {
  type DatabaseAdapter,
  type DatabaseType,
  type ModelSchema,
  MongoModel,
  SQLModel,
} from "@dreamer/database";
import {
  DEFAULT_MENU_COLLECTION,
  type MenuRecord,
  type MenuStatus,
  type MenuStore,
} from "./types.ts";

function asTitle(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (
      const [key, item] of Object.entries(value as Record<string, unknown>)
    ) {
      if (typeof item === "string") out[key] = item;
    }
    return out;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return asTitle(parsed);
      }
    } catch {
      return { "zh-CN": value };
    }
  }
  return {};
}

function asStatus(value: unknown): MenuStatus {
  return value === "disabled" ? "disabled" : "active";
}

function fromDoc(doc: Record<string, unknown>): MenuRecord {
  const key = String(doc.key ?? "");
  const id = doc._id ?? doc.id;
  return {
    id: id != null ? String(id) : undefined,
    key,
    parentKey: String(doc.parentKey ?? doc.parent_key ?? ""),
    title: asTitle(doc.title),
    path: String(doc.path ?? ""),
    permission: doc.permission != null ? String(doc.permission) : "",
    icon: String(doc.icon ?? "star") || "star",
    sort: typeof doc.sort === "number"
      ? doc.sort
      : Number.parseInt(String(doc.sort ?? "0"), 10) || 0,
    status: asStatus(doc.status),
  };
}

export class MemoryMenuStore implements MenuStore {
  #rows = new Map<string, MenuRecord>();

  listMenus(): Promise<MenuRecord[]> {
    return Promise.resolve(
      [...this.#rows.values()]
        .map((row) => ({ ...row, title: { ...row.title } }))
        .sort((a, b) => (a.sort - b.sort) || a.key.localeCompare(b.key)),
    );
  }

  getMenuByKey(key: string): Promise<MenuRecord | null> {
    const row = this.#rows.get(key);
    return Promise.resolve(row ? { ...row, title: { ...row.title } } : null);
  }

  createMenu(menu: MenuRecord): Promise<MenuRecord> {
    const row = { ...menu, title: { ...menu.title } };
    this.#rows.set(row.key, row);
    return Promise.resolve({ ...row, title: { ...row.title } });
  }

  updateMenuByKey(
    key: string,
    patch: Partial<MenuRecord>,
  ): Promise<void> {
    const current = this.#rows.get(key);
    if (!current) return Promise.resolve();
    const next: MenuRecord = {
      ...current,
      ...patch,
      key: current.key,
      title: patch.title ? { ...patch.title } : { ...current.title },
    };
    this.#rows.set(key, next);
    return Promise.resolve();
  }

  removeMenuByKey(key: string): Promise<void> {
    this.#rows.delete(key);
    return Promise.resolve();
  }
}

const menuSchema = {
  key: { type: "string", validate: { required: true } },
  parentKey: { type: "string", default: "" },
  title: { type: "json", default: {} },
  path: { type: "string", default: "" },
  permission: { type: "string", default: "" },
  icon: { type: "string", default: "star" },
  sort: { type: "number", default: 0 },
  status: { type: "string", default: "active" },
} satisfies ModelSchema;

export async function createDatabaseMenuStore(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  collection = DEFAULT_MENU_COLLECTION,
): Promise<MenuStore> {
  if (type !== "mongodb") {
    await ensureMenuTable(adapter, type, collection);
  }
  const Model = type === "mongodb"
    ? class RbacMenu extends MongoModel {
      static override collectionName = collection;
      static override schema = menuSchema as (typeof MongoModel)["schema"];
      static override timestamps = true;
    }
    : class RbacMenu extends SQLModel {
      static override tableName = collection;
      static override primaryKey = "id";
      static override schema = {
        id: { type: "string", validate: { required: true } },
        ...menuSchema,
      } satisfies ModelSchema;
    };
  Model.setAdapter(adapter);
  const model = Model as unknown as {
    findAll: (
      filter?: Record<string, unknown>,
      fields?: unknown,
      options?: { sort?: Record<string, number> },
    ) => Promise<Record<string, unknown>[]>;
    findOne: (filter: Record<string, unknown>) => Promise<
      Record<string, unknown> | null
    >;
    create: (data: Record<string, unknown>) => Promise<unknown>;
    updateById: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deleteById: (id: string) => Promise<unknown>;
  };

  return {
    async listMenus() {
      const rows =
        (await model.findAll({}, undefined, { sort: { sort: 1 } })) ??
          [];
      return rows.map(fromDoc).sort((a, b) =>
        (a.sort - b.sort) || a.key.localeCompare(b.key)
      );
    },
    async getMenuByKey(key) {
      const row = await model.findOne({ key });
      return row ? fromDoc(row) : null;
    },
    async createMenu(menu) {
      const data: Record<string, unknown> = {
        key: menu.key,
        parentKey: menu.parentKey,
        title: menu.title,
        path: menu.path,
        permission: menu.permission ?? "",
        icon: menu.icon,
        sort: menu.sort,
        status: menu.status,
      };
      if (type !== "mongodb") data.id = menu.id ?? menu.key;
      await model.create(data);
      return menu;
    },
    async updateMenuByKey(key, patch) {
      const row = await model.findOne({ key });
      if (!row) return;
      const id = row._id ?? row.id;
      if (id == null) return;
      const data: Record<string, unknown> = { ...patch };
      delete data.id;
      delete data.key;
      await model.updateById(String(id), data);
    },
    async removeMenuByKey(key) {
      const row = await model.findOne({ key });
      if (!row) return;
      const id = row._id ?? row.id;
      if (id == null) return;
      await model.deleteById(String(id));
    },
  };
}

async function ensureMenuTable(
  adapter: DatabaseAdapter,
  type: DatabaseType,
  table: string,
): Promise<void> {
  const idType = type === "mysql" ? "VARCHAR(64)" : "TEXT";
  const nameType = type === "mysql" ? "VARCHAR(255)" : "TEXT";
  await adapter.execute(
    `CREATE TABLE IF NOT EXISTS ${table} (
      id ${idType} PRIMARY KEY,
      key ${nameType} NOT NULL UNIQUE,
      parentKey ${nameType} NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      path ${nameType} NOT NULL DEFAULT '',
      permission ${nameType} NOT NULL DEFAULT '',
      icon ${nameType} NOT NULL DEFAULT 'star',
      sort INT NOT NULL DEFAULT 0,
      status ${idType} NOT NULL DEFAULT 'active'
    )`,
    [],
  );
}

export { DEFAULT_MENU_COLLECTION };
