/**
 * @module @dreamer/plugins/payment
 *
 * 支付插件
 *
 * 提供统一的支付功能集成，支持多种支付方式：
 *
 * ## 国际支付
 * - **Stripe** - 全球领先的支付处理器
 * - **PayPal** - 全球最大的在线支付平台
 * - **Apple Pay** - Apple 设备一键支付
 * - **Google Pay** - Google 移动支付
 *
 * ## 国内支付
 * - **Alipay** - 支付宝支付
 * - **WechatPay** - 微信支付
 * - **UnionPay** - 银联支付
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 * - 各支付方式通过适配器模式实现，统一接口
 *
 * @example
 * ```typescript
 * import { paymentPlugin } from "@dreamer/plugins/payment";
 * import { createStripeAdapter } from "@dreamer/plugins/payment/adapters";
 *
 * // 使用适配器创建支付插件
 * const stripe = createStripeAdapter({
 *   publicKey: "pk_test_xxx",
 *   secretKey: "sk_test_xxx",
 * });
 *
 * const plugin = paymentPlugin({
 *   adapters: { stripe },
 *   defaultAdapter: "stripe",
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import { createLogger } from "@dreamer/logger";
import type { Logger, LoggerOptions, PaymentAdapter } from "./adapters/types.ts";

// 导出适配器相关类型和函数
export * from "./adapters/mod.ts";

/**
 * 支付插件配置选项
 */
export interface PaymentPluginOptions {
  /** 支付适配器映射 */
  adapters?: Record<string, PaymentAdapter>;
  /** 默认适配器名称 */
  defaultAdapter?: string;
  /** 支付路由前缀（默认 "/api/payment"） */
  routePrefix?: string;
  /** 通知回调路径（默认 "/notify"） */
  notifyPath?: string;
  /** 日志配置 */
  logging?: LoggerOptions;
}

/**
 * 创建支付插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { paymentPlugin, createStripeAdapter, createAlipayAdapter } from "@dreamer/plugins/payment";
 *
 * // 多支付方式
 * const plugin = paymentPlugin({
 *   adapters: {
 *     stripe: createStripeAdapter({ publicKey: "...", secretKey: "..." }),
 *     alipay: createAlipayAdapter({ appId: "...", privateKey: "...", alipayPublicKey: "..." }),
 *   },
 *   defaultAdapter: "stripe",
 * });
 * ```
 */
