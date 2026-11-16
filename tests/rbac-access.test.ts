import { describe, expect, it } from "@dreamer/test";
import {
  assertNotRemovingLastSuperAdmin,
  getPermissionsPayload,
  invalidatePermissionCache,
  loadRbacUser,
  requireUser,
  resolveRoleIdsFromInput,
  syncAssignment,
  toAdminAccess,
} from "../src/rbac/service/access.ts";
import { MemoryRbacStore } from "../src/rbac/store/memory-store.ts";
import { getRbacService, rbacPlugin } from "../src/rbac/plugin.ts";
import { ServiceContainer } from "@dreamer/service";
import type { RbacUser } from "../src/rbac/types.ts";

describe("RBAC access helpers", () => {
  async function boot(user?: RbacUser | null) {
    const store = new MemoryRbacStore();
    const plugin = rbacPlugin({
      store,
      getUser: () => user ?? { id: "u-1" },
      hooks: {
        loadAccount: (id) => {
          if (id === "disabled") return Promise.resolve({ id, disabled: true });
          return Promise.resolve({ id, isDeveloper: id === "dev" });
        },
      },
      seed: { superRole: "superadmin", superRoleName: "超级管理员" },
    });
    const container = new ServiceContainer();
    await plugin.onInit?.(container);
    return { service: getRbacService(container), container };
  }

  it("loads assignment and developer flag through loadAccount", async () => {
    const { service, container } = await boot();
    const role = await service.store.getRoleByCode("superadmin");
    await syncAssignment(container, "dev", [role!.id]);
    const user = await loadRbacUser(container, "dev");
    expect(user?.id).toEqual("dev");
    expect(user?.isDeveloper).toEqual(true);
    expect(user?.roleIds).toEqual([role!.id]);
    expect(await loadRbacUser(container, "disabled")).toEqual(null);
  });

  it("builds a wildcard access payload as *", () => {
    const access = toAdminAccess({
      userId: "u-1",
      roleIds: [],
      routeAllows: ["/*"],
      routeExcludes: [],
      isDeveloper: false,
    });
    expect(access.effective).toEqual("*");
    expect(access.routeAllows).toEqual(["/*"]);
  });

  it("resolves role ids and guards the last super admin", async () => {
    const { service, container } = await boot();
    const role = await service.store.getRoleByCode("superadmin");
    const resolved = await resolveRoleIdsFromInput(container, {
      role: "superadmin",
    });
    expect(resolved.roleIds).toEqual([role!.id]);
    await syncAssignment(container, "boss", resolved.roleIds);
    await assertNotRemovingLastSuperAdmin(container, "boss", resolved.roleIds);
    let failed = false;
    try {
      await assertNotRemovingLastSuperAdmin(container, "boss", []);
    } catch (error) {
      failed = (error as Error).message.includes("超级管理员");
    }
    expect(failed).toEqual(true);
    invalidatePermissionCache(container, "boss");
    expect(await getPermissionsPayload(container, "boss")).toEqual("*");
  });

  it("requireUser uses options.getUser", async () => {
    const { container } = await boot({ id: "u-1", isDeveloper: true });
    const ok = await requireUser(
      container,
      new Request("http://localhost/rbac"),
    );
    expect(ok).toEqual({
      ok: true,
      user: { id: "u-1", isDeveloper: true },
    });
  });
});
