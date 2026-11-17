/**
 * Menu seed, CRUD, listing, and access-filtered trees.
 */
import type { RequestContext } from "@dreamer/plugin";
import type { MenuItem, RbacAccess } from "../types.ts";
import type { RbacService } from "../service/service.ts";
import type {
  MenuFail,
  MenuListQuery,
  MenuRecord,
  MenuResult,
  MenuRow,
  MenuStatus,
  MenuStore,
  SeedMenu,
} from "./types.ts";

const STATUS: MenuStatus[] = ["active", "disabled"];
const KEY_RE = /^[a-z][a-z0-9_.-]{0,63}$/;
const PAGE_SIZES = [10, 20, 30, 40, 50, 100];
const EXPORT_LIMIT = 50000;

const MESSAGES: Record<string, string> = {
  invalid: "填写内容不对",
  menuExists: "菜单标识已存在",
  notFound: "菜单不存在",
  onlyTwoLevels: "菜单最多两级",
  hasChildren: "请先删除下级菜单",
};

export interface MenuServiceOptions {
  seed?: readonly SeedMenu[];
  structureSyncKeys?: readonly string[];
  retiredKeys?: readonly string[];
  pagePath?: string;
  requireDeveloper?: boolean;
  getLocale?: (
    ctx: RequestContext | Record<string, unknown>,
  ) => string | Promise<string>;
  prepareMenuItem?: (
    item: MenuRecord,
    ctx: { locale?: string; access: RbacAccess },
  ) => MenuItem | Promise<MenuItem>;
}

export function pickLocalized(
  title: Record<string, string> | undefined,
  locale: string | undefined,
  fallback: string,
): string {
  if (!title) return fallback;
  if (locale && title[locale]) return title[locale]!;
  return title["zh-CN"] || title["en-US"] || Object.values(title)[0] ||
    fallback;
}

