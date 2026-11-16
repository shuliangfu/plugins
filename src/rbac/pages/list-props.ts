/**
 * Client-safe DataPanel props for RBAC list pages.
 * Keep this free of server imports so the browser bundle stays clean.
 */
import type { Row } from "@dreamer/ui-view";
import type { PagedList } from "../list-query.ts";

export type RbacListPageData = PagedList<Row>;

export type RbacListPanelProps = {
  data: Row[] | undefined;
  pagination: { page: number; pageSize: number; total?: number };
};

/** Props DataPanel needs so the first paint uses `load` rows and skips the list request. */
export function listPanelProps(data?: PagedList<Row>): RbacListPanelProps {
  return {
    data: data ? data.rows : undefined,
    pagination: {
      page: data?.page ?? 1,
      pageSize: data?.pageSize ?? 20,
      ...(data ? { total: data.total } : {}),
    },
  };
}
