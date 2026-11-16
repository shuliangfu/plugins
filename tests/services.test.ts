/**
 * servicesPlugin: register host services as container singletons.
 */

import { ServiceContainer } from "@dreamer/service";
import { describe, expect, it } from "@dreamer/test";
import { registerServices, servicesPlugin } from "../src/services/mod.ts";

describe("servicesPlugin", () => {
  it("exposes plugin metadata and registers factories as singletons", () => {
    const container = new ServiceContainer();
    class DemoService {
      constructor(readonly container: ServiceContainer, readonly n: number) {}
    }

    const plugin = servicesPlugin({
      demoService: (c) => new DemoService(c, 1),
    });

    expect(plugin.name).toBe("@dreamer/plugins-services");
    expect(plugin.version).toBe("1.0.0");
    plugin.onInit?.(container);

    const first = container.get<DemoService>("demoService");
    const second = container.get<DemoService>("demoService");
    expect(first).toBeInstanceOf(DemoService);
    expect(first.n).toBe(1);
    expect(first.container).toBe(container);
    expect(second).toBe(first);
  });

  it("registers aliases and lets one factory read another service", () => {
    const container = new ServiceContainer();
    registerServices(container, {
      nameService: () => ({ name: "senvis" }),
      greetService: {
        factory: (c) => ({
          hello: () => `hello ${c.get<{ name: string }>("nameService").name}`,
        }),
        aliases: ["greet"],
      },
    });

    expect(container.get<{ hello: () => string }>("greet").hello()).toBe(
      "hello senvis",
    );
  });

  it("throws when the same name is registered twice", () => {
    const container = new ServiceContainer();
    const plugin = servicesPlugin({
      demoService: () => ({ ok: true }),
    });
    plugin.onInit?.(container);
    expect(() => plugin.onInit?.(container)).toThrow();
  });
});
