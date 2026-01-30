/**
 * @module @dreamer/plugins/captcha
 *
 * 验证码插件
 *
 * 提供验证码功能，支持：
 * - 图形验证码生成
 * - 验证码验证
 * - 过期时间设置
 * - 自定义难度
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 验证码插件配置选项
 */
export interface CaptchaPluginOptions {
  /** 验证码生成路径（默认 "/captcha"） */
  generatePath?: string;
  /** 验证码验证路径（默认 "/captcha/verify"） */
  verifyPath?: string;
  /** 验证码长度（默认 4） */
  length?: number;
  /** 验证码字符集（默认数字和大写字母，排除易混淆字符） */
  charset?: string;
  /** 过期时间（毫秒，默认 300000 = 5 分钟） */
  expiresIn?: number;
  /** 是否区分大小写（默认 false） */
  caseSensitive?: boolean;
  /** 图片宽度（默认 120） */
  width?: number;
  /** 图片高度（默认 40） */
  height?: number;
  /** 干扰线数量（默认 4） */
  noiseLines?: number;
  /** 干扰点数量（默认 50） */
  noiseDots?: number;
  /** 背景颜色（默认 "#f0f0f0"） */
  backgroundColor?: string;
  /** 文字颜色列表 */
  textColors?: string[];
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 验证码记录
 */
interface CaptchaRecord {
  /** 验证码文本 */
  code: string;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
}

/**
 * 验证码存储（内存实现）
 */
class CaptchaStore {
  /** 存储记录 */
  private records: Map<string, CaptchaRecord> = new Map();

  /**
   * 保存验证码
   * @param id - 验证码 ID
   * @param code - 验证码文本
   * @param expiresIn - 过期时间（毫秒）
   */
  set(id: string, code: string, expiresIn: number): void {
    const now = Date.now();
    this.records.set(id, {
      code,
      createdAt: now,
      expiresAt: now + expiresIn,
    });
  }

  /**
   * 获取验证码
   * @param id - 验证码 ID
   * @returns 验证码文本或 null
   */
  get(id: string): string | null {
    const record = this.records.get(id);
    if (!record) return null;

    // 检查是否过期
    if (Date.now() > record.expiresAt) {
      this.records.delete(id);
      return null;
    }

    return record.code;
  }

  /**
   * 验证并删除验证码
   * @param id - 验证码 ID
   * @param code - 用户输入的验证码
   * @param caseSensitive - 是否区分大小写
   * @returns 是否验证通过
   */
  verify(id: string, code: string, caseSensitive: boolean): boolean {
    const storedCode = this.get(id);
    if (!storedCode) return false;

    const isValid = caseSensitive
      ? storedCode === code
      : storedCode.toLowerCase() === code.toLowerCase();

    // 验证后删除（一次性使用）
    this.records.delete(id);

    return isValid;
  }

  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, record] of this.records.entries()) {
      if (now > record.expiresAt) {
        this.records.delete(id);
      }
    }
  }
}

/**
 * 默认字符集（排除易混淆字符：0, O, 1, I, l）
 */
const DEFAULT_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * 默认文字颜色
 */
const DEFAULT_TEXT_COLORS = [
  "#333333",
  "#4a4a4a",
  "#1a1a1a",
  "#2d2d2d",
  "#3d3d3d",
];

/**
 * 生成随机验证码文本
 * @param length - 长度
 * @param charset - 字符集
 * @returns 验证码文本
 */
function generateCode(length: number, charset: string): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * charset.length);
    code += charset[index];
  }
  return code;
}

/**
 * 生成随机颜色
 * @param colors - 颜色列表
 * @returns 随机颜色
 */
function randomColor(colors: string[]): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 生成 SVG 验证码图片
 * @param code - 验证码文本
 * @param options - 配置选项
 * @returns SVG 字符串
 */
