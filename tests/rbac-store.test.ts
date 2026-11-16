/**
 * RBAC database store tests (SQLite).
 */
import { ServiceContainer } from "@dreamer/service";
import { describe, expect, it } from "@dreamer/test";
import { getRbacService, rbacPlugin } from "../src/rbac/mod.ts";

describe("RBAC SQLite 存储", () => {
  it("重启后仍能读到种子和新建角色", async () => {
    const dir = await Deno.makeTempDir({ prefix: "rbac-" });
    const filename = `${dir}/rbac.sqlite`;
    const admin = { id: "u-admin" };
    const options = {
      database: {
        adapter: "sqlite" as const,
        connection: { filename },
      },
      getUser: () => admin,
      seed: { assignUserId: "u-admin" },
    };
    try {
      const first = rbacPlugin(options);
      const c1 = new ServiceContainer();
      await first.onInit?.(c1);
      const service = getRbacService(c1);
      expect((await service.checkRoute("/orders", admin)).ok).toBe(true);
      await service.saveRole({
        id: service.newId(),
        code: "ops",
        name: "运维",
        routeAllows: ["/ops/*"],
        routeExcludes: [],
        childRoleIds: [],
        childPermissionIds: [],
      });
      await first.onStop?.(c1);

      const second = rbacPlugin(options);
      const c2 = new ServiceContainer();
      await second.onInit?.(c2);
      const again = getRbacService(c2);
      expect((await again.store.getRoleByCode("ops"))?.name).toBe("运维");
      expect((await again.checkRoute("/orders", admin)).ok).toBe(true);
      await second.onStop?.(c2);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});
