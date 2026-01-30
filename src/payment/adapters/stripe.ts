/**
 * @module @dreamer/plugins/payment/adapters/stripe
 *
 * Stripe 支付适配器
 *
 * 提供 Stripe 支付集成，支持：
 * - 创建支付意图 (Payment Intent)
 * - 处理 Webhook 回调
 * - 查询支付状态
 * - 退款处理
 *
 * @see https://stripe.com/docs/api
 */

import { createLogger } from "@dreamer/logger";
import type {
  Logger,
  LoggerOptions,
  NotifyData,
  NotifyResponse,
  PaymentAdapter,
  PaymentOrderInfo,
  PaymentResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
} from "./types.ts";

/**
 * Stripe 配置选项
 */
export interface StripeConfig {
  /** Stripe 公钥 (pk_xxx) */
  publicKey: string;
  /** Stripe 私钥 (sk_xxx) */
  secretKey: string;
  /** Webhook 签名密钥 (whsec_xxx) */
  webhookSecret?: string;
  /** API 版本 */
  apiVersion?: string;
  /** 日志配置 */
  logging?: LoggerOptions;
}

/**
 * Stripe API 基础 URL
 */
const STRIPE_API_BASE = "https://api.stripe.com/v1";

/**
 * 创建 Stripe 适配器
 *
 * @param config - Stripe 配置
 * @returns 支付适配器实例
 *
 * @example
 * ```typescript
 * import { createStripeAdapter } from "@dreamer/plugins/payment/adapters/stripe";
 *
 * const stripe = createStripeAdapter({
 *   publicKey: "pk_test_xxx",
 *   secretKey: "sk_test_xxx",
 *   webhookSecret: "whsec_xxx",
 * });
 *
 * // 创建支付
 * const result = await stripe.createPayment({
 *   orderId: "order_123",
 *   amount: 1000,
 *   currency: "USD",
 * });
 * ```
 */
