/**
 * i18n 国际化插件测试
 *
 * 测试 i18n 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { i18nPlugin, type I18nPluginOptions } from "../src/i18n/mod.ts";

describe("i18n 国际化插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = i18nPlugin();
      const i18nConfig = plugin.config?.i18n as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-i18n");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.i18n).toBeDefined();
      expect(i18nConfig?.defaultLocale).toBe("zh-CN");
      expect(i18nConfig?.locales).toContain("zh-CN");
      expect(i18nConfig?.locales).toContain("en-US");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: I18nPluginOptions = {
        defaultLocale: "en-US",
        locales: ["en-US", "zh-CN", "ja-JP", "ko-KR"],
        localesDir: "./locales",
        format: "yaml",
        routeLocalization: true,
        routePrefix: "/:lang",
        detectLanguage: true,
        detectMethods: ["header", "cookie"],
        cookieName: "lang",
        queryName: "locale",
        dateFormat: { date: "MM/DD/YYYY" },
        numberFormat: { decimals: 3 },
      };

      const plugin = i18nPlugin(options);
      const i18nConfig = plugin.config?.i18n as Record<string, unknown>;

      expect(i18nConfig?.defaultLocale).toBe("en-US");
      expect(i18nConfig?.locales).toEqual([
        "en-US",
        "zh-CN",
        "ja-JP",
        "ko-KR",
      ]);
      expect(i18nConfig?.format).toBe("yaml");
      expect(i18nConfig?.cookieName).toBe("lang");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = i18nPlugin();

      expect(plugin.validateConfig?.({ i18n: { locales: ["en", "zh"] } })).toBe(
        true,
      );
    });

    it("应该拒绝无效的 locales 配置", () => {
      const plugin = i18nPlugin();

      expect(plugin.validateConfig?.({ i18n: { locales: "invalid" } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的 detectMethods 配置", () => {
      const plugin = i18nPlugin();

      expect(plugin.validateConfig?.({ i18n: { detectMethods: "header" } }))
        .toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = i18nPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 i18nConfig 服务", () => {
      const plugin = i18nPlugin({ defaultLocale: "ja-JP" });

      plugin.onInit?.(container);

      const config = container.get("i18nConfig");
      expect(config).toBeDefined();
      expect((config as { defaultLocale: string }).defaultLocale).toBe("ja-JP");
    });

    it("应该注册 i18nService 服务", () => {
      const plugin = i18nPlugin();

      plugin.onInit?.(container);

      const service = container.get("i18nService");
      expect(service).toBeDefined();
    });

    it("i18nService 应该提供 t 函数", () => {
      const plugin = i18nPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        t: (key: string) => string;
      }>("i18nService");

      // t 函数应该返回 key（未实现翻译时）
      expect(service?.t("hello")).toBe("hello");
    });

    it("i18nService 应该提供 getLocale 和 setLocale", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getLocale: () => string;
        setLocale: (locale: string) => void;
      }>("i18nService");

      expect(service?.getLocale()).toBe("zh-CN");

      service?.setLocale("en-US");
      expect(service?.getLocale()).toBe("en-US");
    });

    it("i18nService 应该忽略不支持的语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getLocale: () => string;
        setLocale: (locale: string) => void;
      }>("i18nService");

      service?.setLocale("fr-FR"); // 不支持的语言
      expect(service?.getLocale()).toBe("zh-CN"); // 应该保持不变
    });

    it("应该在有 logger 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = i18nPlugin();
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("i18n"))).toBe(true);
    });
  });

  describe("onRequest 钩子 - 语言检测", () => {
    it("应该从 Accept-Language 头检测语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
        detectMethods: ["header"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Language": "en-US,en;q=0.9" }),
      };

      plugin.onRequest?.(ctx, container);

      expect((ctx as Record<string, unknown>).locale).toBe("en-US");
    });

    it("应该从 Cookie 检测语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
        detectMethods: ["cookie"],
        cookieName: "lang",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: {
          get: (name: string) => name === "lang" ? "en-US" : undefined,
        },
      };

      plugin.onRequest?.(ctx, container);

      expect((ctx as Record<string, unknown>).locale).toBe("en-US");
    });

    it("应该从 Query 参数检测语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
        detectMethods: ["query"],
        queryName: "lang",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/?lang=en-US"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/?lang=en-US"),
        headers: new Headers(),
        query: { lang: "en-US" },
      };

      plugin.onRequest?.(ctx, container);

      expect((ctx as Record<string, unknown>).locale).toBe("en-US");
    });

    it("应该从路径检测语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en-US"],
        detectMethods: ["path"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/en-US/about"),
        path: "/en-US/about",
        method: "GET",
        url: new URL("http://localhost/en-US/about"),
        headers: new Headers(),
      };

      plugin.onRequest?.(ctx, container);

      expect((ctx as Record<string, unknown>).locale).toBe("en-US");
    });

    it("未检测到时应该使用默认语言", () => {
      const plugin = i18nPlugin({
        defaultLocale: "ja-JP",
        locales: ["ja-JP", "ko-KR"],
        detectMethods: ["header"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Language": "fr-FR" }), // 不支持的语言
      };

      plugin.onRequest?.(ctx, container);

      expect((ctx as Record<string, unknown>).locale).toBe("ja-JP");
    });

    it("禁用语言检测时应该跳过", () => {
      const plugin = i18nPlugin({
        defaultLocale: "zh-CN",
        detectLanguage: false,
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers({ "Accept-Language": "en-US" }),
      };

      plugin.onRequest?.(ctx, container);

      // 不应该设置 locale
      expect((ctx as Record<string, unknown>).locale).toBeUndefined();
    });
  });

  describe("onResponse 钩子", () => {
    it("应该设置响应头", async () => {
      const plugin = i18nPlugin({ defaultLocale: "zh-CN" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        locale: "zh-CN",
        response: new Response("test", {
          headers: { "Content-Type": "text/plain" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      expect(ctx.response?.headers.get("Content-Language")).toBe("zh-CN");
      expect(ctx.response?.headers.get("X-Locale")).toBe("zh-CN");
    });

    it("应该在 HTML 中注入 lang 属性", async () => {
      const plugin = i18nPlugin({ defaultLocale: "en-US" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        locale: "en-US",
        response: new Response("<html><head></head><body></body></html>", {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      expect(body).toContain('lang="en-US"');
    });

    it("应该更新已存在的 lang 属性", async () => {
      const plugin = i18nPlugin({ defaultLocale: "ja-JP" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        locale: "ja-JP",
        response: new Response(
          '<html lang="en"><head></head><body></body></html>',
          {
            headers: { "Content-Type": "text/html" },
          },
        ),
      };

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      expect(body).toContain('lang="ja-JP"');
      expect(body).not.toContain('lang="en"');
    });
  });
});
