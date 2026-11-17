/**
 * Server `load` for the auto-mounted menus admin page.
 */
import { listQueryFrom, type ListQuerySource } from "../list-query.ts";
import { getRbacService } from "../service/runtime.ts";
import { parseMenuListQuery } from "./service.ts";
import type { ServiceContainer } from "@dreamer/service";

export type MenusPageData = {
  parentKey: string;
  parents: { value: string; label: string }[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export type MenusPageLoadContext = ListQuerySource & {
  container: ServiceContainer;
};

export async function loadMenus(
  ctx: MenusPageLoadContext,
): Promise<MenusPageData> {
  const service = getRbacService(ctx.container);
  const params = (() => {
    const raw = ctx.url;
    if (raw instanceof URL) return raw.searchParams;
    if (typeof raw === "string" && raw) {
      try {
        return new URL(raw, "http://local").searchParams;
      } catch {
        return new URLSearchParams();
      }
    }
    return new URLSearchParams();
  })();
  const parentKey = params.get("parentKey") ?? "";
  const locale = service.menu.options.getLocale
    ? await service.menu.options.getLocale(ctx)
    : "zh-CN";
  const parents = await service.menu.listParentOptions(locale);
  const { page, pageSize } = listQueryFrom(ctx);
  const parsed = parseMenuListQuery(params);
  const result = await service.menu.listMenuRows({
    ...parsed,
    page,
    pageSize,
  }, locale);
  return {
    parentKey,
    parents,
    rows: result.rows,
    total: result.total,
    page,
    pageSize,
  };
}
