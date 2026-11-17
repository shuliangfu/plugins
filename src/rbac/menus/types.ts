/**
 * Stored sidebar menus and the host-facing seed / list shapes.
 */
export type MenuStatus = "active" | "disabled";

/** One stored menu row. `title` keeps locale records. */
export interface MenuRecord {
  /** Storage id when the adapter has one (Mongo `_id` or SQL `id`). */
  id?: string;
  key: string;
  parentKey: string;
  title: Record<string, string>;
  path: string;
  permission?: string;
  icon: string;
  sort: number;
  status: MenuStatus;
}

export interface SeedMenu {
  key: string;
  parentKey: string;
  title: Record<string, string>;
  path: string;
  permission?: string;
  icon: string;
  sort: number;
  status: MenuStatus;
}

export interface MenuListQuery {
  page: number;
  pageSize: number;
  sort: string;
  order: 1 | -1;
  filters: { keyword?: string; path?: string; parentKey?: string };
}

export type MenuRow = Record<string, unknown>;

export type MenuFail = {
  ok: false;
  error: string;
  message: string;
  fields?: string[];
};
export type MenuOk = { ok: true };
export type MenuResult = MenuOk | MenuFail;

export interface MenuStore {
  listMenus(): Promise<MenuRecord[]>;
  getMenuByKey(key: string): Promise<MenuRecord | null>;
  createMenu(menu: MenuRecord): Promise<MenuRecord>;
  updateMenuByKey(key: string, patch: Partial<MenuRecord>): Promise<void>;
  removeMenuByKey(key: string): Promise<void>;
}

/** Default collection / table name, compatible with existing senvis data. */
export const DEFAULT_MENU_COLLECTION = "menus";
