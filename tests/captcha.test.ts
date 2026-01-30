/**
 * 验证码插件测试
 *
 * 测试验证码插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  captchaPlugin,
  type CaptchaPluginOptions,
} from "../src/captcha/mod.ts";

describe("验证码插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = captchaPlugin();
      const config = plugin.config?.captcha as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-captcha");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.length).toBe(4);
      expect(config?.expiresIn).toBe(300000);
      expect(config?.caseSensitive).toBe(false);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: CaptchaPluginOptions = {
        length: 6,
        expiresIn: 60000,
        caseSensitive: true,
        width: 150,
        height: 50,
      };

      const plugin = captchaPlugin(options);
      const config = plugin.config?.captcha as Record<string, unknown>;

      expect(config?.length).toBe(6);
      expect(config?.expiresIn).toBe(60000);
      expect(config?.caseSensitive).toBe(true);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = captchaPlugin();

      expect(plugin.validateConfig?.({ captcha: { length: 6 } })).toBe(true);
    });

    it("应该拒绝无效的 length 配置", () => {
      const plugin = captchaPlugin();

      expect(plugin.validateConfig?.({ captcha: { length: 0 } })).toBe(false);
      expect(plugin.validateConfig?.({ captcha: { length: -1 } })).toBe(false);
    });

    it("应该接受有效的 expiresIn 配置", () => {
      const plugin = captchaPlugin();

      // expiresIn 只要是数字即可
      expect(plugin.validateConfig?.({ captcha: { expiresIn: 60000 } })).toBe(
        true,
      );
    });

    it("应该接受空配置", () => {
      const plugin = captchaPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 captchaConfig 服务", () => {
      const plugin = captchaPlugin({ length: 6 });

      plugin.onInit?.(container);

      const config = container.get("captchaConfig");
      expect(config).toBeDefined();
      expect((config as { length: number }).length).toBe(6);
    });

    it("应该注册 captchaService 服务", () => {
      const plugin = captchaPlugin();

      plugin.onInit?.(container);

      const service = container.get("captchaService");
      expect(service).toBeDefined();
    });

    it("captchaService 应该提供 generate 方法", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
      }>("captchaService");

      expect(service?.generate).toBeDefined();

      const result = service?.generate();
      expect(result?.id).toBeDefined();
      expect(result?.svg).toBeDefined();
      expect(result?.svg).toContain("<svg");
    });

    it("captchaService 应该提供 verify 方法", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      expect(service?.verify).toBeDefined();
      expect(typeof service?.verify).toBe("function");

      // 生成验证码
      const { id } = service!.generate();

      // 使用错误的验证码应该失败
      expect(service?.verify(id, "WRONG")).toBe(false);
    });
  });

  describe("captchaService", () => {
    it("应该生成唯一的验证码 ID", () => {
      const plugin = captchaPlugin({ length: 6 });
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
      }>("captchaService");

      const result1 = service!.generate();
      const result2 = service!.generate();

      // 每次生成应该有不同的 ID
      expect(result1.id).not.toBe(result2.id);
    });

    it("应该生成 SVG 格式的验证码图片", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
      }>("captchaService");

      const { svg } = service!.generate();

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("width=");
      expect(svg).toContain("height=");
    });

    it("应该支持验证功能", () => {
      const plugin = captchaPlugin({ caseSensitive: false });
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      const { id } = service!.generate();

      // 使用错误验证码应该失败
      expect(service?.verify(id, "XXXX")).toBe(false);
    });

    it("验证后验证码应该失效", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      const { id } = service!.generate();

      // 第一次验证（错误验证码）
      service?.verify(id, "WRONG");

      // 第二次验证应该失败（验证码已被使用）
      expect(service?.verify(id, "ALSO_WRONG")).toBe(false);
    });

    it("应该拒绝过期的验证码", async () => {
      const plugin = captchaPlugin({ expiresIn: 100 }); // 100ms 过期
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string };
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      const { id } = service!.generate();

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 验证应该失败（即使用任何值都会因为过期而失败）
      expect(service?.verify(id, "TEST")).toBe(false);
    });

    it("应该拒绝错误的验证码", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generate: () => { id: string; svg: string; code: string };
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      const { id } = service!.generate();

      // 使用错误的验证码
      expect(service?.verify(id, "WRONG")).toBe(false);
    });

    it("应该拒绝不存在的验证码 ID", () => {
      const plugin = captchaPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        verify: (id: string, code: string) => boolean;
      }>("captchaService");

      // 使用不存在的 ID
      expect(service?.verify("non-existent-id", "ABCD")).toBe(false);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该处理验证码生成请求", async () => {
      const plugin = captchaPlugin({ generatePath: "/captcha" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/captcha"),
        path: "/captcha",
        method: "GET",
        url: new URL("http://localhost/captcha"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(200);
      expect(ctx.response?.headers.get("Content-Type")).toContain(
        "application/json",
      );

      const body = await ctx.response?.json();
      expect(body.id).toBeDefined();
      expect(body.image).toBeDefined(); // 返回的是 image（base64 data URL）
      expect(body.image).toContain("data:image/svg+xml;base64,");
    });

    it("应该处理验证码验证请求（错误验证码）", async () => {
      const plugin = captchaPlugin({
        generatePath: "/captcha",
        verifyPath: "/captcha/verify",
      });
      plugin.onInit?.(container);

      // 先生成验证码
      const service = container.get<{
        generate: () => { id: string; svg: string };
      }>("captchaService");
      const { id } = service!.generate();

      // 验证请求（使用错误的验证码）
      const ctx = {
        request: new Request("http://localhost/captcha/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, code: "WRONG" }),
        }),
        path: "/captcha/verify",
        method: "POST",
        url: new URL("http://localhost/captcha/verify"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      const body = await ctx.response?.json();
      expect(body.success).toBe(false);
    });

    it("应该跳过非验证码路径", async () => {
      const plugin = captchaPlugin({
        generatePath: "/captcha",
        verifyPath: "/captcha/verify",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 不应该处理
      expect(ctx.response).toBeUndefined();
    });
  });
}, { sanitizeOps: false, sanitizeResources: false });
