/**
 * @module @dreamer/plugins/services
 *
 * Register host application services as container singletons.
 *
 * Pass an explicit name → factory map. Factories may receive the container.
 * This plugin does not scan directories and does not register services that
 * another plugin already owns (for example `RbacService` from `rbacPlugin`).
 */

import type { Plugin } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/** Create a service instance. Called once, on first `container.get(name)`. */
export type ServiceFactory<T = unknown> = (container: ServiceContainer) => T;

/** A factory, or a factory plus optional aliases. */
export type ServiceEntry<T = unknown> =
  | ServiceFactory<T>
  | {
    factory: ServiceFactory<T>;
    aliases?: string[];
  };

/** Explicit service map. Keys are container names (for example `AuthService`). */
export type ServicesPluginOptions = Record<string, ServiceEntry>;

/**
 * Register each entry as a container singleton.
 * Re-registering a name that is already on the container throws.
 */
export function registerServices(
  container: ServiceContainer,
  services: ServicesPluginOptions,
): void {
  for (const [name, entry] of Object.entries(services)) {
    const factory = typeof entry === "function" ? entry : entry.factory;
    const aliases = typeof entry === "function" ? undefined : entry.aliases;
    container.registerSingleton(name, () => factory(container), aliases);
  }
}

/**
 * Create the services plugin.
 *
 * @example
 * ```ts
 * app.registerPlugin(servicesPlugin({
 *   AuthService: (c) => new AuthService(c),
 *   MenuService: (c) => new MenuService(c),
 * }));
 * ```
 */
export function servicesPlugin(services: ServicesPluginOptions): Plugin {
  return {
    name: "@dreamer/plugins-services",
    version: "1.0.0",
    onInit(container: ServiceContainer) {
      registerServices(container, services);
    },
  };
}

export default servicesPlugin;
