/**
 * 压缩插件测试
 *
 * 测试压缩插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  compressionPlugin,
  type CompressionPluginOptions,
} from "../src/compression/mod.ts";

describe("压缩插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = compressionPlugin();
      const config = plugin.config?.compression as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-compression");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.level).toBe(6);
      expect(config?.threshold).toBe(1024);
      expect(config?.encodings).toEqual(["gzip", "deflate"]);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: CompressionPluginOptions = {
        level: 9,
        threshold: 2048,
        encodings: ["gzip"],
        mimeTypes: ["text/html"],
        debug: true,
      };

      const plugin = compressionPlugin(options);
      const config = plugin.config?.compression as Record<string, unknown>;

      expect(config?.level).toBe(9);
      expect(config?.threshold).toBe(2048);
      expect(config?.encodings).toEqual(["gzip"]);
      expect(config?.mimeTypes).toEqual(["text/html"]);
      expect(config?.debug).toBe(true);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = compressionPlugin();

      expect(plugin.validateConfig?.({ compression: { level: 5 } })).toBe(true);
    });

    it("应该拒绝无效的压缩级别", () => {
      const plugin = compressionPlugin();

      expect(plugin.validateConfig?.({ compression: { level: 0 } })).toBe(
        false,
      );
      expect(plugin.validateConfig?.({ compression: { level: 10 } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的阈值", () => {
      const plugin = compressionPlugin();

      expect(plugin.validateConfig?.({ compression: { threshold: -1 } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的编码列表", () => {
      const plugin = compressionPlugin();

      expect(
        plugin.validateConfig?.({ compression: { encodings: "invalid" } }),
      ).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = compressionPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 compressionConfig 服务", () => {
      const plugin = compressionPlugin({ level: 7 });

      plugin.onInit?.(container);

      const config = container.get("compressionConfig");
      expect(config).toBeDefined();
      expect((config as { level: number }).level).toBe(7);
    });

    it("应该注册 compressionService 服务", () => {
      const plugin = compressionPlugin();

      plugin.onInit?.(container);

      const service = container.get("compressionService");
      expect(service).toBeDefined();
    });

    it("compressionService 应该提供 compress 方法", () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        compress: (
          data: Uint8Array,
          encoding: "gzip" | "deflate",
        ) => Promise<Uint8Array>;
      }>("compressionService");

      expect(service?.compress).toBeDefined();
      expect(typeof service?.compress).toBe("function");
    });

    it("应该在有 logger 且开启 debug 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = compressionPlugin({ debug: true });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("压缩插件"))).toBe(true);
    });
  });

  describe("compressionService", () => {
    it("应该能使用 gzip 压缩数据", async () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        compress: (
          data: Uint8Array,
          encoding: "gzip" | "deflate",
        ) => Promise<Uint8Array>;
      }>("compressionService");

      // 创建测试数据（需要足够大以产生有意义的压缩）
      const text = "Hello World! ".repeat(100);
      const data = new TextEncoder().encode(text);

      const compressed = await service!.compress(data, "gzip");

      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(data.length);
    });

    it("应该能使用 deflate 压缩数据", async () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        compress: (
          data: Uint8Array,
          encoding: "gzip" | "deflate",
        ) => Promise<Uint8Array>;
      }>("compressionService");

      const text = "Hello World! ".repeat(100);
      const data = new TextEncoder().encode(text);

      const compressed = await service!.compress(data, "deflate");

      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(data.length);
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过没有 Accept-Encoding 的请求", async () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(), // 没有 Accept-Encoding
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      // 响应不应该被压缩
      const contentEncoding = ctx.response?.headers.get("Content-Encoding");
      expect(contentEncoding).toBeNull();
    });

    it("应该跳过已压缩的响应", async () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip" }),
        response: new Response(text, {
          headers: {
            "Content-Type": "text/html",
            "Content-Encoding": "gzip", // 已压缩
          },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      // 响应不应该被再次压缩
      const body = await ctx.response?.text();
      expect(body).toBe(text);
    });

    it("应该跳过不支持压缩的 MIME 类型", async () => {
      const plugin = compressionPlugin();
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip" }),
        response: new Response(text, {
          headers: { "Content-Type": "image/png" }, // 不支持的类型
        }),
      };

      await plugin.onResponse?.(ctx, container);

      // 响应不应该被压缩
      const contentEncoding = ctx.response?.headers.get("Content-Encoding");
      expect(contentEncoding).toBeNull();
    });

    it("应该跳过小于阈值的响应", async () => {
      const plugin = compressionPlugin({ threshold: 10000 });
      plugin.onInit?.(container);

      const text = "Hello";
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip" }),
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      // 响应不应该被压缩
      const contentEncoding = ctx.response?.headers.get("Content-Encoding");
      expect(contentEncoding).toBeNull();
    });

    it("应该使用 gzip 压缩响应", async () => {
      const plugin = compressionPlugin({ threshold: 100 });
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip, deflate" }),
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const contentEncoding = ctx.response?.headers.get("Content-Encoding");
      expect(contentEncoding).toBe("gzip");

      // 检查响应体已被压缩（大小应该更小）
      const body = await ctx.response?.arrayBuffer();
      expect(body!.byteLength).toBeLessThan(text.length);
    });

    it("应该使用 deflate 压缩响应", async () => {
      const plugin = compressionPlugin({ threshold: 100, encodings: ["deflate"] });
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "deflate" }),
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const contentEncoding = ctx.response?.headers.get("Content-Encoding");
      expect(contentEncoding).toBe("deflate");
    });

    it("应该添加 Vary 头", async () => {
      const plugin = compressionPlugin({ threshold: 100 });
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip" }),
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const vary = ctx.response?.headers.get("Vary");
      expect(vary).toContain("Accept-Encoding");
    });

    it("应该更新 Content-Length", async () => {
      const plugin = compressionPlugin({ threshold: 100 });
      plugin.onInit?.(container);

      const text = "Hello World! ".repeat(100);
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Encoding": "gzip" }),
        response: new Response(text, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const contentLength = ctx.response?.headers.get("Content-Length");
      expect(contentLength).toBeDefined();
      expect(parseInt(contentLength!)).toBeLessThan(text.length);
    });
  });
});
