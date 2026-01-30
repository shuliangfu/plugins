/**
 * 社交分享插件测试
 *
 * 测试社交分享插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  socialPlugin,
  type SocialPlatform,
  type ShareContent,
  type OAuthProvider,
} from "../src/social/mod.ts";

describe("社交分享插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = socialPlugin();
      const config = plugin.config?.social as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-social");
      expect(plugin.version).toBe("1.0.0");
      // 默认平台包含 twitter, facebook, linkedin, weibo, wechat
      expect((config?.platforms as string[])?.length).toBeGreaterThan(0);
    });

    it("应该使用自定义配置创建插件", () => {
      const plugin = socialPlugin({
        platforms: ["twitter", "facebook", "weibo"],
        siteUrl: "https://example.com",
      });
      const config = plugin.config?.social as Record<string, unknown>;

      expect(config?.platforms).toEqual(["twitter", "facebook", "weibo"]);
      expect(config?.siteUrl).toBe("https://example.com");
    });

    it("应该支持 OAuth 配置", () => {
      const plugin = socialPlugin({
        oauth: {
          github: {
            clientId: "github_client_id",
            clientSecret: "github_secret",
            callbackUrl: "https://example.com/api/auth/github/callback",
          },
        },
      });
      const config = plugin.config?.social as Record<string, unknown>;

      expect((config?.oauthProviders as string[])?.length).toBe(1);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = socialPlugin();

      expect(
        plugin.validateConfig?.({ social: { platforms: ["twitter"] } }),
      ).toBe(true);
    });

    it("应该接受空配置", () => {
      const plugin = socialPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 socialConfig 服务", () => {
      const plugin = socialPlugin({ platforms: ["twitter"] });

      plugin.onInit?.(container);

      const config = container.get("socialConfig");
      expect(config).toBeDefined();
      expect((config as { platforms: string[] }).platforms).toEqual(["twitter"]);
    });

    it("应该注册 socialService 服务", () => {
      const plugin = socialPlugin();

      plugin.onInit?.(container);

      const service = container.get("socialService");
      expect(service).toBeDefined();
    });

    it("socialService 应该提供 getShareUrl 方法", () => {
      const plugin = socialPlugin({ platforms: ["twitter", "facebook"] });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      expect(service?.getShareUrl).toBeDefined();
    });

    it("socialService 应该提供 getOAuthUrl 方法", () => {
      const plugin = socialPlugin({
        oauth: {
          github: {
            clientId: "test",
            clientSecret: "test",
            callbackUrl: "http://localhost/callback",
          },
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getOAuthUrl: (provider: OAuthProvider) => string | null;
      }>("socialService");

      expect(service?.getOAuthUrl).toBeDefined();
    });

    it("socialService 应该提供 getEnabledPlatforms 方法", () => {
      const plugin = socialPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        getEnabledPlatforms: () => SocialPlatform[];
      }>("socialService");

      expect(service?.getEnabledPlatforms).toBeDefined();
    });
  });

  describe("socialService - 分享链接", () => {
    it("应该生成 Twitter 分享链接", () => {
      const plugin = socialPlugin({
        platforms: ["twitter"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      const shareUrl = service?.getShareUrl("twitter", {
        title: "Check this out!",
        url: "https://example.com",
      });

      expect(shareUrl).toContain("twitter.com/intent/tweet");
      expect(shareUrl).toContain("url=");
      expect(shareUrl).toContain("text=");
    });

    it("应该生成 Facebook 分享链接", () => {
      const plugin = socialPlugin({
        platforms: ["facebook"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      const shareUrl = service?.getShareUrl("facebook", {
        title: "Test",
        url: "https://example.com",
      });

      expect(shareUrl).toContain("facebook.com/sharer");
      expect(shareUrl).toContain("u=");
    });

    it("应该生成微博分享链接", () => {
      const plugin = socialPlugin({ platforms: ["weibo"] });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      const shareUrl = service?.getShareUrl("weibo", {
        title: "分享内容",
        url: "https://example.com",
      });

      expect(shareUrl).toContain("service.weibo.com/share");
    });

    it("应该生成 LinkedIn 分享链接", () => {
      const plugin = socialPlugin({ platforms: ["linkedin"] });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      const shareUrl = service?.getShareUrl("linkedin", {
        title: "Test",
        url: "https://example.com",
      });

      expect(shareUrl).toContain("linkedin.com/sharing");
    });

    it("应该生成微信分享链接", () => {
      const plugin = socialPlugin({
        platforms: ["wechat"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ) => string;
      }>("socialService");

      const shareUrl = service?.getShareUrl("wechat", {
        title: "Test",
        url: "https://example.com",
      });

      expect(shareUrl).toContain("weixin://");
    });

    it("应该生成所有平台的分享链接", () => {
      const plugin = socialPlugin({
        platforms: ["twitter", "facebook", "linkedin"],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getAllShareUrls: (
          content: ShareContent,
        ) => Record<SocialPlatform, string>;
      }>("socialService");

      const urls = service?.getAllShareUrls({
        title: "Test",
        url: "https://example.com",
      });

      expect(urls?.twitter).toContain("twitter.com");
      expect(urls?.facebook).toContain("facebook.com");
      expect(urls?.linkedin).toContain("linkedin.com");
    });
  });

  describe("socialService - OAuth", () => {
    it("应该生成 GitHub OAuth 链接", () => {
      const plugin = socialPlugin({
        oauth: {
          github: {
            clientId: "github_client_id",
            clientSecret: "github_secret",
            callbackUrl: "https://example.com/api/auth/github/callback",
          },
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getOAuthUrl: (provider: OAuthProvider) => string | null;
      }>("socialService");

      const oauthUrl = service?.getOAuthUrl("github");

      expect(oauthUrl).toContain("github.com/login/oauth/authorize");
      expect(oauthUrl).toContain("client_id=");
    });

    it("应该生成 Google OAuth 链接", () => {
      const plugin = socialPlugin({
        oauth: {
          google: {
            clientId: "google_client_id",
            clientSecret: "google_secret",
            callbackUrl: "https://example.com/api/auth/google/callback",
          },
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getOAuthUrl: (provider: OAuthProvider) => string | null;
      }>("socialService");

      const oauthUrl = service?.getOAuthUrl("google");

      expect(oauthUrl).toContain("accounts.google.com");
      expect(oauthUrl).toContain("client_id=");
    });

    it("应该返回 null 当 OAuth 提供商未配置时", () => {
      const plugin = socialPlugin({});
      plugin.onInit?.(container);

      const service = container.get<{
        getOAuthUrl: (provider: OAuthProvider) => string | null;
      }>("socialService");

      const oauthUrl = service?.getOAuthUrl("github");

      expect(oauthUrl).toBeNull();
    });

    it("应该返回可用的 OAuth 提供商列表", () => {
      const plugin = socialPlugin({
        oauth: {
          github: {
            clientId: "test",
            clientSecret: "test",
            callbackUrl: "http://localhost/callback",
          },
          google: {
            clientId: "test",
            clientSecret: "test",
            callbackUrl: "http://localhost/callback",
          },
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getAvailableOAuthProviders: () => OAuthProvider[];
      }>("socialService");

      const providers = service?.getAvailableOAuthProviders();

      expect(providers).toContain("github");
      expect(providers).toContain("google");
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = socialPlugin({
        platforms: ["twitter"],
        injectShareButtons: true,
      });
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

      const body = await ctx.response?.text();
      expect(body).toBe('{"data": "test"}');
    });

    it("应该为 HTML 响应注入分享脚本", async () => {
      const plugin = socialPlugin({
        platforms: ["twitter", "facebook"],
        injectShareButtons: true,
      });
      plugin.onInit?.(container);

      const html = `<html><head></head><body><div id="share"></div></body></html>`;
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      // 响应应该包含分享脚本
      expect(body).toContain("shareToSocial");
    });

    it("应该跳过注入当 injectShareButtons 为 false", async () => {
      const plugin = socialPlugin({
        platforms: ["twitter"],
        injectShareButtons: false,
      });
      plugin.onInit?.(container);

      const html = `<html><head></head><body></body></html>`;
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      // 应该不包含分享脚本
      expect(body).not.toContain("shareToSocial");
    });
  });
});
