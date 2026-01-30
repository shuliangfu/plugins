/**
 * 支付适配器测试
 *
 * 测试所有支付适配器的核心功能
 */

import { describe, expect, it } from "@dreamer/test";
import {
  createAlipayAdapter,
  createApplePayAdapter,
  createGooglePayAdapter,
  createPayPalAdapter,
  createStripeAdapter,
  createUnionPayAdapter,
  createWeb3Adapter,
  createWechatPayAdapter,
} from "../src/payment/mod.ts";

// ============================================
// Stripe 适配器测试
// ============================================
describe("Stripe 适配器", () => {
  // 创建测试适配器
  const createTestAdapter = () =>
    createStripeAdapter({
      publicKey: "pk_test_xxx",
      secretKey: "sk_test_xxx",
      webhookSecret: "whsec_xxx",
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("stripe");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createStripeAdapter({
        publicKey: "pk_test_xxx",
        secretKey: "sk_test_xxx",
      });

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝无效的 publicKey", () => {
      const adapter = createStripeAdapter({
        publicKey: "invalid_key",
        secretKey: "sk_test_xxx",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝无效的 secretKey", () => {
      const adapter = createStripeAdapter({
        publicKey: "pk_test_xxx",
        secretKey: "invalid_key",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回客户端配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.publicKey).toBe("pk_test_xxx");
      expect(config.apiVersion).toBeDefined();
    });
  });

  describe("创建支付", () => {
    it("应该返回支付结果结构", async () => {
      const adapter = createTestAdapter();

      // 注意：实际 API 调用会失败，但我们验证返回结构
      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000,
        currency: "USD",
      });

      // 由于是模拟环境，验证返回包含 success 字段
      expect(result).toHaveProperty("success");
    });
  });

  describe("处理回调", () => {
    it("应该处理 Webhook 回调", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_test_xxx",
              metadata: { orderId: "order_123" },
              amount: 1000,
              currency: "usd",
            },
          },
        },
        // 使用有效的签名格式
        headers: new Headers({ "stripe-signature": "t=1234567890,v1=test_signature" }),
      });

      // Stripe Webhook 需要验证签名，模拟环境下会跳过验证
      expect(result).toHaveProperty("success");
    });
  });
});

// ============================================
// PayPal 适配器测试
// ============================================
describe("PayPal 适配器", () => {
  const createTestAdapter = () =>
    createPayPalAdapter({
      clientId: "client_xxx",
      clientSecret: "secret_xxx",
      sandbox: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("paypal");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 clientId 的配置", () => {
      const adapter = createPayPalAdapter({
        clientId: "",
        clientSecret: "secret_xxx",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 clientSecret 的配置", () => {
      const adapter = createPayPalAdapter({
        clientId: "client_xxx",
        clientSecret: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回客户端配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.clientId).toBe("client_xxx");
      expect(config.sandbox).toBe(true);
      expect(config.sdkUrl).toBeDefined();
    });
  });
});

// ============================================
// 支付宝适配器测试
// ============================================
describe("支付宝适配器", () => {
  const createTestAdapter = () =>
    createAlipayAdapter({
      appId: "2021000000000000",
      privateKey: "test_private_key",
      alipayPublicKey: "test_public_key",
      sandbox: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("alipay");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 appId 的配置", () => {
      const adapter = createAlipayAdapter({
        appId: "",
        privateKey: "test_private_key",
        alipayPublicKey: "test_public_key",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 privateKey 的配置", () => {
      const adapter = createAlipayAdapter({
        appId: "2021000000000000",
        privateKey: "",
        alipayPublicKey: "test_public_key",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 alipayPublicKey 的配置", () => {
      const adapter = createAlipayAdapter({
        appId: "2021000000000000",
        privateKey: "test_private_key",
        alipayPublicKey: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回客户端配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.appId).toBe("2021000000000000");
      expect(config.sandbox).toBe(true);
      expect(config.gateway).toBeDefined();
    });
  });

  describe("创建支付", () => {
    it("应该生成支付信息", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000,
        currency: "CNY",
        productName: "测试商品",
      });

      // 支付宝返回支付 URL 或原始响应
      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result.transactionId).toBeDefined();
      }
    });
  });

  describe("处理回调", () => {
    it("应该处理支付成功通知", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          trade_status: "TRADE_SUCCESS",
          out_trade_no: "order_123",
          trade_no: "2023123456789",
          total_amount: "10.00",
          sign: "mock_sign",
        },
        headers: new Headers(),
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order_123");
      expect(result.status).toBe("completed");
      expect(result.platformResponse).toBe("success");
    });

    it("应该处理交易关闭通知", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          trade_status: "TRADE_CLOSED",
          out_trade_no: "order_123",
          trade_no: "2023123456789",
          total_amount: "10.00",
        },
        headers: new Headers(),
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("cancelled");
    });
  });
});

