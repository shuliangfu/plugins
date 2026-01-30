/**
 * @module @dreamer/plugins/payment/adapters/paypal
 *
 * PayPal 支付适配器
 *
 * 提供 PayPal 支付集成，支持：
 * - 创建订单
 * - 捕获支付
 * - 处理 Webhook 回调
 * - 退款处理
 *
 * @see https://developer.paypal.com/docs/api/overview/
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
 * PayPal 配置选项
 */
export interface PayPalConfig {
  /** 客户端 ID */
  clientId: string;
  /** 客户端密钥 */
  clientSecret: string;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
  /** Webhook ID（用于验证签名） */
  webhookId?: string;
  /** 日志配置 */
  logging?: LoggerOptions;
}

/**
 * PayPal API 端点
 */
const PAYPAL_ENDPOINTS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  production: "https://api-m.paypal.com",
};

/**
 * 创建 PayPal 适配器
 *
 * @param config - PayPal 配置
 * @returns 支付适配器实例
 *
 * @example
 * ```typescript
 * import { createPayPalAdapter } from "@dreamer/plugins/payment/adapters/paypal";
 *
 * const paypal = createPayPalAdapter({
 *   clientId: "xxx",
 *   clientSecret: "xxx",
 *   sandbox: true,
 * });
 *
 * // 创建支付
 * const result = await paypal.createPayment({
 *   orderId: "order_123",
 *   amount: 1000,
 *   currency: "USD",
 * });
 * ```
 */
