import { describe, expect, it } from "@dreamer/test";
import { listQueryFrom, paginateItems } from "../src/rbac/list-query.ts";

describe("RBAC 列表分页", () => {
  it("从 URL 读取 page、pageSize 和 q", () => {
    const query = listQueryFrom({
      url: "http://localhost/rbac/roles?page=2&pageSize=10&q=admin",
    });
    expect(query).toEqual({
      q: "admin",
      page: 2,
      pageSize: 10,
      filters: { q: "admin" },
    });
  });

  it("没有 URL pageSize 时用 cookie，URL 优先于 cookie", () => {
    const fromCookie = listQueryFrom({
      url: "http://localhost/rbac/roles",
      cookies: { pageSize: "50" },
    });
    expect(fromCookie.pageSize).toBe(50);

    const fromUrl = listQueryFrom({
      url: "http://localhost/rbac/roles?pageSize=10",
      cookies: { pageSize: "50" },
    });
    expect(fromUrl.pageSize).toBe(10);
  });

  it("按 q 过滤后再分页", () => {
    const items = [
      { name: "管理员" },
      { name: "运维" },
      { name: "管理助理" },
      { name: "访客" },
    ];
    const result = paginateItems(
      items,
      listQueryFrom({
        url: "http://localhost/rbac/roles?q=管理&page=1&pageSize=1",
      }),
      (item) => [item.name],
    );
    expect(result.total).toBe(2);
    expect(result.rows).toEqual([{ name: "管理员" }]);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});
