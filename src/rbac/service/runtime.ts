/**
 * RBAC service accessor. The instance is a container singleton (`RbacService`).
 * Kept free of scan/API imports so host layouts can load access helpers
 * without bundling Node modules.
 */
import type { ServiceContainer } from "@dreamer/service";
import type { RbacService } from "./service.ts";

export const RBAC_SERVICE = "RbacService";
const RBAC_SERVICE_ALIAS = "rbac";

let boot:
  | ((container: ServiceContainer) => Promise<RbacService>)
  | undefined;

export function getRbacService(container: ServiceContainer): RbacService {
  const service = getRbacServiceOrNull(container);
  if (!service) {
    throw new Error("rbacPlugin is not initialized");
  }
  return service;
}

export function getRbacServiceOrNull(
  container?: ServiceContainer,
): RbacService | null {
  if (!container) return null;
  return container.tryGet<RbacService>(RBAC_SERVICE) ??
    container.tryGet<RbacService>(RBAC_SERVICE_ALIAS) ??
    null;
}

export function registerRbacService(
  container: ServiceContainer,
  service: RbacService,
): void {
  if (container.has(RBAC_SERVICE)) container.remove(RBAC_SERVICE);
  if (container.has(RBAC_SERVICE_ALIAS)) container.remove(RBAC_SERVICE_ALIAS);
  container.registerSingleton(RBAC_SERVICE, () => service, [
    RBAC_SERVICE_ALIAS,
  ]);
}

export function unregisterRbacService(container?: ServiceContainer): void {
  container?.remove(RBAC_SERVICE);
  container?.remove(RBAC_SERVICE_ALIAS);
}

export function setRbacBoot(
  fn: ((container: ServiceContainer) => Promise<RbacService>) | undefined,
): void {
  boot = fn;
}

export async function ensureRbacReady(
  container: ServiceContainer,
): Promise<RbacService> {
  const existing = getRbacServiceOrNull(container);
  if (existing) return existing;
  if (!boot) throw new Error("rbacPlugin is not initialized");
  return await boot(container);
}
