/**
 * Transfer used inside a DataPanel view to assign or exclude
 * child roles, permissions, and routes.
 * Always refreshes from the children API; view data is only a seed so lists can appear immediately.
 */
import { createSignal, onMount, type Signal } from "@dreamer/view";
import { Tabs, Transfer } from "@dreamer/ui-view";

interface Catalog {
  roleIds?: string[];
  permissionIds?: string[];
  routes?: string[];
  roleExcludeIds?: string[];
  permissionExcludeIds?: string[];
  routeExcludes?: string[];
  roles?: Array<{ id: string; name: string; code?: string }>;
  permissions?: Array<{ id: string; name: string }>;
  catalogRoles?: Array<{ id: string; name: string }>;
  catalogPermissions?: Array<{ id: string; name: string }>;
  managedRoutes?: Array<{ path: string }>;
}

function allowKeys(data: Catalog | undefined): string[] {
  return [
    ...(data?.roleIds ?? []).map((id) => `role:${id}`),
    ...(data?.permissionIds ?? []).map((id) => `permission:${id}`),
    ...(data?.routes ?? []).map((path) => `route:${path}`),
  ];
}

function denyKeys(data: Catalog | undefined): string[] {
  return [
    ...(data?.roleExcludeIds ?? []).map((id) => `role:${id}`),
    ...(data?.permissionExcludeIds ?? []).map((id) => `permission:${id}`),
    ...(data?.routeExcludes ?? []).map((path) => `route:${path}`),
  ];
}

function hasCatalog(data: Catalog | undefined): boolean {
  return !!data && (
    Array.isArray(data.permissions) ||
    Array.isArray(data.catalogPermissions) ||
    Array.isArray(data.managedRoutes) ||
    Array.isArray(data.roles) ||
    Array.isArray(data.catalogRoles)
  );
}

function catalogFrom(body: unknown, fallback?: Catalog): Catalog {
  if (!body || typeof body !== "object") return fallback ?? {};
  const rec = body as Record<string, unknown>;
  const inner =
    (rec.data && typeof rec.data === "object"
      ? rec.data
      : rec.item && typeof rec.item === "object"
      ? rec.item
      : rec) as Catalog;
  return hasCatalog(inner) ? { ...fallback, ...inner } : (fallback ?? {});
}

function sourceFrom(
  data: Catalog,
  id: string,
  includeRoles: boolean,
): Array<{ key: string; title: string; group: string }> {
  const roles = data.roles ?? data.catalogRoles ?? [];
  const permissions = data.permissions ?? data.catalogPermissions ?? [];
  return [
    ...(includeRoles
      ? roles.filter((role) => role.id !== id).map((role) => ({
        key: `role:${role.id}`,
        title: role.name,
        group: "角色",
      }))
      : []),
    ...permissions.filter((item) => item.id !== id).map((item) => ({
      key: `permission:${item.id}`,
      title: item.name,
      group: "权限",
    })),
    ...(data.managedRoutes ?? []).map((row) => ({
      key: `route:${row.path}`,
      title: row.path,
      group: "路由",
    })),
  ];
}

function keysOf(list: string[], prefix: string): string[] {
  return list.filter((key) => key.startsWith(prefix)).map((key) =>
    key.slice(prefix.length)
  );
}

function grantPayload(allow: string[], deny: string[]) {
  return {
    roleIds: keysOf(allow, "role:"),
    permissionIds: keysOf(allow, "permission:"),
    routes: keysOf(allow, "route:"),
    roleExcludeIds: keysOf(deny, "role:"),
    permissionExcludeIds: keysOf(deny, "permission:"),
    routeExcludes: keysOf(deny, "route:"),
  };
}

function canWrite(value: boolean | { value: boolean } | undefined): boolean {
  return typeof value === "object" && value ? !!value.value : !!value;
}

