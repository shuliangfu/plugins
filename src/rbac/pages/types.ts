/**
 * Shared props for auto-mounted RBAC DataPanel pages.
 */
export interface RbacPanelProps {
  /**
   * DataPanel API prefix. Default `/api` appends the current page route,
   * so `/rbac/roles` calls `/api/rbac/roles`. Pass a full root such as
   * `/api/rbac/roles` when the page is not mounted on that path.
   */
  baseRoute?: string;
  /** DataPanel API style. Default `action` (GET/POST only). */
  apiMode?: "action" | "restful";
  canManage?: boolean;
  class?: string;
}

export interface RouteTransferOption {
  key: string;
  title: string;
  source?: string;
}

/** First-screen data for the routes Transfer page. */
export interface RoutesPageData {
  available?: RouteTransferOption[];
  managed?: Array<{ key: string; title: string; source: string }>;
}
