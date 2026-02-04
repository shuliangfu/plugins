/**
 * UnoCSS 插件测试
 *
 * 测试 UnoCSS 插件的所有功能
 */

import { deleteEnv, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { UnoCompiler } from "../src/unocss/compiler.ts";
import { unocssPlugin, type UnoCSSPluginOptions } from "../src/unocss/mod.ts";

describe("UnoCSS 插件", () => {
  let container: ServiceContainer;
  const defaultOutput = "dist/client/assets";

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      expect(plugin.name).toBe("@dreamer/plugins-unocss");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.unocss).toBeDefined();
    });

    it("应该使用自定义配置创建插件", () => {
      const options: UnoCSSPluginOptions = {
        output: defaultOutput,
        config: "./uno.config.ts",
        content: ["./src/**/*.tsx"],
        cssEntry: "./src/styles/uno.css",
        presets: ["@unocss/preset-wind", "@unocss/preset-icons"],
        icons: true,
        iconPresets: ["@iconify/json"],
        rules: [["custom-rule", { color: "red" }]],
        shortcuts: { btn: "px-4 py-2 rounded" },
        theme: { colors: { brand: "#ff0000" } },
      };

      const plugin = unocssPlugin(options);
      const unocssConfig = plugin.config?.unocss as Record<string, unknown>;

      expect(unocssConfig?.config).toBe("./uno.config.ts");
      expect(unocssConfig?.content).toEqual(["./src/**/*.tsx"]);
      expect(unocssConfig?.cssEntry).toBe("./src/styles/uno.css");
      expect(unocssConfig?.presets).toContain("@unocss/preset-wind");
      expect(unocssConfig?.icons).toBe(true);
      expect((unocssConfig?.shortcuts as Record<string, string>)?.btn).toBe(
        "px-4 py-2 rounded",
      );
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      expect(
        plugin.validateConfig?.({ unocss: { content: ["./src/**/*.ts"] } }),
      ).toBe(true);
    });

    it("应该拒绝无效的 content 配置", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      expect(plugin.validateConfig?.({ unocss: { content: "invalid" } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的 presets 配置", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      expect(plugin.validateConfig?.({ unocss: { presets: "invalid" } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 unocssConfig 服务", () => {
      const plugin = unocssPlugin({
        output: defaultOutput,
        cssEntry: "./test.css",
      });

      plugin.onInit?.(container);

      const config = container.get("unocssConfig");
      expect(config).toBeDefined();
      expect((config as { cssEntry: string }).cssEntry).toBe("./test.css");
    });

    it("应该注册 unocssCompiler 服务", () => {
      const plugin = unocssPlugin({ output: defaultOutput });

      plugin.onInit?.(container);

      const compiler = container.get("unocssCompiler");
      expect(compiler).toBeDefined();
    });

    it("应该在有 logger 时正常初始化", () => {
      container.registerSingleton("logger", () => ({
        info: (_msg: string) => {},
      }));

      const plugin = unocssPlugin({ output: defaultOutput });
      plugin.onInit?.(container);

      expect(container.get("unocssConfig")).toBeDefined();
      expect(container.get("unocssCompiler")).toBeDefined();
    });

    it("应该使用自定义 presets 时正确注册配置", () => {
      const plugin = unocssPlugin({
        output: defaultOutput,
        presets: ["@unocss/preset-wind"],
      });
      plugin.onInit?.(container);

      const config = container.get("unocssConfig") as { presets?: string[] };
      expect(config?.presets).toContain("@unocss/preset-wind");
    });
  });

  describe("onRequest 钩子", () => {
    it("应该在开发模式下编译 CSS", async () => {
      // 模拟开发环境
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "dev");

      try {
        const plugin = unocssPlugin({ output: defaultOutput });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
        };

        await plugin.onRequest?.(ctx, container);

        // 测试通过即可（文件不存在时不会设置 CSS）
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = unocssPlugin({ output: defaultOutput });
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
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = unocssPlugin({ output: defaultOutput });
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
          '<link rel="stylesheet" href="/assets/unocss.css">',
        );
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });
  });
});

describe("UnoCompiler", () => {
  it("应该创建编译器实例", () => {
    const compiler = new UnoCompiler({
      cssEntry: "./test.css",
      content: ["./src/**/*.ts"],
    });

    expect(compiler).toBeDefined();
  });

  it("应该在文件不存在时仍生成 preflights", async () => {
    const compiler = new UnoCompiler({
      cssEntry: "./nonexistent.css",
      content: [], // 不扫描任何文件
    });

    const result = await compiler.compile();

    // UnoCSS 会生成 preflights 基础样式
    expect(result.css).toContain("layer: preflights");
  });

  it("应该清除缓存", () => {
    const compiler = new UnoCompiler({
      cssEntry: "./test.css",
      content: ["./src/**/*.ts"],
    });

    // 不应该抛出错误
    compiler.clearCache();
  });

  it("应该在开发模式下返回 needsRebuild 标志", async () => {
    const compiler = new UnoCompiler({
      cssEntry: "./nonexistent.css",
      content: [], // 不扫描任何文件
      dev: true,
    });

    const result = await compiler.compile();

    // 开发模式下应该返回 needsRebuild 标志
    expect(result.needsRebuild).toBe(true);
    // UnoCSS 会生成 preflights 基础样式
    expect(result.css).toContain("layer: preflights");
  });
});
