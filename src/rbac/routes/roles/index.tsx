import type { JSXRenderable } from "@dreamer/view";
/**
 * 角色列表 DataPanel。插件自动挂载。
 */
import {
  type Column,
  DataPanel,
  Descriptions,
  type Row,
} from "@dreamer/ui-view";
import { ChildrenTransfer } from "../children-transfer.tsx";
import { resolveRbacApi } from "../api-path.ts";
import type { RbacPanelProps } from "../types.ts";
import { listPanelProps, type RbacListPageData } from "../list-props.ts";
import { useCanManage } from "../use-can-manage.ts";
import type { ServiceContainer } from "@dreamer/service";
import { getRbacService } from "../../service/runtime.ts";
import { listRoleRows } from "../../catalog-rows.ts";
import {
  listQueryFrom,
  type ListQuerySource,
  paginateItems,
} from "../../list-query.ts";

/** Route metadata used to generate <title> / <meta>. */
export const metadata = {
  title: "角色列表",
  description: "Role list",
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSuperAdmin?: boolean;
  isSystem?: boolean;
  routeAllows?: string[];
};

function asRole(row: unknown): RoleRow {
  return row as RoleRow;
}

export default function RolesPage(
  props: RbacPanelProps & { data?: RbacListPageData } = {},
): JSXRenderable {
  const canManage = useCanManage(props);
  const columns: Column[] = [
    { type: "selection" },
    { prop: "name", label: "名称" },
    { prop: "code", label: "标识" },
    {
      prop: "description",
      label: "说明",
      align: "left",
      headerAlign: "center",
      formatter: (row) => asRole(row).description || "—",
    },
    {
      type: "actions",
      actions: {
        view: true,
        edit: { show: () => canManage.value },
        remove: { show: () => canManage.value },
      },
    },
  ];
  return (
    <DataPanel
      title="角色列表"
      panelKey="rbac-roles"
      baseRoute={props.baseRoute ?? "/api"}
      apiMode={props.apiMode === "restful" ? "restful" : "action"}
      apiCredentials="same-origin"
      rowKey="id"
      columns={columns}
      search={{
        props: [{ prop: "q", label: "名称", placeholder: "名称或标识" }],
      }}
      form={{
        props: [
          {
            prop: "code",
            label: "标识",
            required: true,
            createOnly: true,
            rules: [{ required: true, message: "请填写标识" }],
          },
          {
            prop: "name",
            label: "名称",
            required: true,
            rules: [{ required: true, message: "请填写名称" }],
          },
          { prop: "description", label: "说明", type: "textarea" as const },
        ],
      }}
      {...({ openViewAfterCreate: true } as object)}
      view={{
        modal: { fullscreenable: true },
        title: (row: Row) => `角色 · ${String(row.name ?? "")}`,
        actions: {
          edit: { show: () => canManage.value },
          remove: false,
          close: true,
        },
        render: (ctx: { row: Row }) => {
          const row = asRole(ctx.row);
          return (
            <div class="space-y-4">
              <Descriptions
                bordered
                column={1}
                size="sm"
                rows={[
                  { label: "名称", children: row.name },
                  { label: "标识", children: row.code },
                  { label: "说明", children: row.description || "—" },
                ]}
              />
              {row.id
                ? (
                  <ChildrenTransfer
                    api={`${resolveRbacApi(props.baseRoute)}/roles/children`}
                    id={row.id}
                    canManage={canManage}
                    catalog={ctx.row}
                  />
                )
                : null}
            </div>
          );
        },
      }}
      autoActions={false}
      caps={{
        import: false,
        print: false,
        columns: false,
        density: false,
        fullscreen: false,
        copy: false,
        remove: false,
      }}
      toolbar={{
        create: { show: () => canManage.value },
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
      batchBar={{
        remove: { show: () => canManage.value },
      }}
      class={props.class}
      {...listPanelProps(props.data)}
    />
  );
}

export async function load(
  ctx: ListQuerySource & { container: ServiceContainer },
) {
  return paginateItems(
    await listRoleRows(getRbacService(ctx.container)),
    listQueryFrom(ctx),
    (item) => [item.code, item.name, item.description ?? ""],
  );
}
