/**
 * Auto-mounted RBAC admin route module.
 * `load` stays in this file so the dweb client strip-load plugin can drop it
 * and the browser chunk never imports the store.
 */
import PermissionsPage from "../permissions.tsx";
import { loadPermissions, type RbacPageLoadContext } from "../load.ts";

export default PermissionsPage;

export function load(ctx: RbacPageLoadContext) {
  return loadPermissions(ctx);
}
