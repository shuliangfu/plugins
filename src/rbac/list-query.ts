/**
 * Shared list pagination for the RBAC JSON API and page `load` functions.
 * Size priority matches DataPanel: URL `pageSize` ＞ cookie ＞ 20.
 */
import { resolvePageSize } from "@dreamer/ui-view";

export type ListQuerySource = {
  url?: string | URL;
  query?: Record<string, string> | URLSearchParams;
  cookies?: Record<string, string> | string;
  headers?: { get(name: string): string | null };
  request?: { url?: string; headers?: { get(name: string): string | null } };
  req?: { url?: string; headers?: { get(name: string): string | null } };
};

export type ListQuery = {
  q: string;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
};

export type PagedList<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
};

function searchParams(source: ListQuerySource): URLSearchParams {
  if (source.query instanceof URLSearchParams) {
    return new URLSearchParams(source.query);
  }
  if (source.query && typeof source.query === "object") {
    return new URLSearchParams(source.query);
  }
  const raw = source.url ?? source.req?.url ?? source.request?.url;
  if (raw instanceof URL) return new URLSearchParams(raw.search);
  if (typeof raw === "string" && raw) {
    try {
      return new URL(raw, "http://local").searchParams;
    } catch {
      return new URLSearchParams();
    }
  }
  return new URLSearchParams();
}

function cookieHeader(source: ListQuerySource): string | undefined {
  if (typeof source.cookies === "string") return source.cookies;
  if (source.cookies && typeof source.cookies === "object") {
    return Object.entries(source.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
  return source.headers?.get("cookie") ??
    source.req?.headers?.get("cookie") ??
    source.request?.headers?.get("cookie") ??
    undefined;
}

/** Parse `page` / `pageSize` / `q` from the request, matching DataPanel. */
export function listQueryFrom(
  source: ListQuerySource,
  fallbackPageSize = 20,
): ListQuery {
  const params = searchParams(source);
  const q = (params.get("q") ?? "").trim();
  const pageRaw = Number(params.get("page") || 1);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1
    ? Math.trunc(pageRaw)
    : 1;
  const pageSize = resolvePageSize({
    urlPageSize: params.get("pageSize"),
    cookieSource: cookieHeader(source),
    fallback: fallbackPageSize,
  });
  return { q, page, pageSize, filters: q ? { q } : {} };
}

/** Filter and slice a full list using the same `q` / page rules as the API. */
export function paginateItems<T>(
  items: T[],
  query: ListQuery,
  keys: (item: T) => string[],
): PagedList<T> {
  const needle = query.q.toLowerCase();
  const filtered = needle
    ? items.filter((item) =>
      keys(item).some((key) => key.toLowerCase().includes(needle))
    )
    : items;
  const start = (query.page - 1) * query.pageSize;
  return {
    rows: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    filters: query.filters,
  };
}
