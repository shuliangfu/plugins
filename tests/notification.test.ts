/**
 * 通知插件测试
 *
 * 测试通知插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  notificationPlugin,
  type NotificationPluginOptions,
} from "../src/notification/mod.ts";

describe("通知插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = notificationPlugin();
      const config = plugin.config?.notification as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-notification");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.routePrefix).toBe("/api/notification");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: NotificationPluginOptions = {
        webpush: {
          publicKey: "BNhXnXXX",
          privateKey: "secretKey",
          contact: "mailto:admin@example.com",
        },
        email: {
          host: "smtp.example.com",
          port: 587,
          username: "user@example.com",
          password: "password",
          from: "noreply@example.com",
        },
      };

      const plugin = notificationPlugin(options);
      const config = plugin.config?.notification as Record<string, unknown>;

      expect(config?.webpush).toBeDefined();
      expect(config?.email).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = notificationPlugin();

      expect(
        plugin.validateConfig?.({ notification: { routePrefix: "/api/notify" } }),
      ).toBe(true);
    });

    it("应该接受 webpush 对象配置", () => {
      const plugin = notificationPlugin();

      // 当前实现接受任何配置，只做基本验证
      expect(
        plugin.validateConfig?.({ notification: { webpush: { publicKey: "pk" } } }),
      ).toBe(true);
    });

    it("应该接受空配置", () => {
      const plugin = notificationPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 notificationConfig 服务", () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
      });

      plugin.onInit?.(container);

      const config = container.get("notificationConfig");
      expect(config).toBeDefined();
    });

    it("应该注册 notificationService 服务", () => {
      const plugin = notificationPlugin();

      plugin.onInit?.(container);

      const service = container.get("notificationService");
      expect(service).toBeDefined();
    });

    it("notificationService 应该提供 send 方法", () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        send: (
          channel: string,
          to: string,
          message: { title: string; body: string },
        ) => Promise<{ success: boolean }>;
      }>("notificationService");

      expect(service?.send).toBeDefined();
    });

    it("notificationService 应该提供 subscribe 方法", () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        subscribe: (
          channel: string,
          userId: string,
          subscription: Record<string, unknown>,
        ) => Promise<void>;
      }>("notificationService");

      expect(service?.subscribe).toBeDefined();
    });

    it("notificationService 应该提供 unsubscribe 方法", () => {
      const plugin = notificationPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        unsubscribe: (
          channel: string,
          userId: string,
        ) => Promise<void>;
      }>("notificationService");

      expect(service?.unsubscribe).toBeDefined();
    });
  });

  describe("notificationService - Web Push", () => {
    it("应该发送 Web Push 通知", async () => {
      const plugin = notificationPlugin({
        webpush: {
          publicKey: "BNhXnXXX",
          privateKey: "secretKey",
          contact: "mailto:admin@example.com",
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        send: (
          channel: string,
          to: string,
          message: { title: string; body: string },
        ) => Promise<{ success: boolean; error?: string }>;
        subscribe: (
          channel: string,
          userId: string,
          subscription: Record<string, unknown>,
        ) => Promise<void>;
      }>("notificationService");

      // 先订阅
      await service?.subscribe("webpush", "user-1", {
        endpoint: "https://push.example.com/xxx",
        keys: {
          p256dh: "publicKey",
          auth: "authSecret",
        },
      });

      // 发送通知
      const result = await service?.send("webpush", "user-1", {
        title: "Hello",
        body: "This is a test notification",
      });

      expect(result).toBeDefined();
    });

    it("应该能通过 config 获取 VAPID 公钥", () => {
      const plugin = notificationPlugin({
        webpush: {
          publicKey: "BNhXnXXX_public_key",
          privateKey: "secretKey",
          contact: "mailto:admin@example.com",
        },
      });
      plugin.onInit?.(container);

      // VAPID 公钥可以通过 notificationConfig 获取
      const config = container.get<{
        webpush?: { publicKey: string };
      }>("notificationConfig");

      expect(config?.webpush).toBeDefined();
      expect(config?.webpush?.publicKey).toBe("BNhXnXXX_public_key");
    });
  });

  describe("notificationService - Email", () => {
    it("应该发送邮件通知", async () => {
      const plugin = notificationPlugin({
        email: {
          host: "smtp.example.com",
          port: 587,
          username: "user@example.com",
          password: "password",
          from: "noreply@example.com",
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        send: (
          channel: string,
          to: string,
          message: { title: string; body: string },
        ) => Promise<{ success: boolean; error?: string }>;
      }>("notificationService");

      const result = await service?.send("email", "test@example.com", {
        title: "Test Subject",
        body: "This is a test email",
      });

      expect(result).toBeDefined();
    });
  });

  describe("notificationService - SMS", () => {
    it("应该发送短信通知", async () => {
      const plugin = notificationPlugin({
        sms: {
          provider: "twilio",
          accessKeyId: "AC_xxx",
          accessKeySecret: "auth_xxx",
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        send: (
          channel: string,
          to: string,
          message: { title: string; body: string },
        ) => Promise<{ success: boolean; error?: string }>;
      }>("notificationService");

      const result = await service?.send("sms", "+9876543210", {
        title: "Test",
        body: "This is a test SMS",
      });

      expect(result).toBeDefined();
    });
  });

  describe("notificationService - Webhook", () => {
    it("应该发送 Webhook 通知", async () => {
      const plugin = notificationPlugin({
        webhooks: [{ url: "https://webhook.example.com/notify" }],
      });
      plugin.onInit?.(container);

      const service = container.get<{
        sendWebhook: (
          url: string,
          data: Record<string, unknown>,
        ) => Promise<{ success: boolean }>;
      }>("notificationService");

      expect(service?.sendWebhook).toBeDefined();

      const result = await service?.sendWebhook(
        "https://webhook.example.com/notify",
        { event: "test", data: { message: "Hello" } },
      );

      expect(result).toBeDefined();
    });
  });

  describe("订阅管理", () => {
    it("应该订阅通知", async () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        subscribe: (
          channel: string,
          userId: string,
          subscription: Record<string, unknown>,
        ) => Promise<void>;
      }>("notificationService");

      // 不应该抛出错误
      await service?.subscribe("webpush", "user-1", {
        endpoint: "https://push.example.com/xxx",
        keys: {
          p256dh: "publicKey",
          auth: "authSecret",
        },
      });
    });

    it("应该取消订阅通知", async () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        subscribe: (
          channel: string,
          userId: string,
          subscription: Record<string, unknown>,
        ) => Promise<void>;
        unsubscribe: (
          channel: string,
          userId: string,
        ) => Promise<void>;
      }>("notificationService");

      // 先订阅
      await service?.subscribe("webpush", "user-1", {
        endpoint: "https://push.example.com/xxx",
      });

      // 取消订阅不应该抛出错误
      await service?.unsubscribe("webpush", "user-1");
    });
  });

  describe("onRequest 钩子", () => {
    it("应该处理订阅请求", async () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
        routePrefix: "/api/notifications",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "user-1",
            subscription: {
              endpoint: "https://push.example.com/xxx",
              keys: { p256dh: "key", auth: "auth" },
            },
          }),
        }),
        path: "/api/notifications/subscribe",
        method: "POST",
        url: new URL("http://localhost/api/notifications/subscribe"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(200);
    });

    it("应该处理取消订阅请求", async () => {
      const plugin = notificationPlugin({
        webpush: { publicKey: "pk", privateKey: "sk", contact: "mailto:a@b.com" },
        routePrefix: "/api/notifications",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "user-1",
          }),
        }),
        path: "/api/notifications/unsubscribe",
        method: "POST",
        url: new URL("http://localhost/api/notifications/unsubscribe"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(200);
    });

    it("应该跳过非通知路径", async () => {
      const plugin = notificationPlugin({
        routePrefix: "/api/notifications",
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

      // 不匹配路径，不应该处理
      expect(ctx.response).toBeUndefined();
    });
  });
});
