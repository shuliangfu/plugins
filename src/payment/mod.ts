/**
 * @module @dreamer/plugins/payment
 *
 * 支付集成插件
 *
 * 提供支付功能集成，支持：
 * - Stripe 支付
 * - PayPal 支付
 * - 支付宝支付
 * - 微信支付
 * - 通用支付接口
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 支付提供商类型
 */
export type PaymentProvider = "stripe" | "paypal" | "alipay" | "wechat";

/**
 * 支付订单信息
 */
export interface PaymentOrder {
  /** 订单 ID */
  orderId: string;
  /** 金额（单位：分） */
  amount: number;
  /** 货币（默认 "CNY"） */
  currency?: string;
  /** 订单描述 */
  description?: string;
  /** 商品名称 */
  productName?: string;
  /** 回调 URL */
  callbackUrl?: string;
  /** 返回 URL */
  returnUrl?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 支付结果
 */
export interface PaymentResult {
  /** 是否成功 */
  success: boolean;
  /** 交易 ID */
  transactionId?: string;
  /** 支付 URL（如果需要跳转） */
  paymentUrl?: string;
  /** 二维码内容（如果需要扫码） */
  qrCode?: string;
  /** 错误信息 */
  error?: string;
  /** 原始响应 */
  rawResponse?: unknown;
}

/**
 * Stripe 配置
 */
export interface StripeConfig {
  /** Stripe 公钥 */
  publicKey: string;
  /** Stripe 私钥 */
  secretKey: string;
  /** Webhook 密钥 */
  webhookSecret?: string;
}

/**
 * PayPal 配置
 */
export interface PayPalConfig {
  /** 客户端 ID */
  clientId: string;
  /** 客户端密钥 */
  clientSecret: string;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
}

/**
 * 支付宝配置
 */
export interface AlipayConfig {
  /** 应用 ID */
  appId: string;
  /** 私钥 */
  privateKey: string;
  /** 支付宝公钥 */
  alipayPublicKey: string;
  /** 网关地址 */
  gateway?: string;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
}

/**
 * 微信支付配置
 */
export interface WechatPayConfig {
  /** 应用 ID */
  appId: string;
  /** 商户号 */
  mchId: string;
  /** API 密钥 */
  apiKey: string;
  /** 证书路径（可选） */
  certPath?: string;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
}

/**
 * 支付插件配置选项
 */
export interface PaymentPluginOptions {
  /** 默认支付提供商 */
  defaultProvider?: PaymentProvider;
  /** Stripe 配置 */
  stripe?: StripeConfig;
  /** PayPal 配置 */
  paypal?: PayPalConfig;
  /** 支付宝配置 */
  alipay?: AlipayConfig;
  /** 微信支付配置 */
  wechat?: WechatPayConfig;
  /** 支付路由前缀（默认 "/api/payment"） */
  routePrefix?: string;
  /** 通知回调路径（默认 "/notify"） */
  notifyPath?: string;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 创建支付插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { paymentPlugin } from "@dreamer/plugins/payment";
 *
 * // Stripe 支付
 * const plugin = paymentPlugin({
 *   defaultProvider: "stripe",
 *   stripe: {
 *     publicKey: "pk_test_xxx",
 *     secretKey: "sk_test_xxx",
 *   },
 * });
 *
 * // 多支付方式
 * const plugin = paymentPlugin({
 *   stripe: { publicKey: "...", secretKey: "..." },
 *   alipay: { appId: "...", privateKey: "...", alipayPublicKey: "..." },
 *   wechat: { appId: "...", mchId: "...", apiKey: "..." },
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function paymentPlugin(options: PaymentPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    defaultProvider,
    stripe,
    paypal,
    alipay,
    wechat,
    routePrefix = "/api/payment",
    notifyPath = "/notify",
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-payment",
    version: "1.0.0",

    // 插件配置
    config: {
      payment: {
        defaultProvider,
        routePrefix,
        notifyPath,
        providers: {
          stripe: !!stripe,
          paypal: !!paypal,
          alipay: !!alipay,
          wechat: !!wechat,
        },
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.payment && typeof config.payment === "object") {
        // 基本验证
        return true;
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册支付服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册支付配置服务
      container.registerSingleton("paymentConfig", () => ({
        defaultProvider,
        stripe,
        paypal,
        alipay,
        wechat,
        routePrefix,
        notifyPath,
        debug,
      }));

      // 注册支付服务
      container.registerSingleton("paymentService", () => ({
        /**
         * 创建支付订单
         * @param order - 订单信息
         * @param provider - 支付提供商（可选，默认使用 defaultProvider）
         * @returns 支付结果
         */
        createPayment: async (
          order: PaymentOrder,
          provider?: PaymentProvider,
        ): Promise<PaymentResult> => {
          // 添加 await 以满足 async 函数要求（实际实现中会有真正的异步调用）
          await Promise.resolve();

          const selectedProvider = provider || defaultProvider;

          if (!selectedProvider) {
            return { success: false, error: "未指定支付提供商" };
          }

          // 根据提供商调用对应的支付接口
          switch (selectedProvider) {
            case "stripe":
              if (!stripe) {
                return { success: false, error: "Stripe 未配置" };
              }
              // 注意：实际实现需要调用 Stripe API
              return {
                success: true,
                transactionId: `stripe_${order.orderId}`,
                paymentUrl: `https://checkout.stripe.com/pay/${order.orderId}`,
              };

            case "paypal":
              if (!paypal) {
                return { success: false, error: "PayPal 未配置" };
              }
              // 注意：实际实现需要调用 PayPal API
              return {
                success: true,
                transactionId: `paypal_${order.orderId}`,
                paymentUrl:
                  `https://www.paypal.com/checkoutnow?token=${order.orderId}`,
              };

            case "alipay":
              if (!alipay) {
                return { success: false, error: "支付宝未配置" };
              }
              // 注意：实际实现需要调用支付宝 API
              return {
                success: true,
                transactionId: `alipay_${order.orderId}`,
                paymentUrl:
                  `https://openapi.alipay.com/gateway.do?order=${order.orderId}`,
              };

            case "wechat":
              if (!wechat) {
                return { success: false, error: "微信支付未配置" };
              }
              // 注意：实际实现需要调用微信支付 API
              return {
                success: true,
                transactionId: `wechat_${order.orderId}`,
                qrCode: `weixin://wxpay/bizpayurl?order=${order.orderId}`,
              };

            default:
              return {
                success: false,
                error: `不支持的支付提供商: ${selectedProvider}`,
              };
          }
        },

        /**
         * 查询支付状态
         * @param transactionId - 交易 ID
         * @param provider - 支付提供商
         * @returns 支付状态
         */
        queryPayment: async (
          transactionId: string,
          provider?: PaymentProvider,
        ): Promise<{ paid: boolean; status: string }> => {
          // 添加 await 以满足 async 函数要求（实际实现中会有真正的异步调用）
          await Promise.resolve();

          const selectedProvider = provider || defaultProvider;

          // 注意：实际实现需要调用对应支付平台的查询接口
          return {
            paid: false,
            status: `querying_${selectedProvider}_${transactionId}`,
          };
        },

        /**
         * 处理支付回调
         * @param provider - 支付提供商
         * @param body - 回调请求体
         * @param headers - 回调请求头
         * @returns 处理结果
         */
        handleNotify: async (
          provider: PaymentProvider,
          _body: unknown,
          _headers: Headers,
        ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
          // 添加 await 以满足 async 函数要求（实际实现中会有真正的异步调用）
          await Promise.resolve();

          // 注意：实际实现需要验证签名并处理回调
          return {
            success: true,
            orderId: `order_${provider}`,
          };
        },

        /**
         * 获取可用的支付提供商列表
         * @returns 提供商列表
         */
        getAvailableProviders: (): PaymentProvider[] => {
          const providers: PaymentProvider[] = [];
          if (stripe) providers.push("stripe");
          if (paypal) providers.push("paypal");
          if (alipay) providers.push("alipay");
          if (wechat) providers.push("wechat");
          return providers;
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          const providers: string[] = [];
          if (stripe) providers.push("stripe");
          if (paypal) providers.push("paypal");
          if (alipay) providers.push("alipay");
          if (wechat) providers.push("wechat");
          logger.info(`支付插件已初始化: providers=${providers.join(", ")}`);
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理支付相关请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const path = ctx.path || "";
      const method = ctx.method?.toUpperCase();

      // 检查路径前缀
      if (!path.startsWith(routePrefix)) {
        return;
      }

      const relativePath = path.slice(routePrefix.length);

      // 处理支付回调
      if (relativePath.startsWith(notifyPath) && method === "POST") {
        const provider = relativePath.slice(
          notifyPath.length + 1,
        ) as PaymentProvider;

        if (!provider) {
          ctx.response = new Response(
            JSON.stringify({ error: "未指定支付提供商" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
          return;
        }

        const paymentService = container.get<{
          handleNotify: (
            provider: PaymentProvider,
            body: unknown,
            headers: Headers,
          ) => Promise<{ success: boolean; orderId?: string; error?: string }>;
        }>("paymentService");

        if (!paymentService || !ctx.request) {
          return;
        }

        try {
          const body = await ctx.request.text();
          const result = await paymentService.handleNotify(
            provider,
            body,
            ctx.headers || new Headers(),
          );

          // 根据支付平台返回不同格式的响应
          if (provider === "alipay") {
            ctx.response = new Response(result.success ? "success" : "fail", {
              status: 200,
              headers: { "Content-Type": "text/plain" },
            });
          } else if (provider === "wechat") {
            ctx.response = new Response(
              result.success
                ? "<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>"
                : "<xml><return_code><![CDATA[FAIL]]></return_code></xml>",
              {
                status: 200,
                headers: { "Content-Type": "application/xml" },
              },
            );
          } else {
            ctx.response = new Response(
              JSON.stringify(result),
              {
                status: result.success ? 200 : 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(
                `支付回调处理: provider=${provider}, success=${result.success}`,
              );
            }
          }
        } catch (error) {
          ctx.response = new Response(
            JSON.stringify({
              error: "回调处理失败",
              message: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return;
      }

      // 处理创建支付请求
      if (relativePath === "/create" && method === "POST") {
        const paymentService = container.get<{
          createPayment: (
            order: PaymentOrder,
            provider?: PaymentProvider,
          ) => Promise<PaymentResult>;
        }>("paymentService");

        if (!paymentService || !ctx.request) {
          return;
        }

        try {
          const body = await ctx.request.json();
          const { order, provider } = body;

          const result = await paymentService.createPayment(order, provider);

          ctx.response = new Response(
            JSON.stringify(result),
            {
              status: result.success ? 200 : 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          ctx.response = new Response(
            JSON.stringify({
              success: false,
              error: "创建支付失败",
              message: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return;
      }

      // 处理查询支付状态请求
      if (relativePath === "/query" && method === "GET") {
        const paymentService = container.get<{
          queryPayment: (
            transactionId: string,
            provider?: PaymentProvider,
          ) => Promise<{ paid: boolean; status: string }>;
        }>("paymentService");

        if (!paymentService) {
          return;
        }

        const transactionId = ctx.url.searchParams.get("transactionId");
        const provider = ctx.url.searchParams.get(
          "provider",
        ) as PaymentProvider;

        if (!transactionId) {
          ctx.response = new Response(
            JSON.stringify({ error: "缺少 transactionId 参数" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
          return;
        }

        const result = await paymentService.queryPayment(
          transactionId,
          provider,
        );

        ctx.response = new Response(
          JSON.stringify(result),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

        return;
      }
    },
  };
}

// 导出默认创建函数
export default paymentPlugin;