export function parseMenuListQuery(params: URLSearchParams): MenuListQuery {
  const int = (k: string, d: number) => {
    const v = Number.parseInt(params.get(k) ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const page = Math.min(int("page", 1), 1_000_000);
  const reqSize = int("pageSize", 20);
  const pageSize = PAGE_SIZES.includes(reqSize) ? reqSize : 20;
  const sortable = new Set(["title", "path", "sort", "key", "status"]);
  let sort = params.get("sort") ?? "sort";
  let order: 1 | -1 = params.get("order") === "desc" ? -1 : 1;
  if (!sortable.has(sort)) {
    sort = "sort";
    order = 1;
  }
  const filters: MenuListQuery["filters"] = {};
  const keyword = (params.get("keyword") ?? "").trim().slice(0, 128);
  const path = (params.get("path") ?? "").trim().slice(0, 128);
  if (keyword) filters.keyword = keyword;
  if (path) filters.path = path;
  if (params.has("parentKey")) {
    filters.parentKey = (params.get("parentKey") ?? "").trim();
  }
  return { page, pageSize, sort, order, filters };
}

export function allMenuRows(q: MenuListQuery): MenuListQuery {
  return { ...q, page: 1, pageSize: EXPORT_LIMIT };
}

function fail(error: string, fields?: string[]): MenuFail {
  return {
    ok: false,
    error,
    message: MESSAGES[error] ?? error,
    ...(fields ? { fields } : {}),
  };
}

function readStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function menuBody(body: Record<string, unknown>): {
  key?: string;
  parentKey: string;
  title: Record<string, string>;
  path: string;
  permission: string;
  icon: string;
  sort: number;
  status?: string;
} {
  const titleIn = body.title;
  const titleZh = readStr(
    body.titleZh ??
      (titleIn && typeof titleIn === "object"
        ? (titleIn as Record<string, unknown>)["zh-CN"]
        : ""),
    64,
  );
  const titleEn = readStr(
    body.titleEn ??
      (titleIn && typeof titleIn === "object"
        ? (titleIn as Record<string, unknown>)["en-US"]
        : ""),
    64,
  );
  const sortRaw = body.sort;
  const sort = typeof sortRaw === "number"
    ? sortRaw
    : Number.parseInt(String(sortRaw ?? "100"), 10);
  return {
    key: body.key !== undefined ? readStr(body.key, 64) : undefined,
    parentKey: readStr(body.parentKey, 64),
    title: { "zh-CN": titleZh, "en-US": titleEn },
    path: readStr(body.path, 200),
    permission: readStr(body.permission, 64),
    icon: readStr(body.icon, 32) || "star",
    sort: Number.isFinite(sort) ? sort : 100,
    status: body.status !== undefined ? readStr(body.status, 16) : undefined,
  };
}

function toMenuItem(
  record: MenuRecord,
  locale: string | undefined,
): MenuItem {
  return {
    key: record.key,
    title: pickLocalized(record.title, locale, record.key),
    path: record.path || undefined,
    permission: record.permission || undefined,
    icon: record.icon ?? "star",
    parentKey: record.parentKey || undefined,
    sort: record.sort,
    status: record.status,
  };
}

export class MenuManager {
  readonly store: MenuStore;
  readonly options: MenuServiceOptions;
  readonly rbac: RbacService;

  constructor(
    store: MenuStore,
    options: MenuServiceOptions,
    rbac: RbacService,
  ) {
    this.store = store;
    this.options = options;
    this.rbac = rbac;
  }

  get pagePath(): string {
    return this.options.pagePath ?? "/developer/menus";
  }

  get requireDeveloper(): boolean {
    return this.options.requireDeveloper !== false;
  }

  async listAll(): Promise<MenuRecord[]> {
    return await this.store.listMenus();
  }

  async seed(): Promise<{ created: number; updated: number }> {
    const items = this.options.seed ?? [];
    const syncKeys = new Set(this.options.structureSyncKeys ?? []);
    const retired = this.options.retiredKeys ?? [];
    const existing = await this.store.listMenus();
    const byKey = new Map(existing.map((row) => [row.key, row]));
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const row = byKey.get(item.key);
      if (!row) {
        const createdRow: MenuRecord = {
          key: item.key,
          parentKey: item.parentKey,
          title: { ...item.title },
          path: item.path,
          permission: item.permission ?? "",
          icon: item.icon,
          sort: item.sort,
          status: item.status,
        };
        await this.store.createMenu(createdRow);
        byKey.set(item.key, createdRow);
        created++;
        continue;
      }
      if (!syncKeys.has(item.key)) continue;
      if (
        (row.parentKey ?? "") === item.parentKey &&
        (row.path ?? "") === item.path &&
        (row.permission ?? "") === (item.permission ?? "") &&
        row.sort === item.sort &&
        row.status === item.status
      ) {
        continue;
      }
      await this.store.updateMenuByKey(item.key, {
        parentKey: item.parentKey,
        path: item.path,
        permission: item.permission ?? "",
        sort: item.sort,
        status: item.status,
      });
      updated++;
    }
    for (const key of retired) {
      const row = byKey.get(key);
      if (!row || row.status === "disabled") continue;
      await this.store.updateMenuByKey(key, { status: "disabled" });
      updated++;
    }
    return { created, updated };
  }

  async loadForAccess(
    access: RbacAccess,
    locale?: string,
    prepare?: (
      item: MenuRecord,
      ctx: { locale?: string; access: RbacAccess },
    ) => MenuItem | Promise<MenuItem>,
  ): Promise<MenuItem[]> {
    const hook = prepare ?? this.options.prepareMenuItem;
    const items: MenuItem[] = [];
    for (const record of await this.store.listMenus()) {
      items.push(
        hook
          ? await hook(record, { locale, access })
          : toMenuItem(record, locale),
      );
    }
    return this.rbac.filterMenus(access, items);
  }

  async listMenuRows(
    q: MenuListQuery,
    locale = "zh-CN",
  ): Promise<{ rows: MenuRow[]; total: number }> {
    const all = await this.store.listMenus();
    const byKey = new Map(all.map((m) => [m.key, m]));
    const childCount = new Map<string, number>();
    for (const m of all) {
      if (!m.parentKey) continue;
      childCount.set(m.parentKey, (childCount.get(m.parentKey) ?? 0) + 1);
    }
    let rows: MenuRow[] = all.map((m) => ({
      id: m.key,
      key: m.key,
      parentKey: m.parentKey ?? "",
      parentTitle: m.parentKey
        ? pickLocalized(byKey.get(m.parentKey)?.title, locale, m.parentKey)
        : "",
      title: pickLocalized(m.title, locale, m.key),
      titles: m.title,
      titleZh: m.title?.["zh-CN"] ?? "",
      titleEn: m.title?.["en-US"] ?? "",
      path: m.path ?? "",
      permission: m.permission ?? "",
      icon: m.icon ?? "star",
      sort: m.sort ?? 0,
      status: m.status,
      childCount: childCount.get(m.key) ?? 0,
    }));
    const kw = q.filters.keyword?.toLowerCase();
    if (kw) {
      rows = rows.filter((r) =>
        String(r.key).toLowerCase().includes(kw) ||
        String(r.title).toLowerCase().includes(kw)
      );
    }
    const pq = q.filters.path?.toLowerCase();
    if (pq) {
      rows = rows.filter((r) => String(r.path).toLowerCase().includes(pq));
    }
    if (!kw && !pq) {
      const pk = q.filters.parentKey;
      if (pk) rows = rows.filter((r) => String(r.parentKey) === pk);
      else rows = rows.filter((r) => !r.parentKey);
    }
    const prop = q.sort || "sort";
    rows.sort((a, b) => {
      const x = a[prop], y = b[prop];
      const c = typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x ?? "").localeCompare(String(y ?? ""));
      return (c || String(a.key).localeCompare(String(b.key))) * q.order;
    });
    const total = rows.length;
    const start = (q.page - 1) * q.pageSize;
    return { rows: rows.slice(start, start + q.pageSize), total };
  }

  async listParentOptions(
    locale = "zh-CN",
  ): Promise<{ value: string; label: string }[]> {
    const all = await this.store.listMenus();
    return all
      .filter((m) => !m.parentKey)
      .map((m) => ({
        value: m.key,
        label: pickLocalized(m.title, locale, m.key),
      }));
  }

  async getMenuByKey(
    key: string,
    locale = "zh-CN",
  ): Promise<MenuRow | null> {
    const id = key.trim();
    if (!id) return null;
    const r = await this.listMenuRows(
      allMenuRows(parseMenuListQuery(new URLSearchParams())),
      locale,
    );
    return r.rows.find((row) =>
      String(row.id) === id || String(row.key) === id
    ) ?? null;
  }

  async #checkParent(key: string, parentKey: string): Promise<string | null> {
    if (!parentKey) return null;
    if (parentKey === key) return "invalid";
    const parent = await this.store.getMenuByKey(parentKey);
    if (!parent) return "invalid";
    if (parent.parentKey) return "onlyTwoLevels";
    return null;
  }

  async createMenu(body: Record<string, unknown>): Promise<MenuResult> {
    const d = menuBody(body);
    const key = d.key ?? "";
    if (!KEY_RE.test(key)) return fail("invalid", ["key"]);
    if (await this.store.getMenuByKey(key)) return fail("menuExists", ["key"]);
    const bad = await this.#checkParent(key, d.parentKey);
    if (bad) return fail(bad, ["parentKey"]);
    const status = (d.status || "active") as MenuStatus;
    if (!STATUS.includes(status)) return fail("invalid", ["status"]);
    await this.store.createMenu({
      key,
      parentKey: d.parentKey,
      title: { "zh-CN": "", "en-US": "", ...d.title },
      path: d.path,
      permission: d.permission,
      icon: d.icon,
      sort: d.sort,
      status,
    });
    return { ok: true };
  }

  async updateMenu(
    key: string,
    body: Record<string, unknown>,
  ): Promise<MenuResult> {
    const id = String(key ?? "").trim();
    if (!id) return fail("notFound");
    const menu = await this.store.getMenuByKey(id);
    if (!menu) return fail("notFound");
    const d = menuBody(body);
    const patch: Partial<MenuRecord> = {};
    if (body.parentKey !== undefined) {
      const bad = await this.#checkParent(id, d.parentKey);
      if (bad) return fail(bad, ["parentKey"]);
      const children = (await this.store.listMenus()).some((row) =>
        row.parentKey === id
      );
      if (d.parentKey && children) return fail("onlyTwoLevels", ["parentKey"]);
      patch.parentKey = d.parentKey;
    }
    if (
      body.title !== undefined || body.titleZh !== undefined ||
      body.titleEn !== undefined
    ) {
      patch.title = { ...menu.title, ...d.title };
    }
    if (body.path !== undefined) patch.path = d.path;
    if (body.icon !== undefined) patch.icon = d.icon;
    if (body.sort !== undefined) patch.sort = d.sort;
    if (body.permission !== undefined) patch.permission = d.permission;
    if (d.status !== undefined) {
      if (!STATUS.includes(d.status as MenuStatus)) {
        return fail("invalid", ["status"]);
      }
      patch.status = d.status as MenuStatus;
    }
    await this.store.updateMenuByKey(id, patch);
    return { ok: true };
  }

  async deleteMenu(key: string): Promise<MenuResult> {
    const id = String(key ?? "").trim();
    if (!id) return fail("notFound");
    const menu = await this.store.getMenuByKey(id);
    if (!menu) return fail("notFound");
    const hasChildren = (await this.store.listMenus()).some((row) =>
      row.parentKey === id
    );
    if (hasChildren) return fail("hasChildren");
    await this.store.removeMenuByKey(id);
    return { ok: true };
  }
}
