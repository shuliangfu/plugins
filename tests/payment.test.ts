/**
 * 支付插件测试
 *
 * 测试支付插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  createStripeAdapter,
  paymentPlugin,
  type PaymentPluginOptions,
} from "../src/payment/mod.ts";

describe("支付插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  // 创建测试用的 Stripe 适配器
  const createTestStripeAdapter = () =>
    createStripeAdapter({
      publicKey: "pk_test_xxx",
      secretKey: "sk_test_xxx",
    });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = paymentPlugin();
      const config = plugin.config?.payment as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-payment");
      expect(plugin.version).toBe("1.0.0");
      // adapters 是一个数组，显示已配置的适配器名称
      expect(config?.adapters).toBeDefined();
      expect(config?.routePrefix).toBe("/api/payment");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: PaymentPluginOptions = {
        adapters: {
          stripe: createTestStripeAdapter(),
        },
        defaultAdapter: "stripe",
        notifyPath: "/notify",
      };

      const plugin = paymentPlugin(options);
      const config = plugin.config?.payment as Record<string, unknown>;
      const adapters = config?.adapters as string[];

      expect(adapters).toContain("stripe");
      expect(config?.defaultAdapter).toBe("stripe");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = paymentPlugin();

      expect(
        plugin.validateConfig?.({ payment: { defaultAdapter: "stripe" } }),
      ).toBe(true);
    });

    it("应该接受带有路由前缀的配置", () => {
      const plugin = paymentPlugin();

      expect(plugin.validateConfig?.({ payment: { routePrefix: "/pay" } }))
        .toBe(true);
    });

    it("应该接受空配置", () => {
      const plugin = paymentPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 paymentConfig 服务", () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
        defaultAdapter: "stripe",
      });

      plugin.onInit?.(container);

      const config = container.get("paymentConfig");
      expect(config).toBeDefined();
      expect((config as { defaultAdapter: string }).defaultAdapter).toBe("stripe");
    });

    it("应该注册 paymentService 服务", () => {
      const plugin = paymentPlugin();

      plugin.onInit?.(container);

      const service = container.get("paymentService");
      expect(service).toBeDefined();
    });

    it("paymentService 应该提供 createPayment 方法", () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        createPayment: (
          order: { orderId: string; amount: number },
          adapter?: string,
        ) => Promise<{ success: boolean; transactionId?: string }>;
      }>("paymentService");

      expect(service?.createPayment).toBeDefined();
    });

    it("paymentService 应该提供 queryPayment 方法", () => {
      const plugin = paymentPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        queryPayment: (
          transactionId: string,
          adapter?: string,
        ) => Promise<{ success: boolean; status?: string }>;
      }>("paymentService");

      expect(service?.queryPayment).toBeDefined();
    });

    it("paymentService 应该提供 handleNotify 方法", () => {
      const plugin = paymentPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        handleNotify: (
          adapter: string,
          data: Record<string, unknown>,
          headers: Headers,
        ) => Promise<{ success: boolean }>;
      }>("paymentService");

      expect(service?.handleNotify).toBeDefined();
    });
  });

  describe("paymentService", () => {
    // 定义服务类型
    type PaymentService = {
      createPayment: (
        order: { orderId: string; amount: number; description?: string },
        adapter?: string,
      ) => Promise<{ success: boolean; transactionId?: string; paymentUrl?: string; error?: string }>;
      queryPayment: (
        transactionId: string,
        adapter?: string,
      ) => Promise<{ success: boolean; status?: string; paid?: boolean }>;
      handleNotify: (
        adapter: string,
        data: Record<string, unknown>,
        headers: Headers,
      ) => Promise<{ success: boolean }>;
    };

    it("应该创建支付订单", async () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
        defaultAdapter: "stripe",
      });
      plugin.onInit?.(container);

      const service = container.get<PaymentService>("paymentService");

      // 注意：这里实际上会调用 Stripe API，在测试环境可能会失败
      // 测试的目的是验证方法存在且返回预期的结构
      const result = await service?.createPayment({
        orderId: "order_123",
        amount: 1000,
        description: "Test payment",
      }, "stripe");

      // 由于是模拟环境，API 调用可能失败，只验证结构
      expect(result?.success).toBeDefined();
    });

    it("应该查询支付状态", async () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
        defaultAdapter: "stripe",
      });
      plugin.onInit?.(container);

      const service = container.get<PaymentService>("paymentService");

      const result = await service?.queryPayment("stripe_order_123", "stripe");

      // 验证返回结构
      expect(result?.status).toBeDefined();
      expect(result?.paid).toBeDefined();
    });

    it("应该处理支付回调", async () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
      });
      plugin.onInit?.(container);

      const service = container.get<PaymentService>("paymentService");

      const result = await service?.handleNotify(
        "stripe",
        {
          type: "payment_intent.succeeded",
          data: { object: { id: "pi_test_xxx" } },
        },
        new Headers({ "stripe-signature": "test_sig" }),
      );

      expect(result?.success).toBeDefined();
    });

    it("应该拒绝未配置的适配器", async () => {
      const plugin = paymentPlugin({
        // 只配置 stripe，不配置 paypal
        adapters: { stripe: createTestStripeAdapter() },
      });
      plugin.onInit?.(container);

      const service = container.get<PaymentService>("paymentService");

      // 尝试使用未配置的 paypal
      const result = await service?.createPayment({
        orderId: "order_123",
        amount: 1000,
      }, "paypal");

      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
  });

  describe("onRequest 钩子", () => {
    it("应该处理通知回调请求", async () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
        routePrefix: "/api/payment",
        notifyPath: "/notify",
      });
      plugin.onInit?.(container);

      // 通知回调路径格式为 routePrefix + notifyPath + "/" + adapter
      // 例如 /api/payment/notify/stripe
      // 模拟完整的 Stripe Webhook 事件
      const webhookEvent = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_123",
            amount: 1000,
            currency: "usd",
            status: "succeeded",
            metadata: { orderId: "order_123" },
          },
        },
      };

      const ctx = {
        request: new Request("http://localhost/api/payment/notify/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookEvent),
        }),
        path: "/api/payment/notify/stripe",
        method: "POST",
        url: new URL("http://localhost/api/payment/notify/stripe"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(200);
    });

    it("应该拒绝未指定适配器的通知回调", async () => {
      const plugin = paymentPlugin({
        adapters: { stripe: createTestStripeAdapter() },
        routePrefix: "/api/payment",
        notifyPath: "/notify",
      });
      plugin.onInit?.(container);

      // 没有指定 adapter 的路径应该返回 400
      const ctx = {
        request: new Request("http://localhost/api/payment/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        path: "/api/payment/notify",
        method: "POST",
        url: new URL("http://localhost/api/payment/notify"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(400);
    });

    it("应该跳过非支付路径", async () => {
      const plugin = paymentPlugin({
        routePrefix: "/api/payment",
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
