import type { JSXRenderable } from "@dreamer/view";
/**
 * 权限分配：列出管理员，在详情里分配角色、权限和路由。宿主负责布局。
 */
import { type Column, DataPanel, type Row, Tag } from "@dreamer/ui-view";
import { resolveRbacApi } from "./api-path.ts";
import { AssignTransfer } from "./children-transfer.tsx";
import type { RbacPanelProps } from "./types.ts";
import { listPanelProps, type RbacListPageData } from "./list-props.ts";
import { useCanManage } from "./use-can-manage.ts";

type AssignRow = {
  id: string;
  userId: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  roleIds?: string[];
  permissionIds?: string[];
  routes?: string[];
  roles?: string[];
  catalogRoles?: Array<{ id: string; name: string }>;
  catalogPermissions?: Array<{ id: string; name: string }>;
  managedRoutes?: Array<{ path: string }>;
};

function asRow(row: unknown): AssignRow {
  return row as AssignRow;
}

function displayName(row: AssignRow): string {
  const username = (row.username || "").trim();
  if (username) return username;
  const name = (row.name || "").trim();
  return name || row.id;
}

export default function AssignPage(
  props: RbacPanelProps & { data?: RbacListPageData } = {},
): JSXRenderable {
  const canManage = useCanManage(props);
  const columns: Column[] = [
    {
      prop: "username",
      label: "用户",
      formatter: (row) => displayName(asRow(row)),
    },
    {
      prop: "roles",
      label: "角色",
      formatter: (row) => {
        const names = asRow(row).roles ?? [];
        if (!names.length) return "—";
        return (
          <div class="flex flex-wrap gap-1">
            {names.map((name) => <Tag key={name}>{name}</Tag>)}
          </div>
        );
      },
    },
    {
      type: "actions",
      actions: { view: true, edit: false, remove: false },
    },
  ];
  return (
    <DataPanel
      title="权限分配"
      panelKey="rbac-assign"
      baseRoute={props.baseRoute ?? "/api"}
      apiMode={props.apiMode === "restful" ? "restful" : "action"}
      apiCredentials="same-origin"
      rowKey="id"
      columns={columns}
      search={{
        props: [{ prop: "q", label: "用户", placeholder: "用户名或姓名" }],
      }}
      view={{
        modal: { fullscreenable: true },
        title: (row: Row) => `分配 · ${displayName(asRow(row))}`,
        actions: { close: true },
        render: (ctx: { row: Row }) => (
          <AssignTransfer
            api={`${resolveRbacApi(props.baseRoute)}/assign`}
            id={asRow(ctx.row).id}
            canManage={canManage}
          />
        ),
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
        create: false,
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
      class={props.class}
      {...listPanelProps(props.data)}
    />
  );
}
