/**
 * Route permission globs, e.g. `/*` or `/users/*`.
 * Binding is path-only: `GET /rbac/roles` and `/rbac/roles` both mean `/rbac/roles`.
 */

const METHOD_PREFIX = /^(GET|POST|PUT|PATCH|DELETE|\*)\s+(\/\S*)$/i;

export function normalizeRoutePattern(input: string): string | null {
  let pat = input.trim();
  if (!pat) return null;
  const prefixed = METHOD_PREFIX.exec(pat);
  if (prefixed) pat = prefixed[2]!;
  if (pat === "*") pat = "/*";
  if (!pat.startsWith("/")) return null;
  pat = pat.replace(/\/{2,}/g, "/");
  return pat;
}

export function scanItemPath(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "path" in item) {
    return String((item as { path?: unknown }).path ?? "");
  }
  return "";
}

export function normalizeScannedRoutes(
  input: unknown,
): Array<{ path: string; name?: string; description?: string }> {
  const arr = Array.isArray(input) ? input : [];
  const out: Array<{ path: string; name?: string; description?: string }> = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const path = normalizeRoutePattern(scanItemPath(item));
    if (!path || seen.has(path)) continue;
    seen.add(path);
    if (item && typeof item === "object") {
      const rec = item as { name?: unknown; description?: unknown };
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const description = typeof rec.description === "string"
        ? rec.description.trim()
        : "";
      out.push({
        path,
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      });
    } else {
      out.push({ path });
    }
  }
  return out;
}

export function parseRoutePatterns(input: unknown): string[] {
  return normalizeScannedRoutes(input).map((row) => row.path);
}

export function normalizePath(pathname: string): string {
  return (pathname.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchRoutePattern(pathname: string, pattern: string): boolean {
  const path = normalizePath(pathname);
  const pat = normalizeRoutePattern(pattern);
  if (!pat) return false;
  if (pat === "/*") return true;
  if (pat.endsWith("/*")) {
    const prefix = pat.slice(0, -2).replace(/\/+$/, "") || "/";
    if (prefix === "/") return true;
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (pat.includes("*")) {
    const re = new RegExp(
      `^${pat.split("*").map((part) => escapeRe(part)).join(".*")}$`,
    );
    return re.test(path);
  }
  return path === (pat.replace(/\/+$/, "") || "/");
}

export function matchAnyRoutePattern(
  pathname: string,
  patterns: string[] | undefined,
): boolean {
  return (patterns ?? []).some((pat) => matchRoutePattern(pathname, pat));
}

/** Allow unless an exclude hits; matching allow (including `/*`) grants the path. */
export function allowRouteByPatterns(
  pathname: string,
  allows: string[] | undefined,
  excludes: string[] | undefined,
): "deny" | "allow" | "skip" {
  if (matchAnyRoutePattern(pathname, excludes)) return "deny";
  if (matchAnyRoutePattern(pathname, allows)) return "allow";
  return "skip";
}

export function wildcardPathsFor(paths: string[]): string[] {
  const wildcards = new Set<string>();
  for (const raw of paths) {
    const path = normalizeRoutePattern(String(raw ?? ""));
    if (!path || path.endsWith("/*")) continue;
    const parts = path.split("/").filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const prefix = i === 0 ? "/" : "/" + parts.slice(0, i).join("/");
      wildcards.add(prefix === "/" ? "/*" : `${prefix}/*`);
    }
  }
  return [...wildcards];
}

export function compareRoutePaths(a: string, b: string): number {
  const as = a.split("/").filter(Boolean);
  const bs = b.split("/").filter(Boolean);
  const n = Math.min(as.length, bs.length);
  for (let i = 0; i < n; i++) {
    const left = as[i]!;
    const right = bs[i]!;
    if (left === right) continue;
    if (left === "*") return -1;
    if (right === "*") return 1;
    return left < right ? -1 : 1;
  }
  return as.length - bs.length;
}

/** Left: scanned paths plus auto `prefix/*`; right: already-managed paths. */
export function buildRouteTransferLists(
  scannedPaths: string[],
  managedRows: Array<{ path: string; source?: string }>,
): {
  available: Array<{ key: string; title: string }>;
  managed: Array<{ key: string; title: string; source: string }>;
} {
  const managed: Array<{ key: string; title: string; source: string }> = [];
  const have = new Set<string>();
  const seenManaged = new Set<string>();
  for (const row of managedRows) {
    const path = (row.path ?? "").trim();
    if (!path || seenManaged.has(path)) continue;
    seenManaged.add(path);
    have.add(path);
    managed.push({ key: path, title: path, source: row.source ?? "" });
  }

  const known: string[] = [];
  const seenKnown = new Set<string>();
  for (const raw of scannedPaths) {
    const path = (raw ?? "").trim();
    if (!path || seenKnown.has(path)) continue;
    seenKnown.add(path);
    known.push(path);
  }
  for (const path of have) {
    if (seenKnown.has(path)) continue;
    seenKnown.add(path);
    known.push(path);
  }

  const available: Array<{ key: string; title: string }> = [];
  const seenAvail = new Set<string>();
  for (const path of [...known, ...wildcardPathsFor(known)]) {
    if (!path || have.has(path) || seenAvail.has(path)) continue;
    seenAvail.add(path);
    available.push({ key: path, title: path });
  }
  available.sort((a, b) => compareRoutePaths(a.key, b.key));
  return { available, managed };
}

/** Infer write access from assigned route patterns. Safe for client bundles. */
export function canManageFromAccess(
  access: { routeAllows?: string[]; routeExcludes?: string[] },
  basePath = "/rbac",
  apiBasePath = "/api/rbac",
): boolean {
  return allowRouteByPatterns(
        `${basePath}/_`,
        access.routeAllows ?? [],
        access.routeExcludes ?? [],
      ) === "allow" || allowRouteByPatterns(
        `${apiBasePath}/_`,
        access.routeAllows ?? [],
        access.routeExcludes ?? [],
      ) === "allow";
}
