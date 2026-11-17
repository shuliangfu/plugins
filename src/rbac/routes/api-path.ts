/**
 * Resolve the RBAC API root from a DataPanel baseRoute.
 */
export function resolveRbacApi(baseRoute?: string): string {
  const base = (baseRoute ?? "/api").replace(/\/+$/, "");
  const segs = base.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segs.length >= 3) return `/${segs.slice(0, -1).join("/")}`;
  if (segs.length === 2) return base;
  return "/api/rbac";
}
