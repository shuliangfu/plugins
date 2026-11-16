/**
 * RBAC admin DataPanel pages. Embed these into the host app layout.
 * Server `load` helpers live at `@dreamer/plugins/rbac/pages/load`
 * so the browser chunk never sees the store.
 */
export { default as AssignPage } from "./assign.tsx";
export { default as PermissionsPage } from "./permissions.tsx";
export { default as RolesPage } from "./roles.tsx";
export { default as RoutesPage } from "./routes.tsx";
export type { RbacPanelProps, RoutesPageData } from "./types.ts";
export { listPanelProps, type RbacListPageData } from "./list-props.ts";
