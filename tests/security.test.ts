/**
 * 安全头插件测试
 *
 * 测试安全头插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  securityPlugin,
  type SecurityPluginOptions,
} from "../src/security/mod.ts";

describe("安全头插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = securityPlugin();
      const config = plugin.config?.security as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-security");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.frameOptions).toBe("SAMEORIGIN");
      expect(config?.contentTypeOptions).toBe("nosniff");
      expect(config?.xssProtection).toBe("1; mode=block");
      expect(config?.referrerPolicy).toBe("strict-origin-when-cross-origin");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: SecurityPluginOptions = {
        frameOptions: "DENY",
        contentTypeOptions: false,
        xssProtection: false,
        hsts: {
          maxAge: 63072000,
          includeSubDomains: true,
          preload: true,
        },
        referrerPolicy: "no-referrer",
      };

      const plugin = securityPlugin(options);
      const config = plugin.config?.security as Record<string, unknown>;

      expect(config?.frameOptions).toBe("DENY");
      expect(config?.contentTypeOptions).toBe(false);
      expect(config?.xssProtection).toBe(false);
      expect(config?.referrerPolicy).toBe("no-referrer");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = securityPlugin();

      expect(
        plugin.validateConfig?.({ security: { frameOptions: "DENY" } }),
      ).toBe(true);
    });

    it("应该拒绝无效的 frameOptions 配置", () => {
      const plugin = securityPlugin();

      expect(
        plugin.validateConfig?.({ security: { frameOptions: "INVALID" } }),
      ).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = securityPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 securityConfig 服务", () => {
      const plugin = securityPlugin({ frameOptions: "DENY" });

      plugin.onInit?.(container);

      const config = container.get("securityConfig");
      expect(config).toBeDefined();
      expect((config as { frameOptions: string }).frameOptions).toBe("DENY");
    });

    it("应该在有 logger 且开启 debug 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = securityPlugin({ debug: true });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("安全头插件"))).toBe(true);
    });
  });

  describe("onResponse 钩子", () => {
    it("应该添加默认安全头", () => {
      const plugin = securityPlugin();
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>", {
          headers: { "Content-Type": "text/html" },
        }),
      };

      plugin.onResponse?.(ctx, container);

      expect(ctx.response?.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(ctx.response?.headers.get("X-Content-Type-Options")).toBe(
        "nosniff",
      );
      expect(ctx.response?.headers.get("X-XSS-Protection")).toBe(
        "1; mode=block",
      );
      expect(ctx.response?.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("应该添加 HSTS 头", () => {
      const plugin = securityPlugin({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false,
        },
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      const hsts = ctx.response?.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).not.toContain("preload");
    });

    it("应该添加带 preload 的 HSTS 头", () => {
      const plugin = securityPlugin({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      const hsts = ctx.response?.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("preload");
    });

    it("应该添加 CSP 头", () => {
      const plugin = securityPlugin({
        csp: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      const csp = ctx.response?.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https:");
    });

    it("应该添加完整的 CSP 指令", () => {
      const plugin = securityPlugin({
        csp: {
          defaultSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.example.com"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: true,
          reportUri: "/csp-report",
        },
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      const csp = ctx.response?.headers.get("Content-Security-Policy");
      expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
      expect(csp).toContain("connect-src 'self' https://api.example.com");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
      expect(csp).toContain("report-uri /csp-report");
    });

    it("应该添加 Permissions-Policy 头", () => {
      const plugin = securityPlugin({
        permissionsPolicy: {
          camera: [],
          microphone: [],
          geolocation: ["self"],
          payment: ["self", "https://payment.example.com"],
        },
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      const pp = ctx.response?.headers.get("Permissions-Policy");
      expect(pp).toContain("camera=()");
      expect(pp).toContain("microphone=()");
      expect(pp).toContain("geolocation=(self)");
      expect(pp).toContain("payment=(self https://payment.example.com)");
    });

    it("应该添加其他安全头", () => {
      const plugin = securityPlugin({
        dnsPrefetchControl: "off",
        downloadOptions: "noopen",
        crossDomainPolicies: "none",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      expect(ctx.response?.headers.get("X-DNS-Prefetch-Control")).toBe("off");
      expect(ctx.response?.headers.get("X-Download-Options")).toBe("noopen");
      expect(ctx.response?.headers.get("X-Permitted-Cross-Domain-Policies"))
        .toBe("none");
    });

    it("应该能禁用特定安全头", () => {
      const plugin = securityPlugin({
        frameOptions: false,
        xssProtection: false,
        hsts: false,
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response("<html></html>"),
      };

      plugin.onResponse?.(ctx, container);

      expect(ctx.response?.headers.get("X-Frame-Options")).toBeNull();
      expect(ctx.response?.headers.get("X-XSS-Protection")).toBeNull();
      expect(ctx.response?.headers.get("Strict-Transport-Security")).toBeNull();
      // 其他头应该仍然存在
      expect(ctx.response?.headers.get("X-Content-Type-Options")).toBe(
        "nosniff",
      );
    });

    it("应该跳过没有响应的请求", () => {
      const plugin = securityPlugin();
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      // 不应该抛出错误
      plugin.onResponse?.(ctx, container);

      expect(ctx.response).toBeUndefined();
    });
  });
});