export function createPayPalAdapter(config: PayPalConfig): PaymentAdapter {
  const {
    clientId,
    clientSecret,
    sandbox = false,
    webhookId: _webhookId,
    logging = {},
  } = config;

  const baseUrl = sandbox ? PAYPAL_ENDPOINTS.sandbox : PAYPAL_ENDPOINTS.production;

  // 缓存访问令牌
  let accessToken: string | null = null;
  let tokenExpiry = 0;

  // 日志配置
  const {
    enabled: logEnabled = false,
    level: logLevel = "info",
    prefix: logPrefix = "PayPal",
    logger: customLogger,
  } = logging;

  // 创建日志器
  const logger: Logger = customLogger || createLogger({
    level: logLevel,
    format: "color",
    tags: ["payment", "paypal"],
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
   * 获取访问令牌
   */
  const getAccessToken = async (): Promise<string> => {
    // 检查缓存的令牌是否有效
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    const auth = btoa(`${clientId}:${clientSecret}`);
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error("获取 PayPal 访问令牌失败");
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 提前 60 秒过期

    return accessToken!;
  };

  /**
   * 发送 PayPal API 请求
   */
  const paypalRequest = async (
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<unknown> => {
    const token = await getAccessToken();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "PayPal API 请求失败");
    }

    // 某些请求可能返回空响应
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  };

  return {
    name: "paypal",
    version: "1.0.0",

    /**
     * 创建支付
     */
    async createPayment(order: PaymentOrderInfo): Promise<PaymentResponse> {
      log("创建 PayPal 支付", order);

      try {
        const amount = (order.amount / 100).toFixed(2); // 转换为元

        const orderData = {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: order.orderId,
              description: order.description,
              amount: {
                currency_code: order.currency || "USD",
                value: amount,
              },
            },
          ],
          application_context: {
            return_url: order.returnUrl || "",
            cancel_url: order.callbackUrl || "",
            brand_name: order.productName,
            user_action: "PAY_NOW",
          },
        };

        const result = (await paypalRequest("/v2/checkout/orders", "POST", orderData)) as {
          id: string;
          status: string;
          links: Array<{ rel: string; href: string }>;
        };

        // 获取支付页面链接
        const approveLink = result.links.find((l) => l.rel === "approve");

        log("订单创建成功", result);

        return {
          success: true,
          transactionId: result.id,
          paymentUrl: approveLink?.href,
          rawResponse: result,
        };
      } catch (error) {
        log("创建支付失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "创建 PayPal 支付失败",
          errorCode: "PAYPAL_CREATE_ERROR",
        };
      }
    },

    /**
     * 查询支付状态
     */
    async queryPayment(transactionId: string): Promise<PaymentStatusResponse> {
      log("查询支付状态", transactionId);

      try {
        const order = (await paypalRequest(`/v2/checkout/orders/${transactionId}`, "GET")) as {
          id: string;
          status: string;
          purchase_units: Array<{
            amount: { value: string; currency_code: string };
            payments?: { captures?: Array<{ create_time: string }> };
          }>;
        };

        // 转换 PayPal 状态到通用状态
        const statusMap: Record<string, PaymentStatusResponse["status"]> = {
          CREATED: "pending",
          SAVED: "pending",
          APPROVED: "pending",
          VOIDED: "cancelled",
          COMPLETED: "completed",
          PAYER_ACTION_REQUIRED: "pending",
        };

        const purchaseUnit = order.purchase_units[0];
        const capture = purchaseUnit.payments?.captures?.[0];

        return {
          success: true,
          status: statusMap[order.status] || "pending",
          paid: order.status === "COMPLETED",
          transactionId: order.id,
          amount: Math.round(parseFloat(purchaseUnit.amount.value) * 100),
          currency: purchaseUnit.amount.currency_code,
          paidAt: capture ? new Date(capture.create_time) : undefined,
          rawResponse: order,
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
      log("处理 PayPal Webhook", data.body);

      try {
        const event = data.body as {
          event_type: string;
          resource: {
            id: string;
            status: string;
            purchase_units?: Array<{
              reference_id: string;
              amount: { value: string; currency_code: string };
            }>;
          };
        };

        // 处理不同事件类型
        switch (event.event_type) {
          case "CHECKOUT.ORDER.APPROVED": {
            // 订单已批准，需要捕获
            const orderId = event.resource.id;

            // 自动捕获支付
            const captureResult = await paypalRequest(
              `/v2/checkout/orders/${orderId}/capture`,
              "POST",
            );

            log("支付已捕获", captureResult);

            const purchaseUnit = event.resource.purchase_units?.[0];
            return {
              success: true,
              orderId: purchaseUnit?.reference_id,
              transactionId: orderId,
              status: "completed",
              amount: purchaseUnit
                ? Math.round(parseFloat(purchaseUnit.amount.value) * 100)
                : undefined,
              currency: purchaseUnit?.amount.currency_code,
              platformResponse: JSON.stringify({ status: "ok" }),
            };
          }

          case "PAYMENT.CAPTURE.COMPLETED": {
            const purchaseUnit = event.resource.purchase_units?.[0];
            return {
              success: true,
              orderId: purchaseUnit?.reference_id,
              transactionId: event.resource.id,
              status: "completed",
              platformResponse: JSON.stringify({ status: "ok" }),
            };
          }

          case "PAYMENT.CAPTURE.DENIED":
          case "PAYMENT.CAPTURE.REFUNDED": {
            return {
              success: true,
              transactionId: event.resource.id,
              status: event.event_type.includes("REFUNDED") ? "refunded" : "failed",
              platformResponse: JSON.stringify({ status: "ok" }),
            };
          }

          default:
            log("未处理的事件类型", event.event_type);
            return {
              success: true,
              platformResponse: JSON.stringify({ status: "ok" }),
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
        const refundData: Record<string, unknown> = {};

        if (request.amount) {
          refundData.amount = {
            value: (request.amount / 100).toFixed(2),
            currency_code: "USD", // 需要从原订单获取
          };
        }

        if (request.reason) {
          refundData.note_to_payer = request.reason;
        }

        const refund = (await paypalRequest(
          `/v2/payments/captures/${request.transactionId}/refund`,
          "POST",
          Object.keys(refundData).length > 0 ? refundData : undefined,
        )) as {
          id: string;
          status: string;
        };

        return {
          success: true,
          refundId: refund.id,
          status: refund.status === "COMPLETED" ? "completed" : "pending",
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
      if (!clientId) {
        log("配置验证失败：缺少 clientId");
        return false;
      }
      if (!clientSecret) {
        log("配置验证失败：缺少 clientSecret");
        return false;
      }
      return true;
    },

    /**
     * 获取客户端配置
     */
    getClientConfig(): Record<string, unknown> {
      return {
        clientId,
        sandbox,
        // PayPal JS SDK 配置
        sdkUrl: `https://www.paypal.com/sdk/js?client-id=${clientId}${sandbox ? "&debug=true" : ""}`,
      };
    },
  };
}

// 导出默认工厂函数
export default createPayPalAdapter;
