/**
 * Auto-mounted RBAC admin route module.
 * `load` stays in this file so the dweb client strip-load plugin can drop it
 * and the browser chunk never imports the store.
 */
import AssignPage from "../assign.tsx";
import { loadAssign, type RbacPageLoadContext } from "../load.ts";

export default AssignPage;

export function load(ctx: RbacPageLoadContext) {
  return loadAssign(ctx);
}
