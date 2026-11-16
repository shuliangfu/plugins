import { describe, expect, it } from "@dreamer/test";
import { ServiceContainer } from "@dreamer/service";
import {
  collectScannedRoutes,
  liveRoutePaths,
} from "../src/rbac/service/route-scan.ts";

function routerContainer(
  routes: Array<{ path?: string; isSpecial?: boolean }>,
): ServiceContainer {
  const container = new ServiceContainer();
  container.registerSingleton("router", () => ({
    getRoutes: () => routes,
  }));
  return container;
}

describe("RBAC route list from live router", () => {
  it("reads registered router paths and skips special or public ones", () => {
    const container = routerContainer([
      { path: "/hello" },
      { path: "/live-only" },
      { path: "/login" },
      { path: "/_special", isSpecial: true },
      { path: "  /users  " },
      { path: "" },
    ]);
    const skip = (path: string) => path === "/login";
    expect(liveRoutePaths(container, skip)).toEqual([
      "/hello",
      "/live-only",
      "/users",
    ]);
    expect(liveRoutePaths()).toEqual([]);
  });

  it("lists registered routes for the transfer without inventing names", () => {
    const container = routerContainer([
      { path: "/hello" },
      { path: "/hello" },
      { path: "/live-only" },
      { path: "/login" },
      { path: "/_special", isSpecial: true },
    ]);
    const rows = collectScannedRoutes({
      container,
      options: { getUser: () => null },
      allowActions: ["/login", "/forbidden", "/assets/*", "/favicon.ico"],
      sessionAllowActions: [],
      basePath: "/rbac",
      apiBasePath: "/api/rbac",
    });
    expect(rows).toEqual([
      { path: "/hello" },
      { path: "/live-only" },
    ]);
  });
});