export function GrantTransfer(props: {
  id: string;
  loadUrl: string;
  saveUrl: string;
  canManage?: boolean | { value: boolean };
  includeRoles?: boolean;
  catalog?: Catalog;
}) {
  const includeRoles = props.includeRoles !== false;
  const seeded = hasCatalog(props.catalog);
  const loading = createSignal(!seeded);
  const busy = createSignal(false);
  const catalog = createSignal<Catalog>(props.catalog ?? {});
  const allowTarget = createSignal<string[]>(allowKeys(props.catalog));
  const denyTarget = createSignal<string[]>(denyKeys(props.catalog));

  async function load() {
    try {
      const res = await fetch(props.loadUrl, {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const next = catalogFrom(await res.json(), catalog.value);
      catalog.value = next;
      allowTarget.value = allowKeys(next);
      denyTarget.value = denyKeys(next);
    } finally {
      loading.value = false;
    }
  }

  onMount(() => {
    void load();
  });

  async function save(nextAllow: string[], nextDeny: string[]) {
    if (!canWrite(props.canManage) || busy.value) return;
    const prevAllow = allowTarget.value;
    const prevDeny = denyTarget.value;
    allowTarget.value = nextAllow;
    denyTarget.value = nextDeny;
    busy.value = true;
    try {
      const res = await fetch(props.saveUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: props.id,
          userId: props.id,
          ...grantPayload(nextAllow, nextDeny),
        }),
      });
      const data = await res.json() as { ok?: boolean };
      if (!res.ok || data.ok === false) {
        allowTarget.value = prevAllow;
        denyTarget.value = prevDeny;
      }
    } catch {
      allowTarget.value = prevAllow;
      denyTarget.value = prevDeny;
    } finally {
      busy.value = false;
    }
  }

  function pane(
    kind: "allow" | "deny",
    targetKeys: Signal<string[]>,
  ) {
    const deny = kind === "deny";
    return (
      <Transfer
        dataSource={sourceFrom(catalog.value, props.id, includeRoles)}
        targetKeys={targetKeys}
        showSearch
        titles={deny ? ["可选", "已排除"] : ["可选", "已分配"]}
        searchPlaceholder={deny
          ? ["搜索可排除", "搜索已排除"]
          : ["搜索可分配", "搜索已分配"]}
        disabled={!canWrite(props.canManage) || busy.value}
        listStyle={{ height: 360 }}
        onChange={(next: string[]) => {
          void save(
            kind === "allow" ? next : allowTarget.value,
            kind === "deny" ? next : denyTarget.value,
          );
        }}
      />
    );
  }

  return (
    <div>
      {() =>
        loading.value
          ? <p class="py-6 text-center text-sm opacity-70">加载中…</p>
          : (
            <Tabs
              items={[
                {
                  key: "allow",
                  label: "分配权限",
                  children: pane("allow", allowTarget),
                },
                {
                  key: "deny",
                  label: "排除权限",
                  children: pane("deny", denyTarget),
                },
              ]}
            />
          )}
    </div>
  );
}

/** Role / permission detail: GET and POST the children API. */
export function ChildrenTransfer(props: {
  api: string;
  id: string;
  canManage?: boolean | { value: boolean };
  includeRoles?: boolean;
  catalog?: Catalog;
}) {
  return (
    <GrantTransfer
      id={props.id}
      loadUrl={`${props.api}?id=${encodeURIComponent(props.id)}`}
      saveUrl={props.api}
      canManage={props.canManage}
      includeRoles={props.includeRoles}
      catalog={props.catalog}
    />
  );
}

/** Assignment detail: GET /view and POST /update. */
export function AssignTransfer(props: {
  api: string;
  id: string;
  canManage?: boolean | { value: boolean };
  catalog?: Catalog;
}) {
  return (
    <GrantTransfer
      id={props.id}
      loadUrl={`${props.api}/view?id=${encodeURIComponent(props.id)}`}
      saveUrl={`${props.api}/update`}
      canManage={props.canManage}
      catalog={props.catalog}
    />
  );
}
