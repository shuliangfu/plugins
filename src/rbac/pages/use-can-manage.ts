/**
 * Infer write access from GET /access when the host does not pass canManage.
 */
import { createSignal, onMount } from "@dreamer/view";
import { canManageFromAccess } from "../service/service.ts";
import { resolveRbacApi } from "./api-path.ts";
import type { RbacPanelProps } from "./types.ts";

type AccessView = {
  isDeveloper?: boolean;
  routeAllows?: string[];
  routeExcludes?: string[];
};

export function useCanManage(props: RbacPanelProps) {
  const canManage = createSignal(props.canManage === true);
  onMount(async () => {
    if (props.canManage !== undefined) {
      canManage.value = props.canManage;
      return;
    }
    try {
      const res = await fetch(`${resolveRbacApi(props.baseRoute)}/access`, {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const body = await res.json() as { data?: AccessView; item?: AccessView };
      const access = body.data ?? body.item;
      canManage.value = !!access && (
        access.isDeveloper === true ||
        canManageFromAccess({
          routeAllows: access.routeAllows ?? [],
          routeExcludes: access.routeExcludes ?? [],
        })
      );
    } catch {
      canManage.value = false;
    }
  });
  return canManage;
}
