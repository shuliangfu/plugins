/**
 * @module @dreamer/plugins/payment/adapters/web3
 *
 * Web3 支付适配器
 *
 * 提供加密货币支付集成，支持：
 * - 以太坊 (ETH) 支付
 * - ERC-20 代币支付 (USDT, USDC, DAI 等)
 * - 多链支持 (Ethereum, Polygon, BSC, Arbitrum 等)
 * - MetaMask / WalletConnect 集成
 * - 交易状态查询
 * - 智能合约交互
 *
 * @see https://docs.ethers.org/
 * @see https://docs.walletconnect.com/
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
 * 支持的区块链网络
 */
export type Web3Network =
  | "ethereum"      // 以太坊主网
  | "goerli"        // 以太坊测试网
  | "sepolia"       // 以太坊测试网
  | "polygon"       // Polygon 主网
  | "mumbai"        // Polygon 测试网
  | "bsc"           // 币安智能链
  | "bsc-testnet"   // 币安智能链测试网
  | "arbitrum"      // Arbitrum
  | "optimism"      // Optimism
  | "avalanche"     // Avalanche
  | "base";         // Base

/**
 * 支持的代币类型
 */
export type Web3Token =
  | "ETH"           // 原生以太币
  | "MATIC"         // Polygon 原生代币
  | "BNB"           // 币安币
  | "USDT"          // Tether
  | "USDC"          // USD Coin
  | "DAI"           // DAI
  | "WETH"          // Wrapped ETH
  | "WBTC";         // Wrapped BTC

/**
 * 代币合约地址映射
 */
