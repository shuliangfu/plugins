/**
 * Menu CRUD under the plugin API base, e.g. `/api/rbac/menus`.
 * Developer-only by default.
 */
import type { RequestContext } from "@dreamer/plugin";
import type { RbacService } from "../service/service.ts";
import { allMenuRows, parseMenuListQuery } from "./service.ts";
import type { MenuFail } from "./types.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function fail(r: MenuFail, status = 400): Response {
  return json(
    { ok: false, error: r.error, message: r.message, fields: r.fields },
    status,
  );
}

async function readBody(
  ctx: RequestContext,
): Promise<Record<string, unknown>> {
  if (ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)) {
    return ctx.body as Record<string, unknown>;
  }
  try {
    const body = await ctx.request?.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

function queryOf(ctx: RequestContext): URLSearchParams {
  if (ctx.url) return ctx.url.searchParams;
  const path = ctx.path || "/";
  try {
    return new URL(path, "http://localhost").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

async function localeOf(
  ctx: RequestContext,
  service: RbacService,
): Promise<string> {
  const getLocale = service.menu.options.getLocale;
  if (getLocale) return await getLocale(ctx);
  return "zh-CN";
}

export async function requireMenuDeveloper(
  ctx: RequestContext,
  service: RbacService,
): Promise<Response | undefined> {
  if (!service.menu.requireDeveloper) return;
  const user = await service.getUser(ctx);
  if (!user) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  const access = await service.getAccess(user);
  if (!access.isDeveloper) {
    return json({ ok: false, error: "forbidden" }, 403);
  }
}

export async function handleMenuApi(
  ctx: RequestContext,
  service: RbacService,
  rel: string,
  method: string,
): Promise<Response | null> {
  if (rel !== "/menus" && !rel.startsWith("/menus/")) return null;
  const denied = await requireMenuDeveloper(ctx, service);
  if (denied) return denied;

  const menus = service.menu;
  const restful = service.apiMode === "restful";
  const sub = rel.slice("/menus".length) || "/";
  const locale = await localeOf(ctx, service);

  if (method === "GET" && (sub === "/" || sub === "/index")) {
    const params = queryOf(ctx);
    const parsed = parseMenuListQuery(params);
    const q = params.get("export") === "1" ? allMenuRows(parsed) : parsed;
    const r = await menus.listMenuRows(q, locale);
    return json({ rows: r.rows, total: r.total });
  }
  if (
    method === "GET" && (sub === "/view" || (restful && /^\/[^/]+$/.test(sub)))
  ) {
    const id = (
      queryOf(ctx).get("id") ??
        queryOf(ctx).get("key") ??
        (restful && sub !== "/" ? sub.slice(1) : "")
    ).trim();
    if (!id) return json({ message: "缺少 id" }, 400);
    const row = await menus.getMenuByKey(id, locale);
    if (!row) return json({ message: "菜单不存在" }, 404);
    return json(row);
  }
  if (
    (method === "POST" && sub === "/create") ||
    (restful && method === "POST" && sub === "/")
  ) {
    const body = await readBody(ctx);
    if (Array.isArray((body as { rows?: unknown }).rows)) {
      const rows = (body as { rows: Record<string, unknown>[] }).rows;
      let created = 0;
      for (const row of rows) {
        const r = await menus.createMenu(row);
        if (r.ok) created++;
      }
      return json(
        { created, failed: rows.length - created },
        created ? 201 : 400,
      );
    }
    const r = await menus.createMenu(body);
    return r.ok ? json({ ok: true }, 201) : fail(r);
  }
  if (
    (method === "POST" && sub === "/update") ||
    (restful && method === "PUT" && /^\/[^/]+$/.test(sub))
  ) {
    const body = await readBody(ctx);
    const key = restful && sub !== "/"
      ? sub.slice(1)
      : String(body.id ?? body.key ?? "");
    const r = await menus.updateMenu(key, body);
    return r.ok
      ? json({ ok: true })
      : fail(r, r.error === "notFound" ? 404 : 400);
  }
  if (
    (method === "POST" && sub === "/remove") ||
    (restful && method === "DELETE" && (sub === "/" || /^\/[^/]+$/.test(sub)))
  ) {
    const body = await readBody(ctx);
    const ids = restful && /^\/[^/]+$/.test(sub)
      ? [sub.slice(1)]
      : Array.isArray(body.ids)
      ? body.ids.map(String).filter(Boolean).slice(0, 1000)
      : String(body.id ?? body.key ?? "")
      ? [String(body.id ?? body.key)]
      : [];
    const failed: string[] = [];
    let removed = 0;
    for (const key of ids) {
      const r = await menus.deleteMenu(key);
      if (r.ok) removed++;
      else failed.push(key);
    }
    return json({ removed, failed });
  }
  if (method === "POST" && sub === "/set-field") {
    const body = await readBody(ctx);
    const field = String(body.field ?? "").trim();
    const ids = menuIdsFrom(ctx, body);
    const allowed = new Set([
      "parentKey",
      "title",
      "titleZh",
      "titleEn",
      "path",
      "icon",
      "sort",
      "permission",
      "status",
    ]);
    if (!ids.length || !allowed.has(field)) {
      return json(
        {
          removed: 0,
          failed: ids.map((id) => ({
            id,
            error: !ids.length ? "缺少 id" : "unknown field",
          })),
        },
        400,
      );
    }
    const failed: { id: string; error: string }[] = [];
    let removed = 0;
    for (const key of ids) {
      const r = await menus.updateMenu(key, { [field]: body.value });
      if (r.ok) removed++;
      else failed.push({ id: key, error: r.message ?? r.error });
    }
    return json({ ok: failed.length === 0, removed, failed });
  }
  return json({ ok: false, error: "not_found" }, 404);
}

function menuIdsFrom(
  ctx: RequestContext,
  body: Record<string, unknown>,
): string[] {
  if (Array.isArray(body.ids)) {
    return body.ids.map(String).filter(Boolean).slice(0, 1000);
  }
  const one = String(body.id ?? body.key ?? "").trim();
  if (one) return [one];
  return queryOf(ctx).getAll("id").map((id) => id.trim()).filter(Boolean)
    .slice(0, 1000);
}
