/**
 * Auto-mounted RBAC admin route module.
 * `load` stays in this file so the dweb client strip-load plugin can drop it
 * and the browser chunk never imports the store.
 */
import RoutesPage from "../routes.tsx";
import { loadRoutes, type RbacPageLoadContext } from "../load.ts";

export default RoutesPage;

export function load(ctx: RbacPageLoadContext) {
  return loadRoutes(ctx);
}
