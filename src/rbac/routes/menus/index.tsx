import type { JSXRenderable } from "@dreamer/view";
/**
 * Developer menu list DataPanel. Auto-mounted at the configured page path.
 */
import {
  Badge,
  Breadcrumb,
  Button,
  type Column,
  DataPanel,
  Link,
  type Row,
} from "@dreamer/ui-view";
import { resolveRbacApi } from "../api-path.ts";
import type { RbacPanelProps } from "../types.ts";
import type { ServiceContainer } from "@dreamer/service";
import { getRbacService } from "../../service/runtime.ts";
import { listQueryFrom, type ListQuerySource } from "../../list-query.ts";
import { parseMenuListQuery } from "../../menus/service.ts";

/** Route metadata used to generate <title> / <meta>. */
export const metadata = {
  title: "菜单管理",
  description: "Menu management",
};

export type MenusPageData = {
  parentKey: string;
  parents: { value: string; label: string }[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS = [
  { value: "active", label: "显示", tone: "success" as const },
  { value: "disabled", label: "隐藏", tone: "default" as const },
];

function currentPagePath(): string {
  const loc = (globalThis as { location?: { pathname?: string } }).location;
  const path = loc?.pathname ?? "/rbac/menus";
  return path.replace(/\/+$/, "") || "/rbac/menus";
}

function goMenus(parentKey?: string): void {
  const g = globalThis as unknown as {
    location?: { assign: (u: string) => void };
  };
  if (!g.location?.assign) return;
  const q = parentKey ? `?parentKey=${encodeURIComponent(parentKey)}` : "";
  g.location.assign(`${currentPagePath()}${q}`);
}

const TOP_HINT_CLOSE_KEY = "rbac-menus-top-hint";
const TOP_HINT_MESSAGE = "默认只显示顶级菜单，点击标题进入下级。";

export default function MenusPage(
  props: RbacPanelProps & { data?: MenusPageData } & Partial<MenusPageData> =
    {},
): JSXRenderable {
  const d: Partial<MenusPageData> = props.data ?? props;
  const parentKey = d.parentKey ?? "";
  const parentOptions = [
    { value: "", label: "顶级菜单" },
    ...(d.parents ?? []),
  ];
  const pagePath = currentPagePath();
  const api = `${resolveRbacApi(props.baseRoute)}/menus`;

  const columns: Column[] = [
    {
      prop: "title",
      label: "标题",
      sortable: true,
      minWidth: 150,
      value: (row: Row) => {
        const label = String(row.title ?? "");
        const n = Number(row.childCount ?? 0);
        const canDrill = n > 0 || !String(row.path ?? "").trim();
        if (!canDrill) return label;
        const href = `${pagePath}?parentKey=${
          encodeURIComponent(String(row.key))
        }`;
        return (
          <span
            class="inline-flex min-w-0 items-center gap-2"
            data-testid="menus-enter-title"
          >
            <Link
              href={href}
              underline
              class="cursor-pointer font-medium"
              title="进入下级菜单"
              onClick={(e: Event) => {
                e.preventDefault();
                goMenus(String(row.key));
              }}
            >
              {label}
            </Link>
            <Badge size="xs" variant="ghost" count={n} />
          </span>
        );
      },
    },
    { prop: "parentTitle", label: "上级", minWidth: 120 },
    { prop: "path", label: "路径", sortable: true, minWidth: 180 },
    {
      prop: "icon",
      label: "图标",
      align: "center",
      width: 80,
      value: (row: Row) => String(row.icon ?? ""),
    },
    {
      prop: "sort",
      label: "排序",
      type: "number",
      sortable: true,
      edit: true,
      align: "center",
      inline: "number",
      width: 80,
    },
    {
      prop: "status",
      label: "显示",
      type: "tag",
      inline: "switch",
      align: "center",
      options: STATUS,
      sortable: true,
    },
    {
      type: "actions",
      width: 200,
      actions: { view: true, edit: true, remove: true },
    },
  ];

  return (
    <div class="flex min-w-0 flex-col">
      {parentKey
        ? (
          <div
            class="mb-2 flex min-w-0 flex-wrap items-center gap-3"
            data-testid="menus-drill"
          >
            <Breadcrumb
              items={[
                {
                  label: "菜单管理",
                  onClick: (e: Event) => {
                    e.preventDefault();
                    goMenus();
                  },
                },
              ]}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="menus-back-top"
              onClick={() => goMenus()}
            >
              返回顶级
            </Button>
          </div>
        )
        : null}
      <DataPanel
        panelKey="menus"
        alert={parentKey ? false : {
          message: TOP_HINT_MESSAGE,
          key: "menus-top-hint",
          closeConfirm: "关闭后将不再提示",
          closeKey: TOP_HINT_CLOSE_KEY,
        }}
        data={d.rows ?? []}
        title="菜单列表"
        columns={columns}
        search={{
          props: [
            { prop: "keyword", label: "标题" },
            { prop: "path", label: "路径" },
            {
              prop: "parentKey",
              label: "上级",
              type: "select" as const,
              options: parentOptions,
            },
          ],
        }}
        form={{
          title: (row?: Row) => row?.id ? "修改菜单" : "添加菜单",
          props: [
            {
              prop: "key",
              label: "标识",
              required: true,
              createOnly: true,
              pattern: "^[a-z][a-z0-9_.-]{0,63}$",
              placeholder: "例如 users.wearing",
            },
            {
              prop: "parentKey",
              label: "上级菜单",
              type: "select" as const,
              options: parentOptions,
              initial: parentKey || undefined,
            },
            { prop: "titleZh", label: "中文标题", max: 64 },
            { prop: "titleEn", label: "英文标题", max: 64 },
            { prop: "path", label: "路径", max: 200, placeholder: "/users" },
            { prop: "icon", label: "图标", max: 32, initial: "star" },
            {
              prop: "sort",
              label: "排序",
              type: "number" as const,
              initial: 100,
            },
            {
              prop: "status",
              label: "显示",
              type: "select" as const,
              options: STATUS,
              initial: "active",
            },
          ],
        }}
        view={{
          title: "菜单明细",
          props: [
            { prop: "title", label: "标题" },
            { prop: "parentTitle", label: "上级" },
            { prop: "path", label: "路径" },
            { prop: "icon", label: "图标" },
            { prop: "sort", label: "排序" },
            { prop: "status", label: "显示", type: "tag", options: STATUS },
          ],
        }}
        toolbar={{
          create: true,
          search: true,
          refresh: true,
          export: true,
          fullscreen: true,
          copy: true,
          print: false,
          import: false,
          columns: false,
          density: false,
        }}
        baseRoute={api}
        apiMode={props.apiMode === "restful" ? "restful" : "action"}
        apiCredentials="same-origin"
        defaultSort={{ prop: "sort", order: "asc" }}
        fixed={parentKey ? { parentKey } : undefined}
        class="adm-data-panel adm-panel-card"
        pagination={{
          page: d.page ?? 1,
          pageSize: d.pageSize ?? 20,
          total: d.total ?? 0,
        }}
      />
    </div>
  );
}

export async function load(
  ctx: ListQuerySource & { container: ServiceContainer },
) {
  const service = getRbacService(ctx.container);
  const raw = ctx.url;
  const params = (() => {
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
  const result = await service.menu.listMenuRows({
    ...parseMenuListQuery(params),
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
