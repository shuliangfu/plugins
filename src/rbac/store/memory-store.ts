/**
 * In-memory RBAC store, used when no database is configured.
 */
import type {
  Assignment,
  ManagedRoute,
  Permission,
  RbacStore,
  Role,
} from "../types.ts";

export class MemoryRbacStore implements RbacStore {
  #roles = new Map<string, Role>();
  #permissions = new Map<string, Permission>();
  #assignments = new Map<string, Assignment>();
  #routes = new Map<string, ManagedRoute>();

  listRoles(): Promise<Role[]> {
    return Promise.resolve([...this.#roles.values()].map(clone));
  }

  getRole(id: string): Promise<Role | null> {
    const hit = this.#roles.get(id);
    return Promise.resolve(hit ? clone(hit) : null);
  }

  getRoleByCode(code: string): Promise<Role | null> {
    for (const role of this.#roles.values()) {
      if (role.code === code) return Promise.resolve(clone(role));
    }
    return Promise.resolve(null);
  }

  saveRole(role: Role): Promise<Role> {
    const next = clone(role);
    this.#roles.set(next.id, next);
    return Promise.resolve(clone(next));
  }

  removeRole(id: string): Promise<void> {
    this.#roles.delete(id);
    return Promise.resolve();
  }

  listPermissions(): Promise<Permission[]> {
    return Promise.resolve([...this.#permissions.values()].map(clone));
  }

  getPermission(id: string): Promise<Permission | null> {
    const hit = this.#permissions.get(id);
    return Promise.resolve(hit ? clone(hit) : null);
  }

  savePermission(permission: Permission): Promise<Permission> {
    const next = clone(permission);
    this.#permissions.set(next.id, next);
    return Promise.resolve(clone(next));
  }

  removePermission(id: string): Promise<void> {
    this.#permissions.delete(id);
    return Promise.resolve();
  }

  getAssignment(userId: string): Promise<Assignment> {
    const hit = this.#assignments.get(userId);
    return Promise.resolve(
      hit ? clone(hit) : {
        userId,
        roleIds: [],
        permissionIds: [],
        routeAllows: [],
        routeExcludes: [],
        roleExcludes: [],
        permissionExcludes: [],
      },
    );
  }

  saveAssignment(assignment: Assignment): Promise<void> {
    this.#assignments.set(assignment.userId, {
      userId: assignment.userId,
      roleIds: [...assignment.roleIds],
      permissionIds: [...assignment.permissionIds],
      routeAllows: [...(assignment.routeAllows ?? [])],
      routeExcludes: [...(assignment.routeExcludes ?? [])],
      roleExcludes: [...(assignment.roleExcludes ?? [])],
      permissionExcludes: [...(assignment.permissionExcludes ?? [])],
    });
    return Promise.resolve();
  }

  listAssignments(): Promise<Assignment[]> {
    return Promise.resolve([...this.#assignments.values()].map(clone));
  }

  listRoutes(): Promise<ManagedRoute[]> {
    return Promise.resolve([...this.#routes.values()].map(clone));
  }

  saveRoute(route: ManagedRoute): Promise<void> {
    this.#routes.set(route.path, { path: route.path, source: route.source });
    return Promise.resolve();
  }

  removeRoute(path: string): Promise<void> {
    this.#routes.delete(path);
    return Promise.resolve();
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