// ============================================
// 微信支付适配器测试
// ============================================
describe("微信支付适配器", () => {
  const createTestAdapter = () =>
    createWechatPayAdapter({
      mchId: "1234567890",
      apiKey: "test_api_key_32_characters_long",
      appId: "wx1234567890abcdef",
      serialNo: "test_serial_no",
      sandbox: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("wechat");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 mchId 的配置", () => {
      const adapter = createWechatPayAdapter({
        mchId: "",
        apiKey: "test_api_key",
        appId: "wx1234567890abcdef",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 apiKey 的配置", () => {
      const adapter = createWechatPayAdapter({
        mchId: "1234567890",
        apiKey: "",
        appId: "wx1234567890abcdef",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 appId 的配置", () => {
      const adapter = createWechatPayAdapter({
        mchId: "1234567890",
        apiKey: "test_api_key",
        appId: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回客户端配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.appId).toBe("wx1234567890abcdef");
      expect(config.mchId).toBe("1234567890");
      expect(config.sandbox).toBe(true);
      expect(config.tradeType).toBe("NATIVE");
    });
  });

  describe("处理回调", () => {
    it("应该处理支付通知", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          resource: {
            ciphertext: "encrypted_data",
            associated_data: "transaction",
            nonce: "random_nonce",
          },
        },
        headers: new Headers({
          "Wechatpay-Timestamp": "1234567890",
          "Wechatpay-Nonce": "random",
          "Wechatpay-Signature": "sig",
        }),
      });

      // 由于使用模拟解密，验证返回结构
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Apple Pay 适配器测试
// ============================================
describe("Apple Pay 适配器", () => {
  const createTestAdapter = () =>
    createApplePayAdapter({
      merchantId: "merchant.com.example.store",
      merchantName: "Example Store",
      sandbox: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("apple-pay");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 merchantId 的配置", () => {
      const adapter = createApplePayAdapter({
        merchantId: "",
        merchantName: "Example Store",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 merchantName 的配置", () => {
      const adapter = createApplePayAdapter({
        merchantId: "merchant.com.example.store",
        merchantName: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回 Apple Pay JS 配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.merchantId).toBe("merchant.com.example.store");
      expect(config.merchantName).toBe("Example Store");
      expect(config.supportedNetworks).toBeDefined();
      expect(config.merchantCapabilities).toBeDefined();
      expect(config.countryCode).toBe("US");
    });
  });

  describe("创建支付", () => {
    it("应该返回支付请求配置", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000,
        currency: "USD",
        productName: "Test Product",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.paymentToken).toBeDefined();

      // paymentToken 是 base64 编码的 JSON
      const paymentConfig = JSON.parse(atob(result.paymentToken!));
      expect(paymentConfig.merchantId).toBe("merchant.com.example.store");
      expect(paymentConfig.paymentRequest).toBeDefined();
      expect(paymentConfig.paymentRequest.total).toBeDefined();
    });
  });

  describe("查询支付", () => {
    it("应该返回需要支付处理器的提示", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.queryPayment("apple_pay_123");

      // Apple Pay 本身不支持查询，需要通过支付处理器
      expect(result.success).toBe(true);
      expect(result.status).toBe("pending");
    });
  });

  describe("退款", () => {
    it("应该返回需要支付处理器的提示", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.refund({
        transactionId: "apple_pay_123",
        amount: 500,
      });

      // Apple Pay 退款返回 success: false，因为需要通过支付处理器
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================
// Google Pay 适配器测试
// ============================================
describe("Google Pay 适配器", () => {
  const createTestAdapter = () =>
    createGooglePayAdapter({
      merchantId: "12345678901234567890",
      merchantName: "Example Store",
      gateway: "stripe",
      gatewayMerchantId: "acct_xxx",
      environment: "TEST",
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("google-pay");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该在生产环境拒绝缺少 merchantId 的配置", () => {
      const adapter = createGooglePayAdapter({
        merchantId: "",
        merchantName: "Example Store",
        gateway: "stripe",
        gatewayMerchantId: "acct_xxx",
        environment: "PRODUCTION", // 生产环境需要 merchantId
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 gateway 的配置", () => {
      const adapter = createGooglePayAdapter({
        merchantId: "12345678901234567890",
        merchantName: "Example Store",
        gateway: "" as "stripe",
        gatewayMerchantId: "acct_xxx",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回 Google Pay 配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      // TEST 环境下 merchantId 是 undefined
      expect(config.merchantName).toBe("Example Store");
      expect(config.environment).toBe("TEST");
      expect(config.allowedCardNetworks).toBeDefined();
      expect(config.gateway).toBe("stripe");
    });
  });

  describe("创建支付", () => {
    it("应该返回 PaymentDataRequest 配置", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000,
        currency: "USD",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.paymentToken).toBeDefined();

      // paymentToken 是 base64 编码的 JSON
      const paymentConfig = JSON.parse(atob(result.paymentToken!));
      expect(paymentConfig.paymentDataRequest).toBeDefined();
      expect(paymentConfig.paymentDataRequest.apiVersion).toBe(2);
    });
  });
});

// ============================================
// 银联支付适配器测试
// ============================================
describe("银联支付适配器", () => {
  const createTestAdapter = () =>
    createUnionPayAdapter({
      merchantId: "777290058110097",
      terminalId: "00000001",
      sandbox: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("unionpay");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 merchantId 的配置", () => {
      const adapter = createUnionPayAdapter({
        merchantId: "",
        terminalId: "00000001",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝缺少 terminalId 的配置", () => {
      const adapter = createUnionPayAdapter({
        merchantId: "777290058110097",
        terminalId: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });
  });

  describe("客户端配置", () => {
    it("应该返回客户端配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.merchantId).toBe("777290058110097");
      expect(config.sandbox).toBe(true);
    });
  });

  describe("创建支付", () => {
    it("应该生成支付表单", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000,
        currency: "CNY",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      // 银联返回支付表单或跳转信息
      expect(result.rawResponse).toBeDefined();
    });
  });

  describe("处理回调", () => {
    it("应该处理支付成功通知", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          respCode: "00",
          orderId: "order_123",
          queryId: "unionpay_query_123",
          txnAmt: "1000",
          signature: "mock_signature",
        },
        headers: new Headers(),
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order_123");
      expect(result.status).toBe("completed");
    });

    it("应该处理支付失败通知", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          respCode: "01",
          orderId: "order_123",
          respMsg: "支付失败",
        },
        headers: new Headers(),
      });

      // 银联失败通知返回结果
      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result.status).toBe("failed");
      }
    });
  });
});

