/**
 * List routes already registered on the app router in the service container.
 */
import type { ServiceContainer } from "@dreamer/service";
import type { RbacPluginOptions, ScannedRoute } from "../types.ts";
import { matchAnyRoutePattern } from "./route-pattern.ts";

export type RouteScanSkip = (path: string) => boolean;

export interface RouteScanHost {
  container?: ServiceContainer;
  options: RbacPluginOptions;
  allowActions: string[];
  sessionAllowActions: string[];
  basePath: string;
  apiBasePath: string;
}

function skipped(path: string, skip?: RouteScanSkip): boolean {
  return skip ? skip(path) : false;
}

function skipFor(service: RouteScanHost): RouteScanSkip {
  const patterns = [...service.allowActions, ...service.sessionAllowActions];
  return (path) => matchAnyRoutePattern(path, patterns);
}

/** Paths registered on the live router, excluding special routes. */
export function liveRoutePaths(
  container?: ServiceContainer,
  skip?: RouteScanSkip,
): string[] {
  if (
    !container || typeof container.has !== "function" ||
    !container.has("router")
  ) {
    return [];
  }
  try {
    const router = container.get<{
      getRoutes?: () => Array<{ path?: string; isSpecial?: boolean }>;
    }>("router");
    return (router.getRoutes?.() ?? []).flatMap((route) => {
      if (route.isSpecial) return [];
      const path = (route.path ?? "").trim();
      if (!path || skipped(path, skip)) return [];
      return [path];
    });
  } catch {
    return [];
  }
}

/** Registered router paths, minus public / session-open paths. */
export function collectScannedRoutes(service: RouteScanHost): ScannedRoute[] {
  const skip = skipFor(service);
  const paths = [...new Set(liveRoutePaths(service.container, skip))];
  return paths
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({ path }));
}