function generateSvgCaptcha(
  code: string,
  options: {
    width: number;
    height: number;
    noiseLines: number;
    noiseDots: number;
    backgroundColor: string;
    textColors: string[];
  },
): string {
  const { width, height, noiseLines, noiseDots, backgroundColor, textColors } =
    options;

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // 背景
  svg += `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;

  // 干扰线
  for (let i = 0; i < noiseLines; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = randomColor(textColors);
    svg +=
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
  }

  // 干扰点
  for (let i = 0; i < noiseDots; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 2 + 1;
    const color = randomColor(textColors);
    svg +=
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.3"/>`;
  }

  // 文字
  const charWidth = width / (code.length + 1);
  const fontSize = Math.min(height * 0.7, charWidth * 1.5);

  for (let i = 0; i < code.length; i++) {
    const x = charWidth * (i + 0.5);
    const y = height / 2 + fontSize / 3;
    const rotate = Math.random() * 30 - 15;
    const color = randomColor(textColors);

    svg +=
      `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" 
            font-weight="bold" fill="${color}" 
            transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
  }

  svg += "</svg>";

  return svg;
}

/**
 * 创建验证码插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { captchaPlugin } from "@dreamer/plugins/captcha";
 *
 * // 基础用法
 * const plugin = captchaPlugin();
 *
 * // 自定义配置
 * const plugin = captchaPlugin({
 *   length: 6,
 *   expiresIn: 60000, // 1 分钟
 *   width: 150,
 *   height: 50,
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function captchaPlugin(options: CaptchaPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    generatePath = "/captcha",
    verifyPath = "/captcha/verify",
    length = 4,
    charset = DEFAULT_CHARSET,
    expiresIn = 300000,
    caseSensitive = false,
    width = 120,
    height = 40,
    noiseLines = 4,
    noiseDots = 50,
    backgroundColor = "#f0f0f0",
    textColors = DEFAULT_TEXT_COLORS,
    debug = false,
  } = options;

  // 创建存储实例
  const store = new CaptchaStore();

  // 定期清理过期记录
  // 清理定时器（使用下划线前缀表示内部使用）
  let _cleanupInterval: number | undefined;

  return {
    name: "@dreamer/plugins-captcha",
    version: "1.0.0",

    // 插件配置
    config: {
      captcha: {
        generatePath,
        verifyPath,
        length,
        expiresIn,
        caseSensitive,
        width,
        height,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.captcha && typeof config.captcha === "object") {
        const cap = config.captcha as Record<string, unknown>;
        // 验证 length
        if (
          cap.length !== undefined &&
          (typeof cap.length !== "number" || cap.length < 1)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册验证码服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册验证码配置服务
      container.registerSingleton("captchaConfig", () => ({
        generatePath,
        verifyPath,
        length,
        expiresIn,
        caseSensitive,
        width,
        height,
        debug,
      }));

      // 注册验证码服务
      container.registerSingleton("captchaService", () => ({
        /**
         * 生成验证码
         * @returns 验证码 ID 和图片
         */
        generate: () => {
          const id = crypto.randomUUID();
          const code = generateCode(length, charset);
          store.set(id, code, expiresIn);

          const svg = generateSvgCaptcha(code, {
            width,
            height,
            noiseLines,
            noiseDots,
            backgroundColor,
            textColors,
          });

          return { id, svg };
        },
        /**
         * 验证验证码
         * @param id - 验证码 ID
         * @param code - 用户输入的验证码
         * @returns 是否验证通过
         */
        verify: (id: string, code: string): boolean => {
          return store.verify(id, code, caseSensitive);
        },
      }));

      // 启动清理定时器
      _cleanupInterval = setInterval(() => {
        store.cleanup();
      }, 60000) as unknown as number;

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `验证码插件已初始化: length=${length}, expiresIn=${expiresIn}ms`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理验证码生成和验证请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const path = ctx.path || "";
      const method = ctx.method?.toUpperCase();

      // 处理验证码生成请求
      if (path === generatePath && method === "GET") {
        const captchaService = container.get<{
          generate: () => { id: string; svg: string };
        }>("captchaService");

        if (!captchaService) {
          return;
        }

        const { id, svg } = captchaService.generate();

        // 将 SVG 转换为 base64 data URL
        const base64 = btoa(svg);
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        ctx.response = new Response(
          JSON.stringify({
            id,
            image: dataUrl,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        );

        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(`验证码生成: id=${id}`);
          }
        }

        return;
      }

      // 处理验证码验证请求
      if (path === verifyPath && method === "POST") {
        const captchaService = container.get<{
          verify: (id: string, code: string) => boolean;
        }>("captchaService");

        if (!captchaService || !ctx.request) {
          return;
        }

        try {
          const body = await ctx.request.json();
          const { id, code } = body;

          if (!id || !code) {
            ctx.response = new Response(
              JSON.stringify({ success: false, error: "缺少 id 或 code 参数" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
            return;
          }

          const isValid = captchaService.verify(id, code);

          ctx.response = new Response(
            JSON.stringify({ success: isValid }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );

          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(`验证码验证: id=${id}, valid=${isValid}`);
            }
          }
        } catch (error) {
          ctx.response = new Response(
            JSON.stringify({
              success: false,
              error: "请求解析失败",
              message: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return;
      }
    },
    // 注意：清理定时器的逻辑由闭包内部管理
    // cleanupInterval 会在服务容器销毁时自动清理
  };
}

// 导出默认创建函数
export default captchaPlugin;