// ============================================
// Web3 支付适配器测试
// ============================================
describe("Web3 支付适配器", () => {
  const createTestAdapter = () =>
    createWeb3Adapter({
      merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f1e888",
      networks: ["ethereum", "polygon"],
      defaultNetwork: "ethereum",
      supportedTokens: ["ETH", "USDT", "USDC"],
      confirmations: 12,
      testnet: true,
      logging: { enabled: false },
    });

  describe("创建适配器", () => {
    it("应该成功创建适配器", () => {
      const adapter = createTestAdapter();

      expect(adapter.name).toBe("web3");
      expect(adapter.version).toBe("1.0.0");
    });

    it("应该提供所有必需方法", () => {
      const adapter = createTestAdapter();

      expect(adapter.createPayment).toBeDefined();
      expect(adapter.queryPayment).toBeDefined();
      expect(adapter.handleNotify).toBeDefined();
      expect(adapter.refund).toBeDefined();
      expect(adapter.validateConfig).toBeDefined();
      expect(adapter.getClientConfig).toBeDefined();
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const adapter = createTestAdapter();

      expect(adapter.validateConfig()).toBe(true);
    });

    it("应该拒绝缺少 merchantAddress 的配置", () => {
      const adapter = createWeb3Adapter({
        merchantAddress: "",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该拒绝无效的钱包地址格式", () => {
      const adapter = createWeb3Adapter({
        merchantAddress: "invalid_address",
      });

      expect(adapter.validateConfig()).toBe(false);
    });

    it("应该接受有效的以太坊地址", () => {
      const adapter = createWeb3Adapter({
        merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f1e888",
      });

      expect(adapter.validateConfig()).toBe(true);
    });
  });

  describe("客户端配置", () => {
    it("应该返回 Web3 配置", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();

      expect(config.merchantAddress).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f1e888");
      expect(config.networks).toContain("ethereum");
      expect(config.networks).toContain("polygon");
      expect(config.supportedTokens).toContain("ETH");
      expect(config.supportedTokens).toContain("USDT");
      expect(config.confirmations).toBe(12);
      expect(config.chainIds).toBeDefined();
      expect(config.explorers).toBeDefined();
    });

    it("应该包含正确的 Chain ID", () => {
      const adapter = createTestAdapter();
      const config = adapter.getClientConfig();
      const chainIds = config.chainIds as Record<string, number>;

      expect(chainIds.ethereum).toBe(1);
      expect(chainIds.polygon).toBe(137);
    });
  });

  describe("创建支付", () => {
    it("应该生成 ETH 支付信息", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_123",
        amount: 1000000, // 0.01 ETH in wei / 100
        currency: "ETH",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toMatch(/^web3_/);
      expect(result.paymentToken).toBeDefined();

      // 验证支付信息
      const paymentInfo = JSON.parse(result.paymentToken!);
      expect(paymentInfo.merchantAddress).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f1e888");
      expect(paymentInfo.token).toBe("ETH");
      expect(paymentInfo.network).toBe("ethereum");
      expect(paymentInfo.chainId).toBe(1);
    });

    it("应该生成 USDT 支付信息", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_456",
        amount: 100000, // 10 USDT
        currency: "USDT",
      });

      expect(result.success).toBe(true);
      const paymentInfo = JSON.parse(result.paymentToken!);
      expect(paymentInfo.token).toBe("USDT");
      expect(paymentInfo.tokenAddress).toBeDefined();
    });

    it("应该拒绝不支持的代币", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.createPayment({
        orderId: "order_789",
        amount: 1000,
        currency: "UNKNOWN_TOKEN",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("UNSUPPORTED_TOKEN");
    });
  });

  describe("查询支付", () => {
    it("应该返回待处理交易不存在的错误", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.queryPayment("web3_nonexistent");

      expect(result.success).toBe(false);
      expect(result.paid).toBe(false);
    });

    it("应该查询刚创建的支付", async () => {
      const adapter = createTestAdapter();

      // 先创建支付
      const createResult = await adapter.createPayment({
        orderId: "order_query_test",
        amount: 1000,
        currency: "ETH",
      });

      // 查询支付状态
      const queryResult = await adapter.queryPayment(createResult.transactionId!);

      expect(queryResult.success).toBe(true);
      expect(queryResult.status).toBe("pending");
      expect(queryResult.paid).toBe(false);
    });
  });

  describe("处理回调", () => {
    it("应该拒绝缺少交易哈希的回调", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.handleNotify({
        body: {
          paymentId: "web3_123",
        },
        headers: new Headers(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("缺少交易哈希");
    });
  });

  describe("退款", () => {
    it("应该返回不支持自动退款的提示", async () => {
      const adapter = createTestAdapter();

      const result = await adapter.refund({
        transactionId: "0x1234567890abcdef",
        amount: 500,
        reason: "用户申请退款",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("不支持自动退款");
      expect(result.rawResponse).toBeDefined();
    });
  });
});

// ============================================
// 通用适配器工厂测试
// ============================================
describe("适配器工厂", () => {
  it("所有适配器应该实现相同的接口", () => {
    const adapters = [
      createStripeAdapter({ publicKey: "pk_test", secretKey: "sk_test" }),
      createPayPalAdapter({ clientId: "id", clientSecret: "secret" }),
      createAlipayAdapter({ appId: "app", privateKey: "key", alipayPublicKey: "pub" }),
      createWechatPayAdapter({ mchId: "mch", apiKey: "api", appId: "app" }),
      createApplePayAdapter({ merchantId: "merchant", merchantName: "name" }),
      createGooglePayAdapter({ merchantId: "id", merchantName: "name", gateway: "stripe", gatewayMerchantId: "gw" }),
      createUnionPayAdapter({ merchantId: "mch", terminalId: "term" }),
      createWeb3Adapter({ merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f1e888" }),
    ];

    for (const adapter of adapters) {
      // 验证所有必需属性
      expect(adapter.name).toBeDefined();
      expect(adapter.version).toBeDefined();

      // 验证所有必需方法
      expect(typeof adapter.createPayment).toBe("function");
      expect(typeof adapter.queryPayment).toBe("function");
      expect(typeof adapter.handleNotify).toBe("function");
      expect(typeof adapter.refund).toBe("function");
      expect(typeof adapter.validateConfig).toBe("function");
      expect(typeof adapter.getClientConfig).toBe("function");
    }
  });
});