const TOKEN_ADDRESSES: Record<Web3Network, Partial<Record<Web3Token, string>>> = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EescdeCB5BE3830",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  polygon: {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  bsc: {
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    DAI: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
  },
  goerli: {},
  sepolia: {},
  mumbai: {},
  "bsc-testnet": {},
  arbitrum: {
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  },
  optimism: {
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
  },
  avalanche: {
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

/**
 * 网络 RPC 端点
 */
const NETWORK_RPC: Record<Web3Network, string> = {
  ethereum: "https://eth.llamarpc.com",
  goerli: "https://goerli.infura.io/v3/",
  sepolia: "https://sepolia.infura.io/v3/",
  polygon: "https://polygon-rpc.com",
  mumbai: "https://rpc-mumbai.maticvigil.com",
  bsc: "https://bsc-dataseed.binance.org",
  "bsc-testnet": "https://data-seed-prebsc-1-s1.binance.org:8545",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  base: "https://mainnet.base.org",
};

/**
 * 网络区块浏览器
 */
const NETWORK_EXPLORERS: Record<Web3Network, string> = {
  ethereum: "https://etherscan.io",
  goerli: "https://goerli.etherscan.io",
  sepolia: "https://sepolia.etherscan.io",
  polygon: "https://polygonscan.com",
  mumbai: "https://mumbai.polygonscan.com",
  bsc: "https://bscscan.com",
  "bsc-testnet": "https://testnet.bscscan.com",
  arbitrum: "https://arbiscan.io",
  optimism: "https://optimistic.etherscan.io",
  avalanche: "https://snowtrace.io",
  base: "https://basescan.org",
};

/**
 * Web3 支付配置选项
 */
export interface Web3PayConfig {
  /** 商户钱包地址（收款地址） */
  merchantAddress: string;
  /** 支持的网络列表 */
  networks?: Web3Network[];
  /** 默认网络 */
  defaultNetwork?: Web3Network;
  /** 支持的代币列表 */
  supportedTokens?: Web3Token[];
  /** 自定义 RPC 端点 */
  rpcEndpoints?: Partial<Record<Web3Network, string>>;
  /** Infura Project ID（用于以太坊节点访问） */
  infuraId?: string;
  /** Alchemy API Key */
  alchemyApiKey?: string;
  /** 交易确认数（默认 12） */
  confirmations?: number;
  /** 交易超时时间（毫秒，默认 30 分钟） */
  transactionTimeout?: number;
  /** 是否为测试网 */
  testnet?: boolean;
  /** 日志配置 */
  logging?: LoggerOptions;
}

/**
 * Web3 交易信息
 */
interface Web3Transaction {
  /** 交易哈希 */
  hash: string;
  /** 发送方地址 */
  from: string;
  /** 接收方地址 */
  to: string;
  /** 金额（Wei） */
  value: string;
  /** 代币地址（原生代币为空） */
  tokenAddress?: string;
  /** 网络 */
  network: Web3Network;
  /** 确认数 */
  confirmations: number;
  /** 状态 */
  status: "pending" | "confirmed" | "failed";
  /** 区块号 */
  blockNumber?: number;
  /** Gas 费用 */
  gasUsed?: string;
}

/**
 * 创建 Web3 支付适配器
 *
 * @param config - Web3 配置
 * @returns 支付适配器实例
 *
 * @example
 * ```typescript
 * import { createWeb3Adapter } from "@dreamer/plugins/payment/adapters/web3";
 *
 * const web3 = createWeb3Adapter({
 *   merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f1e888",
 *   networks: ["ethereum", "polygon", "bsc"],
 *   supportedTokens: ["ETH", "USDT", "USDC"],
 * });
 *
 * // 创建支付
 * const result = await web3.createPayment({
 *   orderId: "order_123",
 *   amount: 1000000, // 1 USDT (6 decimals)
 *   currency: "USDT",
 * });
 * ```
 */
export function createWeb3Adapter(config: Web3PayConfig): PaymentAdapter {
  const {
    merchantAddress,
    networks = ["ethereum"],
    defaultNetwork = "ethereum",
    supportedTokens = ["ETH", "USDT", "USDC"],
    rpcEndpoints = {},
    infuraId,
    alchemyApiKey,
    confirmations = 12,
    transactionTimeout = 30 * 60 * 1000, // 30 分钟
    testnet = false,
    logging = {},
  } = config;

  // 日志配置
  const {
    enabled: logEnabled = false,
    level: logLevel = "info",
    prefix: logPrefix = "Web3Pay",
    logger: customLogger,
  } = logging;

  // 创建日志器
  const logger: Logger = customLogger || createLogger({
    level: logLevel,
    format: "color",
    tags: ["payment", "web3"],
  });

  /**
   * 日志输出
   */
  const log = (message: string, data?: unknown) => {
    if (logEnabled) {
      logger.debug(`[${logPrefix}] ${message}`, data);
    }
  };

  // 存储待处理交易
  const pendingTransactions = new Map<string, {
    orderId: string;
    expectedAmount: string;
    token: Web3Token;
    network: Web3Network;
    createdAt: number;
  }>();

  /**
   * 获取 RPC 端点
   */
  const getRpcEndpoint = (network: Web3Network): string => {
    // 优先使用自定义端点
    if (rpcEndpoints[network]) {
      return rpcEndpoints[network]!;
    }

    // 使用 Infura
    if (infuraId && (network === "ethereum" || network === "goerli" || network === "sepolia")) {
      return `https://${network}.infura.io/v3/${infuraId}`;
    }

    // 使用 Alchemy
    if (alchemyApiKey && network === "ethereum") {
      return `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    }

    return NETWORK_RPC[network];
  };

  /**
   * 格式化金额为 Wei
   */
  const toWei = (amount: number, decimals: number = 18): string => {
    return (BigInt(amount) * BigInt(10 ** decimals)).toString();
  };

  /**
   * 格式化 Wei 为可读金额
   */
  const fromWei = (wei: string, decimals: number = 18): number => {
    return Number(BigInt(wei) / BigInt(10 ** (decimals - 6))) / 1000000;
  };

  /**
   * 获取代币小数位
   */
  const getTokenDecimals = (token: Web3Token): number => {
    switch (token) {
      case "USDT":
      case "USDC":
        return 6;
      case "WBTC":
        return 8;
      default:
        return 18;
    }
  };

  /**
   * 获取代币合约地址
   */
  const getTokenAddress = (token: Web3Token, network: Web3Network): string | undefined => {
    return TOKEN_ADDRESSES[network]?.[token];
  };

  /**
   * 生成支付 ID
   */
  const generatePaymentId = (): string => {
    return `web3_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  /**
   * 调用 RPC 方法
   */
  const rpcCall = async (
    network: Web3Network,
    method: string,
    params: unknown[],
  ): Promise<unknown> => {
    const endpoint = getRpcEndpoint(network);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "RPC 调用失败");
    }

    return result.result;
  };

  /**
   * 获取交易信息
   */
  const getTransaction = async (
    txHash: string,
    network: Web3Network,
  ): Promise<Web3Transaction | null> => {
    try {
      // 获取交易详情
      const tx = (await rpcCall(network, "eth_getTransactionByHash", [txHash])) as {
        from: string;
        to: string;
        value: string;
        blockNumber: string | null;
      } | null;

      if (!tx) {
        return null;
      }

      // 获取交易收据
      const receipt = (await rpcCall(network, "eth_getTransactionReceipt", [txHash])) as {
        status: string;
        blockNumber: string;
        gasUsed: string;
      } | null;

      // 获取当前区块号
      const currentBlock = (await rpcCall(network, "eth_blockNumber", [])) as string;
      const currentBlockNum = parseInt(currentBlock, 16);
      const txBlockNum = tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0;
      const txConfirmations = tx.blockNumber ? currentBlockNum - txBlockNum : 0;

      return {
        hash: txHash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        network,
        confirmations: txConfirmations,
        status: receipt
          ? (receipt.status === "0x1" ? "confirmed" : "failed")
          : "pending",
        blockNumber: txBlockNum || undefined,
        gasUsed: receipt?.gasUsed,
      };
    } catch (error) {
      log("获取交易失败", error);
      return null;
    }
  };

  return {
    name: "web3",
    version: "1.0.0",

    /**
     * 创建支付
     * 返回前端需要的支付信息，由前端调用 Web3 钱包进行支付
     */
    async createPayment(order: PaymentOrderInfo): Promise<PaymentResponse> {
      await Promise.resolve(); // 满足 async 函数要求
      log("创建 Web3 支付", order);

      try {
        const paymentId = generatePaymentId();
        const token = (order.currency as Web3Token) || "ETH";
        const network = defaultNetwork;

        // 验证代币是否支持
        if (!supportedTokens.includes(token)) {
          return {
            success: false,
            error: `不支持的代币: ${token}`,
            errorCode: "UNSUPPORTED_TOKEN",
          };
        }

        // 计算金额
        const decimals = getTokenDecimals(token);
        const amountInWei = toWei(order.amount, decimals - 2); // amount 已经是分，需要调整

        // 获取代币地址
        const tokenAddress = token === "ETH" || token === "MATIC" || token === "BNB"
          ? undefined
          : getTokenAddress(token, network);

        // 存储待处理交易
        pendingTransactions.set(paymentId, {
          orderId: order.orderId,
          expectedAmount: amountInWei,
          token,
          network,
          createdAt: Date.now(),
        });

        // 构建支付信息
        const paymentInfo = {
          paymentId,
          merchantAddress,
          amount: amountInWei,
          amountFormatted: fromWei(amountInWei, decimals).toFixed(6),
          token,
          tokenAddress,
          network,
          chainId: getChainId(network),
          rpcEndpoint: getRpcEndpoint(network),
          explorer: NETWORK_EXPLORERS[network],
          expiresAt: Date.now() + transactionTimeout,
        };

        log("支付信息已生成", paymentInfo);

        return {
          success: true,
          transactionId: paymentId,
          paymentToken: JSON.stringify(paymentInfo),
          rawResponse: paymentInfo,
        };
      } catch (error) {
        log("创建支付失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "创建 Web3 支付失败",
          errorCode: "WEB3_CREATE_ERROR",
        };
      }
    },

    /**
     * 查询支付状态
     */
    async queryPayment(transactionId: string): Promise<PaymentStatusResponse> {
      log("查询支付状态", transactionId);

      try {
        // 检查是否是交易哈希（以 0x 开头，64位十六进制）
        if (transactionId.startsWith("0x") && transactionId.length === 66) {
          // 直接查询链上交易
          const tx = await getTransaction(transactionId, defaultNetwork);

          if (!tx) {
            return {
              success: false,
              status: "failed",
              paid: false,
              error: "交易不存在",
            };
          }

          const isConfirmed = tx.confirmations >= confirmations;

          return {
            success: true,
            status: tx.status === "confirmed" && isConfirmed ? "completed" : "pending",
            paid: tx.status === "confirmed" && isConfirmed,
            transactionId: tx.hash,
            rawResponse: {
              ...tx,
              explorerUrl: `${NETWORK_EXPLORERS[tx.network]}/tx/${tx.hash}`,
            },
          };
        }

        // 查询待处理交易
        const pending = pendingTransactions.get(transactionId);
        if (!pending) {
          return {
            success: false,
            status: "failed",
            paid: false,
            error: "支付记录不存在",
          };
        }

        // 检查是否超时
        if (Date.now() > pending.createdAt + transactionTimeout) {
          pendingTransactions.delete(transactionId);
          return {
            success: true,
            status: "cancelled",
            paid: false,
          };
        }

        return {
          success: true,
          status: "pending",
          paid: false,
          rawResponse: pending,
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
     * 处理回调通知
     * 前端提交交易哈希后验证交易
     */
    async handleNotify(data: NotifyData): Promise<NotifyResponse> {
      log("处理 Web3 支付通知", data.body);

      try {
        const body = data.body as {
          paymentId?: string;
          txHash?: string;
          network?: Web3Network;
        };

        const { paymentId, txHash, network = defaultNetwork } = body;

        if (!txHash) {
          return {
            success: false,
            error: "缺少交易哈希",
          };
        }

        // 验证交易
        const tx = await getTransaction(txHash, network);

        if (!tx) {
          return {
            success: false,
            error: "交易不存在或尚未上链",
          };
        }

        // 验证接收地址
        if (tx.to.toLowerCase() !== merchantAddress.toLowerCase()) {
          return {
            success: false,
            error: "交易接收地址不匹配",
          };
        }

        // 验证交易状态
        if (tx.status === "failed") {
          return {
            success: true,
            orderId: paymentId,
            transactionId: txHash,
            status: "failed",
            error: "交易执行失败",
            platformResponse: JSON.stringify({ verified: false }),
          };
        }

        // 验证确认数
        const isConfirmed = tx.confirmations >= confirmations;

        // 获取待处理交易信息
        const pending = paymentId ? pendingTransactions.get(paymentId) : undefined;

        if (isConfirmed && pending && paymentId) {
          // 验证金额
          if (BigInt(tx.value) < BigInt(pending.expectedAmount)) {
            return {
              success: true,
              orderId: pending.orderId,
              transactionId: txHash,
              status: "failed",
              error: "支付金额不足",
              platformResponse: JSON.stringify({ verified: false }),
            };
          }

          // 清除待处理交易
          pendingTransactions.delete(paymentId);
        }

        return {
          success: true,
          orderId: pending?.orderId,
          transactionId: txHash,
          status: isConfirmed ? "completed" : "failed",
          platformResponse: JSON.stringify({
            verified: true,
            confirmations: tx.confirmations,
            requiredConfirmations: confirmations,
          }),
        };
      } catch (error) {
        log("处理通知失败", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "处理通知失败",
        };
      }
    },

    /**
     * 申请退款
     * 注意：区块链交易不可逆，退款需要主动发起新交易
     */
    async refund(request: RefundRequest): Promise<RefundResponse> {
      await Promise.resolve(); // 满足 async 函数要求
      log("申请退款", request);

      // 区块链交易不可逆，无法自动退款
      // 需要商户主动发起转账交易
      return {
        success: false,
        error: "Web3 支付不支持自动退款，请手动发起转账",
        rawResponse: {
          note: "区块链交易不可逆，退款需要商户主动向用户地址发起转账",
          originalTxHash: request.transactionId,
        },
      };
    },

    /**
     * 验证配置
     */
    validateConfig(): boolean {
      if (!merchantAddress) {
        log("配置验证失败：缺少 merchantAddress");
        return false;
      }
      // 验证地址格式
      if (!/^0x[a-fA-F0-9]{40}$/.test(merchantAddress)) {
        log("配置验证失败：merchantAddress 格式无效");
        return false;
      }
      return true;
    },

    /**
     * 获取客户端配置
     */
    getClientConfig(): Record<string, unknown> {
      return {
        merchantAddress,
        networks,
        defaultNetwork,
        supportedTokens,
        confirmations,
        testnet,
        chainIds: networks.reduce((acc, network) => {
          acc[network] = getChainId(network);
          return acc;
        }, {} as Record<string, number>),
        explorers: networks.reduce((acc, network) => {
          acc[network] = NETWORK_EXPLORERS[network];
          return acc;
        }, {} as Record<string, string>),
      };
    },
  };
}

/**
 * 获取网络 Chain ID
 */
function getChainId(network: Web3Network): number {
  const chainIds: Record<Web3Network, number> = {
    ethereum: 1,
    goerli: 5,
    sepolia: 11155111,
    polygon: 137,
    mumbai: 80001,
    bsc: 56,
    "bsc-testnet": 97,
    arbitrum: 42161,
    optimism: 10,
    avalanche: 43114,
    base: 8453,
  };
  return chainIds[network];
}

// 导出默认工厂函数
export default createWeb3Adapter;
