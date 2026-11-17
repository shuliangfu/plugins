/**
 * 路由列表：上方新增，中间 Transfer。
 * 左侧是扫描到、尚未纳入管理的路由；右侧是已管理路由。角色和权限只能绑定右侧路由。
 */
import { createSignal, type JSXRenderable } from "@dreamer/view";
import { Button, DataView, Input, message, Transfer } from "@dreamer/ui-view";
import { normalizeRoutePattern } from "../../service/route-pattern.ts";
import { resolveRbacApi } from "../api-path.ts";
import type { RbacPanelProps, RoutesPageData } from "../types.ts";
import { useCanManage } from "../use-can-manage.ts";
import type { ServiceContainer } from "@dreamer/service";
import { getRbacService } from "../../service/runtime.ts";
import { listRouteTransfer } from "../../api/mod.ts";

type RouteOption = { key: string; title: string; source?: string };

function parseNewRoutes(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of text.split(/[\s,]+/)) {
    const path = normalizeRoutePattern(part);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

function managedKeys(
  rows: Array<{ key: string; title: string; source: string }> | undefined,
): string[] {
  return (rows ?? []).map((r) => r.key);
}

export default function RoutesPage(
  props: RbacPanelProps & { data?: RoutesPageData } = {},
): JSXRenderable {
  const canManage = useCanManage(props);
  const api = `${resolveRbacApi(props.baseRoute)}/routes`;
  const initial = props.data ?? {};
  const loading = createSignal(false);
  const busy = createSignal(false);
  const newRoute = createSignal("");
  const available = createSignal<RouteOption[]>(initial.available ?? []);
  const managed = createSignal<
    Array<{ key: string; title: string; source: string }>
  >(initial.managed ?? []);
  const originalManaged = createSignal<string[]>(managedKeys(initial.managed));
  const targetKeys = createSignal<string[]>([...managedKeys(initial.managed)]);

  function applyTransfer(data: RoutesPageData) {
    available.value = data.available ?? [];
    managed.value = data.managed ?? [];
    const keys = managedKeys(data.managed);
    originalManaged.value = keys;
    targetKeys.value = [...keys];
  }

  async function readTransfer(res: Response): Promise<RoutesPageData | null> {
    const body = await res.json() as RoutesPageData & {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || body.ok === false) {
      message.error(body.error || "加载路由失败");
      return null;
    }
    return body;
  }

  async function refreshTransfer() {
    if (!(available.value.length || managed.value.length)) {
      loading.value = true;
    }
    try {
      const data = await readTransfer(
        await fetch(`${api}/transfer`, {
          credentials: "same-origin",
          headers: { accept: "application/json" },
        }),
      );
      if (data) applyTransfer(data);
    } catch {
      message.error("加载路由失败");
    } finally {
      loading.value = false;
    }
  }

  async function syncManaged(
    next: string[],
    source: "scan" | "manual" = "scan",
  ) {
    if (!canManage.value || busy.value) return;
    const prev = new Set(originalManaged.value);
    const want = new Set(next);
    const add = [...want].filter((k) => !prev.has(k));
    const remove = [...prev].filter((k) => !want.has(k));
    targetKeys.value = next;
    if (!add.length && !remove.length) return;
    busy.value = true;
    try {
      const data = await readTransfer(
        await fetch(`${api}/sync`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ add, remove, source }),
        }),
      );
      if (!data) {
        targetKeys.value = [...originalManaged.value];
        return;
      }
      applyTransfer(data);
    } catch {
      message.error("保存失败");
      targetKeys.value = [...originalManaged.value];
    } finally {
      busy.value = false;
    }
  }

  async function addNewRoutes() {
    if (!canManage.value || busy.value) return;
    const paths = parseNewRoutes(newRoute.value);
    if (!paths.length) {
      message.error("路由格式不正确");
      return;
    }
    const already = new Set(originalManaged.value);
    const add = paths.filter((p) => !already.has(p));
    if (!add.length) {
      message.error("该路由已在右侧");
      return;
    }
    busy.value = true;
    try {
      const data = await readTransfer(
        await fetch(`${api}/sync`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ add, remove: [], source: "manual" }),
        }),
      );
      if (!data) {
        message.error("添加失败");
        return;
      }
      newRoute.value = "";
      message.success("已保存");
      applyTransfer(data);
    } catch {
      message.error("添加失败");
    } finally {
      busy.value = false;
    }
  }

  void refreshTransfer();

  return (
    <DataView
      title="路由列表"
      panelKey="rbac-routes"
      toolbar={false}
      class={props.class}
    >
      <div class="space-y-4 p-1.5">
        <style>
          {`[data-routes-transfer] { width: 100%; min-width: 0; }`}
        </style>
        <form
          class="flex items-center gap-2"
          method="dialog"
          action="#"
          onSubmit={(e: Event) => {
            e.preventDefault();
            void addNewRoutes();
          }}
        >
          <div class="min-w-0 flex-1">
            <Input
              value={newRoute}
              onInput={(e: Event) =>
                newRoute.value =
                  (e.target as unknown as { value: string }).value}
              placeholder="新路由"
              allowClear
              disabled={!canManage.value}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={busy.value}
            disabled={!canManage.value}
          >
            添加
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={loading.value || busy.value}
            onClick={() => {
              void refreshTransfer();
            }}
          >
            刷新
          </Button>
        </form>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          左侧是扫描到、尚未纳入管理的路由；添加到右侧后，才能绑定到角色或权限。
        </p>
        {() =>
          loading.value
            ? <p class="py-8 text-center text-sm opacity-70">加载中…</p>
            : (
              <div data-routes-transfer>
                <Transfer
                  dataSource={available.value.concat(managed.value).map((
                    r,
                  ) => ({
                    key: r.key,
                    title: r.title,
                  }))}
                  targetKeys={targetKeys}
                  showSearch
                  titles={["待添加", "已管理"]}
                  searchPlaceholder={["搜索待添加", "搜索已管理"]}
                  listStyle={{
                    height: "calc(100vh - 550px)",
                  }}
                  disabled={!canManage.value || busy.value}
                  onChange={(next: string[]) => {
                    void syncManaged(next);
                  }}
                />
              </div>
            )}
      </div>
    </DataView>
  );
}

export async function load(
  ctx: { container: ServiceContainer },
) {
  return await listRouteTransfer(getRbacService(ctx.container));
}
