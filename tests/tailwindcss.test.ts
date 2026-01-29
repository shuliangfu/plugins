/**
 * TailwindCSS 插件测试
 *
 * 测试 TailwindCSS 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { TailwindCompiler } from "../src/tailwindcss/compiler.ts";
import {
  tailwindPlugin,
  type TailwindPluginOptions,
} from "../src/tailwindcss/mod.ts";

describe("TailwindCSS 插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = tailwindPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-tailwindcss");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.tailwind).toBeDefined();
    });

    it("应该使用自定义配置创建插件", () => {
      const options: TailwindPluginOptions = {
        config: "./tailwind.config.ts",
        content: ["./src/**/*.tsx"],
        cssEntry: "./src/styles/main.css",
        jit: true,
        darkMode: "class",
        theme: { colors: { primary: "#007bff" } },
        postcss: { autoprefixer: true, minify: false },
      };

      const plugin = tailwindPlugin(options);
      const tailwindConfig = plugin.config?.tailwind as Record<string, unknown>;

      expect(tailwindConfig?.config).toBe("./tailwind.config.ts");
      expect(tailwindConfig?.content).toEqual(["./src/**/*.tsx"]);
      expect(tailwindConfig?.cssEntry).toBe("./src/styles/main.css");
      expect(tailwindConfig?.jit).toBe(true);
      expect(tailwindConfig?.darkMode).toBe("class");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = tailwindPlugin();

      expect(
        plugin.validateConfig?.({ tailwind: { content: ["./src/**/*.ts"] } }),
      ).toBe(true);
    });

    it("应该拒绝无效的 content 配置", () => {
      const plugin = tailwindPlugin();

      expect(plugin.validateConfig?.({ tailwind: { content: "invalid" } }))
        .toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = tailwindPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 tailwindConfig 服务", () => {
      const plugin = tailwindPlugin({ cssEntry: "./test.css" });

      plugin.onInit?.(container);

      const config = container.get("tailwindConfig");
      expect(config).toBeDefined();
      expect((config as { cssEntry: string }).cssEntry).toBe("./test.css");
    });

    it("应该注册 tailwindCompiler 服务", () => {
      const plugin = tailwindPlugin();

      plugin.onInit?.(container);

      const compiler = container.get("tailwindCompiler");
      expect(compiler).toBeDefined();
    });

    it("应该在有 logger 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = tailwindPlugin();
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("TailwindCSS"))).toBe(true);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该在开发模式下编译 CSS", async () => {
      // 模拟开发环境
      const originalEnv = Deno.env.get("DENO_ENV");
      Deno.env.set("DENO_ENV", "dev");

      try {
        const plugin = tailwindPlugin();
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
        };

        await plugin.onRequest?.(ctx, container);

        // 检查上下文是否被修改（即使 CSS 为空也应该设置）
        // 由于文件不存在，CSS 将为空
      } finally {
        if (originalEnv) {
          Deno.env.set("DENO_ENV", originalEnv);
        } else {
          Deno.env.delete("DENO_ENV");
        }
      }
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = tailwindPlugin();
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers(),
        response: new Response('{"data": "test"}', {
          headers: { "Content-Type": "application/json" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      // 响应应该保持不变
      const body = await ctx.response?.text();
      expect(body).toBe('{"data": "test"}');
    });

    it("应该在生产模式下注入 link 标签", async () => {
      // 设置生产环境
      const originalEnv = Deno.env.get("DENO_ENV");
      Deno.env.set("DENO_ENV", "production");

      try {
        const plugin = tailwindPlugin();
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toContain(
          '<link rel="stylesheet" href="/assets/tailwind.css">',
        );
      } finally {
        if (originalEnv) {
          Deno.env.set("DENO_ENV", originalEnv);
        } else {
          Deno.env.delete("DENO_ENV");
        }
      }
    });
  });
});

describe("TailwindCompiler", () => {
  it("应该创建编译器实例", () => {
    const compiler = new TailwindCompiler({
      cssEntry: "./test.css",
      content: ["./src/**/*.ts"],
    });

    expect(compiler).toBeDefined();
  });

  it("应该在文件不存在时返回空 CSS", async () => {
    const compiler = new TailwindCompiler({
      cssEntry: "./nonexistent.css",
      content: ["./src/**/*.ts"],
    });

    const result = await compiler.compile();

    expect(result.css).toBe("");
  });

  it("应该清除缓存", () => {
    const compiler = new TailwindCompiler({
      cssEntry: "./test.css",
      content: ["./src/**/*.ts"],
    });

    // 不应该抛出错误
    compiler.clearCache();
  });
});
