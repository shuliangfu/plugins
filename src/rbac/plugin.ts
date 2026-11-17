/**
 * RBAC plugin: route checks, JSON API, and auto-mounted admin pages.
 * Pages register at `{basePath}/roles|permissions|assign|routes` via onRoute.
 */
import { getDatabase, isDatabaseInitialized } from "@dreamer/database";
import type { Plugin, RequestContext, RouteDefinition } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import { handleRbacApi } from "./api/mod.ts";
import { normalizePath } from "./service/route-pattern.ts";
import { type ResolvedStore, resolveRbacStore } from "./store/resolve-store.ts";
import { RbacService } from "./service/service.ts";
import { resolveApiMode } from "./api-mode.ts";
import { resolveMenusPagePath, resolveRbacGetUser } from "./resolve-options.ts";
import type { CheckDecision, RbacPluginOptions } from "./types.ts";
import {
  getRbacServiceOrNull,
  registerRbacService,
  setRbacBoot,
  unregisterRbacService,
} from "./service/runtime.ts";

export {
  ensureRbacReady,
  getRbacService,
  RBAC_SERVICE,
} from "./service/runtime.ts";

const PLUGIN_NAME = "@dreamer/plugins-rbac";
const PLUGIN_VERSION = "1.0.0";

const ADMIN_PAGE_SLUGS = [
  "roles",
  "permissions",
  "assign",
  "routes",
] as const;

/** Resolve a sibling module to an absolute path (or URL) for dweb page registration. */
export function resolvePluginModulePath(relativeFromPlugin: string): string {
  const url = new URL(relativeFromPlugin, import.meta.url);
  if (url.protocol !== "file:") return url.href;
  let path = decodeURIComponent(url.pathname);
  if (path.match(/^\/[A-Za-z]:/)) path = path.slice(1);
  return path;
}

function adminPageStubHandler(): Response {
  return new Response(null);
}

function adminPageDefinitions(basePath: string): RouteDefinition[] {
  const base = normalizePath(basePath);
  return ADMIN_PAGE_SLUGS.map((slug) => {
    const path = `${base}/${slug}`;
    const component = path.replace(/^\//, "");
    return {
      path,
      method: "GET",
      // File-route modules are loaded by dweb via meta.fullPath; handler is
      // required by @dreamer/plugin RouteDefinition and is not used.
      handler: adminPageStubHandler,
      meta: {
        plugin: PLUGIN_NAME,
        type: "page",
        component,
        file: `${component}.tsx`,
        fullPath: resolvePluginModulePath(`./routes/${slug}/index.tsx`),
      },
    };
  });
}

function menuPageDefinition(options: RbacPluginOptions): RouteDefinition[] {
  const path = resolveMenusPagePath(options);
  const component = path.replace(/^\//, "");
  return [{
    path,
    method: "GET",
    handler: adminPageStubHandler,
    meta: {
      plugin: PLUGIN_NAME,
      type: "page",
      component,
      file: `${component}.tsx`,
      fullPath: resolvePluginModulePath("./routes/menus/index.tsx"),
    },
  }];
}

function canInitNow(options: RbacPluginOptions): boolean {
  if (options.store || options.database || options.adapter) return true;
  if (options.connectionName || options.databaseType) {
    if (!isDatabaseInitialized()) return false;
    try {
      getDatabase(options.connectionName ?? "default");
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export function rbacPlugin(options: RbacPluginOptions): Plugin {
  let resolved: ResolvedStore | undefined;
  let pendingContainer: ServiceContainer | undefined;
  let initPromise: Promise<RbacService> | undefined;

  const boot = async (container?: ServiceContainer) => {
    const target = container ?? pendingContainer;
    if (!target) throw new Error("rbacPlugin is not initialized");
    const existing = getRbacServiceOrNull(target);
    if (existing) return existing;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      resolved = await resolveRbacStore(options);
      const service = new RbacService(resolved.store, options, resolved.menus);
      service.container = target;
      service.apiMode = resolveApiMode(options, target);
      await service.seed();
      registerRbacService(target, service);
      return service;
    })();
    try {
      return await initPromise;
    } catch (error) {
      initPromise = undefined;
      throw error;
    }
  };
  setRbacBoot(boot);

  return {
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    config: {
      rbac: {
        basePath: options.basePath ?? "/rbac",
        apiBasePath: options.apiBasePath ?? "/api/rbac",
      },
    },
    validateConfig(config) {
      const rbac = (config.rbac ?? {}) as Record<string, unknown>;
      if (rbac.basePath != null && typeof rbac.basePath !== "string") {
        return false;
      }
      return true;
    },
    async onInit(container: ServiceContainer) {
      pendingContainer = container;
      if (canInitNow(options)) await boot?.(container);
    },
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const service = getRbacServiceOrNull(container) ??
        (canInitNow(options) ? await boot(container) : undefined);
      if (!service) return;
      service.apiMode = resolveApiMode(service.options, container);

      const path = normalizePath(ctx.path || ctx.url?.pathname || "/");
      let decision = await service.checkRoute(
        path,
        await resolveRbacGetUser(options)(ctx),
      );
      if (options.hooks?.authorize) {
        const user = await resolveRbacGetUser(options)(ctx);
        const access = user ? await service.getAccess(user) : null;
        decision = await options.hooks.authorize(ctx, decision, access);
      }
      const denied = denyResponse(ctx, service, decision);
      const isApi = path === service.apiBasePath ||
        path.startsWith(`${service.apiBasePath}/`);
      if (isApi) {
        if (denied) return denied;
        const response = await handleRbacApi(ctx, service);
        if (response) return response;
        return;
      }
      if (denied) return denied;
    },
    onRoute(routes: RouteDefinition[], _container: ServiceContainer) {
      const api = options.apiBasePath ?? "/api/rbac";
      const basePath = options.basePath ?? "/rbac";
      const extras: RouteDefinition[] = [
        {
          path: `${api}/*`,
          method: "*",
          handler: () => new Response(null),
          meta: { plugin: PLUGIN_NAME, type: "api" },
        },
        ...adminPageDefinitions(basePath),
        ...menuPageDefinition(options),
      ];
      const have = new Set(
        routes.map((route) => `${route.method ?? "GET"}:${route.path}`),
      );
      const added: RouteDefinition[] = [];
      for (const extra of extras) {
        const key = `${extra.method ?? "GET"}:${extra.path}`;
        const pathTaken = routes.some((route) => route.path === extra.path) ||
          have.has(key);
        if (pathTaken) continue;
        have.add(key);
        added.push(extra);
      }
      if (added.length === 0) return routes;
      return [...routes, ...added];
    },
    async onStop(container: ServiceContainer) {
      await resolved?.close?.();
      unregisterRbacService(container);
      initPromise = undefined;
    },
  };
}

function denyResponse(
  ctx: RequestContext,
  service: RbacService,
  decision: CheckDecision,
): Response | undefined {
  if (decision.ok) return;
  const path = normalizePath(ctx.path || ctx.url?.pathname || "/");
  const wantsJson = (ctx.headers?.get("accept") ?? "").includes(
    "application/json",
  ) || path.startsWith("/api/");
  if (wantsJson) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: decision.status === 401 ? "unauthorized" : "forbidden",
      }),
      {
        status: decision.status,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
  const target = decision.status === 401
    ? `${service.loginPath}?redirect=${encodeURIComponent(ctx.path || "/")}`
    : service.forbiddenPath;
  return Response.redirect(
    new URL(target, ctx.url ?? "http://localhost").href,
    302,
  );
}