export function paymentPlugin(options: PaymentPluginOptions = {}): Plugin {
  const {
    adapters = {},
    defaultAdapter,
    routePrefix = "/api/payment",
    notifyPath = "/notify",
    logging = {},
  } = options;

  // 日志配置
  const {
    enabled: logEnabled = false,
    level: logLevel = "info",
    prefix: logPrefix = "Payment",
    logger: customLogger,
  } = logging;

  // 创建日志器
  const logger: Logger = customLogger || createLogger({
    level: logLevel,
    format: "color",
    tags: ["payment"],
  });

  /**
   * 日志输出
   */
  const log = (message: string, data?: unknown) => {
    if (logEnabled) {
      logger.debug(`[${logPrefix}] ${message}`, data);
    }
  };

  return {
    name: "@dreamer/plugins-payment",
    version: "1.0.0",

    // 插件配置
    config: {
      payment: {
        adapters: Object.keys(adapters),
        defaultAdapter,
        routePrefix,
        notifyPath,
        logging: { enabled: logEnabled, level: logLevel, prefix: logPrefix },
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.payment && typeof config.payment === "object") {
        return true;
      }
      return true;
    },

    /**
     * 初始化钩子
     */
    onInit(container: ServiceContainer) {
      log("初始化支付插件", { adapters: Object.keys(adapters) });

      // 注册支付配置
      container.registerSingleton("paymentConfig", () => ({
        adapters: Object.keys(adapters),
        defaultAdapter,
        routePrefix,
        notifyPath,
        logging: { enabled: logEnabled, level: logLevel, prefix: logPrefix },
      }));

      // 注册支付适配器管理器
      container.registerSingleton("paymentAdapters", () => adapters);

      // 注册支付服务
      container.registerSingleton("paymentService", () => ({
        /**
         * 获取适配器
         */
        getAdapter: (name?: string): PaymentAdapter | undefined => {
          const adapterName = name || defaultAdapter;
          if (!adapterName) {
            log("未指定适配器且无默认适配器");
            return undefined;
          }
          return adapters[adapterName];
        },

        /**
         * 获取所有适配器
         */
        getAllAdapters: (): Record<string, PaymentAdapter> => adapters,

        /**
         * 创建支付
         */
        createPayment: async (
          order: {
            orderId: string;
            amount: number;
            currency?: string;
            description?: string;
          },
          adapterName?: string,
        ) => {
          const adapter = adapters[adapterName || defaultAdapter || ""];
          if (!adapter) {
            return { success: false, error: "适配器未找到" };
          }
          return await adapter.createPayment(order);
        },

        /**
         * 查询支付状态
         */
        queryPayment: async (transactionId: string, adapterName?: string) => {
          const adapter = adapters[adapterName || defaultAdapter || ""];
          if (!adapter) {
            return { success: false, paid: false, status: "failed" as const, error: "适配器未找到" };
          }
          return await adapter.queryPayment(transactionId);
        },

        /**
         * 申请退款
         */
        refund: async (
          request: { transactionId: string; amount?: number; reason?: string },
          adapterName?: string,
        ) => {
          const adapter = adapters[adapterName || defaultAdapter || ""];
          if (!adapter) {
            return { success: false, error: "适配器未找到" };
          }
          return await adapter.refund(request);
        },

        /**
         * 处理回调通知
         */
        handleNotify: async (
          adapterName: string,
          body: unknown,
          headers: Headers,
        ) => {
          const adapter = adapters[adapterName];
          if (!adapter) {
            return { success: false, error: "适配器未找到" };
          }
          return await adapter.handleNotify({ body, headers });
        },

        /**
         * 获取客户端配置
         */
        getClientConfig: (adapterName?: string) => {
          const adapter = adapters[adapterName || defaultAdapter || ""];
          if (!adapter) {
            return {};
          }
          return adapter.getClientConfig();
        },
      }));

      log("支付服务已注册");
    },

    /**
     * 请求处理钩子
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const path = ctx.path || "";
      const method = ctx.method || "";

      // 检查路径前缀
      if (!path.startsWith(routePrefix)) {
        return;
      }

      const relativePath = path.slice(routePrefix.length);
      log("处理支付请求", { path, relativePath, method });

      // 获取支付服务
      const paymentService = container.get<{
        createPayment: (
          order: { orderId: string; amount: number },
          adapter?: string,
        ) => Promise<{ success: boolean; error?: string }>;
        queryPayment: (
          transactionId: string,
          adapter?: string,
        ) => Promise<{ success: boolean }>;
        handleNotify: (
          adapter: string,
          body: unknown,
          headers: Headers,
        ) => Promise<{ success: boolean; platformResponse?: string }>;
        getClientConfig: (adapter?: string) => Record<string, unknown>;
      }>("paymentService");

      if (!paymentService) {
        return;
      }

      // 处理回调通知: /notify/{adapter}
      if (relativePath.startsWith(notifyPath) && method === "POST") {
        const adapterName = relativePath.slice(notifyPath.length + 1);

        if (!adapterName) {
          ctx.response = new Response(
            JSON.stringify({ error: "未指定支付适配器" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
          return;
        }

        try {
          const body = await ctx.request.json();
          const result = await paymentService.handleNotify(
            adapterName,
            body,
            ctx.headers,
          );

          ctx.response = new Response(
            result.platformResponse || JSON.stringify(result),
            {
              status: result.success ? 200 : 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          log("处理回调失败", error);
          ctx.response = new Response(
            JSON.stringify({ error: "处理失败" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return;
      }

      // 处理创建支付: /create
      if (relativePath === "/create" && method === "POST") {
        try {
          const body = await ctx.request.json();
          const { order, adapter } = body;
          const result = await paymentService.createPayment(order, adapter);

          ctx.response = new Response(
            JSON.stringify(result),
            {
              status: result.success ? 200 : 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          log("创建支付失败", error);
          ctx.response = new Response(
            JSON.stringify({ success: false, error: "创建支付失败" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return;
      }

      // 处理查询支付: /query
      if (relativePath === "/query" && method === "GET") {
        const transactionId = ctx.url.searchParams.get("transactionId");
        const adapter = ctx.url.searchParams.get("adapter") || undefined;

        if (!transactionId) {
          ctx.response = new Response(
            JSON.stringify({ error: "缺少 transactionId" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
          return;
        }

        const result = await paymentService.queryPayment(transactionId, adapter);
        ctx.response = new Response(
          JSON.stringify(result),
          {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" },
          },
        );
        return;
      }

      // 处理获取客户端配置: /config
      if (relativePath === "/config" && method === "GET") {
        const adapter = ctx.url.searchParams.get("adapter") || undefined;
        const config = paymentService.getClientConfig(adapter);

        ctx.response = new Response(
          JSON.stringify(config),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
        return;
      }
    },
  };
}

// 导出默认创建函数
export default paymentPlugin;
