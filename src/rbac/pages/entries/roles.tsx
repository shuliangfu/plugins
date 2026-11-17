/**
 * Auto-mounted RBAC admin route module.
 * `load` stays in this file so the dweb client strip-load plugin can drop it
 * and the browser chunk never imports the store.
 */
import RolesPage from "../roles.tsx";
import { loadRoles, type RbacPageLoadContext } from "../load.ts";

export default RolesPage;

export function load(ctx: RbacPageLoadContext) {
  return loadRoles(ctx);
}
