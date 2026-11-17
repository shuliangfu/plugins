/**
 * Auto-mounted menus admin route module.
 * `load` stays in this file so the dweb client strip-load plugin can drop it.
 */
import MenusPage from "../menus.tsx";
import { loadMenus, type MenusPageLoadContext } from "../../menus/page-load.ts";

export default MenusPage;

export function load(ctx: MenusPageLoadContext) {
  return loadMenus(ctx);
}
