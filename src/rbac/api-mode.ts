/**
 * Resolve RBAC API style from plugin options or the host AppConfig.
 */
import type { ServiceContainer } from "@dreamer/service";
import type { RbacApiMode, RbacPluginOptions } from "./types.ts";

export function resolveApiMode(
  options: Pick<RbacPluginOptions, "apiMode"> = {},
  container?: ServiceContainer,
): RbacApiMode {
  if (options.apiMode === "action" || options.apiMode === "restful") {
    return options.apiMode;
  }
  if (typeof container?.has === "function" && container.has("config")) {
    const config = container.get<{ router?: { apiMode?: string } }>("config");
    const mode = config?.router?.apiMode;
    if (mode === "action" || mode === "restful") return mode;
    return "restful";
  }
  return "action";
}
