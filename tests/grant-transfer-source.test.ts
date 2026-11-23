import { describe, expect, it } from "@dreamer/test";
import {
  catalogFrom,
  sourceFrom,
} from "../src/rbac/routes/children-transfer.tsx";

describe("grant transfer sourceFrom", () => {
  it("uses catalogRoles, not assignment role name strings", () => {
    const rows = sourceFrom(
      {
        roles: ["管理员"] as unknown as Array<{ id: string; name: string }>,
        roleIds: ["r1"],
        catalogRoles: [{ id: "r1", name: "管理员" }, {
          id: "r2",
          name: "开发",
        }],
        catalogPermissions: [{ id: "p1", name: "仪表盘" }],
        managedRoutes: [{ path: "/admin" }],
      },
      "u1",
      true,
    );
    expect(rows.map((row) => row.key)).toEqual([
      "role:r1",
      "role:r2",
      "permission:p1",
      "route:/admin",
    ]);
    expect(rows.some((row) => row.key.includes("undefined"))).toBe(false);
  });

  it("drops entries without an id", () => {
    const rows = sourceFrom(
      {
        catalogRoles: [{ name: "broken" }] as Array<
          { id: string; name: string }
        >,
      },
      "u1",
      true,
    );
    expect(rows).toEqual([]);
  });
});

describe("grant transfer catalogFrom", () => {
  it("uses top-level catalog, not the bare item on a children response", () => {
    const catalog = catalogFrom({
      ok: true,
      item: {
        id: "r1",
        code: "vendor",
        name: "厂商",
        childRoleIds: [],
        childPermissionIds: [],
      },
      roleIds: ["r2"],
      permissionIds: ["p1"],
      roles: [{ id: "r1", name: "厂商" }, { id: "r2", name: "开发" }],
      permissions: [{ id: "p1", name: "仪表盘" }],
      managedRoutes: [{ path: "/admin" }],
    });
    expect(sourceFrom(catalog, "r1", true).map((row) => row.key)).toEqual([
      "role:r2",
      "permission:p1",
      "route:/admin",
    ]);
  });

  it("still accepts a view payload wrapped in data", () => {
    const catalog = catalogFrom({
      ok: true,
      data: {
        id: "r1",
        roles: [{ id: "r1", name: "厂商" }],
        permissions: [{ id: "p1", name: "仪表盘" }],
      },
    });
    expect(sourceFrom(catalog, "r1", true).map((row) => row.key)).toEqual([
      "permission:p1",
    ]);
  });
});