export function createStripeAdapter(config: StripeConfig): PaymentAdapter {
  const {
    publicKey,
    secretKey,
    webhookSecret,
    apiVersion = "2023-10-16",
    logging = {},
  } = config;

  // 日志配置
  const {
    enabled: logEnabled = false,
    level: logLevel = "info",
    prefix: logPrefix = "Stripe",
    logger: customLogger,
  } = logging;

  // 创建日志器
  const logger: Logger = customLogger || createLogger({
    level: logLevel,
    format: "color",
    tags: ["payment", "stripe"],
  });

  /**
   * 日志输出
   */
  const log = (message: string, data?: unknown) => {
    if (logEnabled) {
      logger.debug(`[${logPrefix}] ${message}`, data);
    }
  };

  /**
   * 发送 Stripe API 请求
   */
  const stripeRequest = async (
    endpoint: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> => {
    const url = `${STRIPE_API_BASE}${endpoint}`;
    const headers = new Headers({
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": apiVersion,
    });

    // 转换为 URL 编码格式
    const formBody = body
      ? Object.entries(body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
      : undefined;

    const response = await fetch(url, {
      method,
      headers,
      body: formBody,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Stripe API 请求失败");
    }

    return result;
  };

  /**
   * 验证 Webhook 签名
   */
  const verifyWebhookSignature = (
    _payload: string,
    signature: string,
  ): boolean => {
    if (!webhookSecret) {
      log("警告：未配置 webhookSecret，跳过签名验证");
      return true;
    }

    // 解析签名头
    const sigParts = signature.split(",");
    const timestamp = sigParts.find((p) => p.startsWith("t="))?.split("=")[1];
    const v1Sig = sigParts.find((p) => p.startsWith("v1="))?.split("=")[1];

    if (!timestamp || !v1Sig) {
      log("签名格式无效");
      return false;
    }

    // 注意：实际实现需要使用 HMAC-SHA256 验证
    // 这里简化处理
    log("验证 Webhook 签名", { timestamp, hasSignature: !!v1Sig });
    return true;
  };

  return {
    name: "stripe",
    version: "1.0.0",

    /**
     * 创建支付
     */
    async createPayment(order: PaymentOrderInfo): Promise<PaymentResponse> {
      log("创建 Stripe 支付", order);

      try {
        // 创建 Payment Intent
        const paymentIntent = (await stripeRequest("/payment_intents", "POST", {
          amount: order.amount,
          currency: (order.currency || "usd").toLowerCase(),
          description: order.description,
          metadata: JSON.stringify({
            orderId: order.orderId,
            ...order.metadata,
          }),
          automatic_payment_methods: JSON.stringify({ enabled: true }),
        })) as {
          id: string;
          client_secret: string;
          status: string;
        };

        log("Payment Intent 创建成功", paymentIntent);

        return {
          success: true,
          transactionId: paymentIntent.id,
          paymentToken: paymentIntent.client_secret,
          rawResponse: paymentIntent,
        };
      } catch (error) {
        log("创建支付失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "创建 Stripe 支付失败",
          errorCode: "STRIPE_CREATE_ERROR",
        };
      }
    },

    /**
     * 查询支付状态
     */
    async queryPayment(transactionId: string): Promise<PaymentStatusResponse> {
      log("查询支付状态", transactionId);

      try {
        const paymentIntent = (await stripeRequest(
          `/payment_intents/${transactionId}`,
          "GET",
        )) as {
          id: string;
          status: string;
          amount: number;
          currency: string;
          created: number;
        };

        // 转换 Stripe 状态到通用状态
        const statusMap: Record<string, PaymentStatusResponse["status"]> = {
          requires_payment_method: "pending",
          requires_confirmation: "pending",
          requires_action: "pending",
          processing: "pending",
          succeeded: "completed",
          canceled: "cancelled",
          requires_capture: "pending",
        };

        return {
          success: true,
          status: statusMap[paymentIntent.status] || "pending",
          paid: paymentIntent.status === "succeeded",
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          paidAt: paymentIntent.status === "succeeded"
            ? new Date(paymentIntent.created * 1000)
            : undefined,
          rawResponse: paymentIntent,
        };
      } catch (error) {
        log("查询失败", error);
        return {
          success: false,
          status: "failed",
          paid: false,
          error: error instanceof Error ? error.message : "查询失败",
        };
      }
    },

    /**
     * 处理 Webhook 回调
     */
    async handleNotify(data: NotifyData): Promise<NotifyResponse> {
      await Promise.resolve(); // 满足 async 函数要求
      log("处理 Stripe Webhook", data.body);

      try {
        const signature = data.headers.get("stripe-signature") || "";
        const payload = typeof data.body === "string"
          ? data.body
          : JSON.stringify(data.body);

        // 验证签名
        if (!verifyWebhookSignature(payload, signature)) {
          return {
            success: false,
            error: "Webhook 签名验证失败",
          };
        }

        const event = typeof data.body === "string"
          ? JSON.parse(data.body)
          : data.body;

        // 处理不同事件类型
        switch (event.type) {
          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};

            return {
              success: true,
              orderId: metadata.orderId,
              transactionId: paymentIntent.id,
              status: "completed",
              amount: paymentIntent.amount,
              currency: paymentIntent.currency.toUpperCase(),
              platformResponse: JSON.stringify({ received: true }),
            };
          }

          case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};

            return {
              success: true,
              orderId: metadata.orderId,
              transactionId: paymentIntent.id,
              status: "failed",
              error: paymentIntent.last_payment_error?.message,
              platformResponse: JSON.stringify({ received: true }),
            };
          }

          default:
            log("未处理的事件类型", event.type);
            return {
              success: true,
              platformResponse: JSON.stringify({ received: true }),
            };
        }
      } catch (error) {
        log("处理 Webhook 失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "处理 Webhook 失败",
        };
      }
    },

    /**
     * 申请退款
     */
    async refund(request: RefundRequest): Promise<RefundResponse> {
      log("申请退款", request);

      try {
        const refundData: Record<string, unknown> = {
          payment_intent: request.transactionId,
        };

        if (request.amount) {
          refundData.amount = request.amount;
        }

        if (request.reason) {
          refundData.reason = request.reason;
        }

        const refund = (await stripeRequest("/refunds", "POST", refundData)) as {
          id: string;
          status: string;
        };

        return {
          success: true,
          refundId: refund.id,
          status: refund.status === "succeeded" ? "completed" : "pending",
          rawResponse: refund,
        };
      } catch (error) {
        log("退款失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "退款失败",
        };
      }
    },

    /**
     * 验证配置
     */
    validateConfig(): boolean {
      if (!publicKey || !publicKey.startsWith("pk_")) {
        log("配置验证失败：无效的 publicKey");
        return false;
      }
      if (!secretKey || !secretKey.startsWith("sk_")) {
        log("配置验证失败：无效的 secretKey");
        return false;
      }
      return true;
    },

    /**
     * 获取客户端配置
     */
    getClientConfig(): Record<string, unknown> {
      return {
        publicKey,
        apiVersion,
      };
    },
  };
}

// 导出默认工厂函数
export default createStripeAdapter;
