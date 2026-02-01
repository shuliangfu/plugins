/**
 * @module @dreamer/plugins/tailwindcss/compiler
 *
 * TailwindCSS v4 编译器
 *
 * 负责编译 TailwindCSS 样式，使用 PostCSS + @tailwindcss/postcss
 */

import { cwd, exists, readTextFile } from "@dreamer/runtime-adapter";

/**
 * TailwindCSS 编译选项
 */
export interface TailwindCompileOptions {
  /** CSS 入口文件路径 */
  cssEntry: string;
  /** 内容扫描路径（可选，TailwindCSS v4 可在 CSS 中使用 @source 指令） */
  content?: string[];
  /** 配置文件路径（可选） */
  config?: string;
  /** 是否为开发模式 */
  dev?: boolean;
  /** 是否启用 JIT 模式 */
  jit?: boolean;
  /** 暗色模式配置 */
  darkMode?: boolean | "class" | "media";
  /** 自定义主题配置 */
  theme?: Record<string, unknown>;
}

/**
 * CSS 编译结果
 */
export interface CSSCompileResult {
  /** 编译后的 CSS 内容 */
  css: string;
  /** 是否需要重新编译（用于开发模式热重载） */
  needsRebuild?: boolean;
  /** 生成的文件名（不含路径，如 tailwind.abc123.css） */
  filename?: string;
  /** 内容 hash（用于缓存失效） */
  hash?: string;
}

/**
 * TailwindCSS 编译器类
 *
 * 负责将 TailwindCSS 源文件编译为最终的 CSS 输出
 */
export class TailwindCompiler {
  /** 编译配置选项 */
  private options: TailwindCompileOptions;
  /** 编译结果缓存 */
  private cachedResult: CSSCompileResult | null = null;
  /** PostCSS 实例 */
  private postcss: typeof import("postcss").default | null = null;
  /** TailwindCSS PostCSS 插件 */
  private tailwindPlugin: unknown | null = null;

  /**
   * 创建 TailwindCSS 编译器实例
   *
   * @param options - 编译配置选项
   */
  constructor(options: TailwindCompileOptions) {
    this.options = options;
  }

  /**
   * 初始化 PostCSS 和 TailwindCSS 插件
   */
  private async initPostCSS(): Promise<void> {
    if (this.postcss && this.tailwindPlugin) return;

    try {
      // 动态导入 postcss 和 @tailwindcss/postcss
      const postcssModule = await import("postcss");
      const tailwindModule = await import("@tailwindcss/postcss");

      this.postcss = postcssModule.default;
      this.tailwindPlugin = tailwindModule.default;
    } catch (error) {
      console.error("[TailwindCSS] 初始化 PostCSS 失败:", error);
      throw error;
    }
  }

  /**
   * 编译 TailwindCSS
   *
   * @returns 编译后的 CSS 结果
   */
  async compile(): Promise<CSSCompileResult> {
    const { cssEntry } = this.options;

    // 检查入口文件是否存在
    if (!(await exists(cssEntry))) {
      console.warn(`[TailwindCSS] CSS 入口文件不存在: ${cssEntry}`);
      return { css: "" };
    }

    // 如果有缓存且非开发模式，直接返回缓存
    if (this.cachedResult && !this.options.dev) {
      return this.cachedResult;
    }

    return await this.compileTailwindCSS();
  }

  /**
   * 获取最后一次编译的结果
   * 用于构建系统获取 hash 文件名
   *
   * @returns 最后一次编译结果，如果没有编译过则返回 null
   */
  getLastResult(): CSSCompileResult | null {
    return this.cachedResult;
  }

  /**
   * 编译 TailwindCSS 样式
   *
   * @returns 编译结果
   */
  private async compileTailwindCSS(): Promise<CSSCompileResult> {
    const { cssEntry } = this.options;
    const dev = this.options.dev ?? false;

    try {
      // 初始化 PostCSS
      await this.initPostCSS();

      // 读取入口文件
      const cssContent = await readTextFile(cssEntry);

      // 使用 PostCSS + TailwindCSS 编译
      const css = await this.processWithPostCSS(cssContent, cssEntry);

      // 生成内容 hash（用于缓存失效）
      const hash = await this.generateHash(css);

      // 生成带 hash 的文件名
      const filename = `tailwind.${hash}.css`;

      const result: CSSCompileResult = {
        css,
        needsRebuild: dev, // 开发模式需要热重载
        hash,
        filename,
      };

      // 缓存结果（非开发模式）
      if (!dev) {
        this.cachedResult = result;
      }

      return result;
    } catch (error) {
      console.error("[TailwindCSS] 编译失败:", error);
      // 返回空字符串，避免阻塞渲染
      return { css: "" };
    }
  }

  /**
   * 生成内容 hash
   *
   * @param content - 内容字符串
   * @returns 8 位 hash 字符串
   */
  private async generateHash(content: string): Promise<string> {
    // 使用 Web Crypto API 生成 SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    // 返回前 8 位
    return hashHex.substring(0, 8);
  }

  /**
   * 使用 PostCSS 处理 CSS
   *
   * @param css - CSS 内容
   * @param from - 源文件路径
   * @returns 处理后的 CSS 内容
   */
  private async processWithPostCSS(css: string, from: string): Promise<string> {
    if (!this.postcss || !this.tailwindPlugin) {
      throw new Error("PostCSS 未初始化");
    }

    try {
      // 获取工作目录用于解析相对路径
      const workDir = cwd();

      // 创建 PostCSS 处理器
      const processor = this.postcss([
        // @ts-ignore - 类型定义问题
        this.tailwindPlugin({
          // TailwindCSS v4 配置（可选）
          base: workDir,
        }),
      ]);

      // 处理 CSS
      const result = await processor.process(css, {
        from,
        to: from.replace(/\.css$/, ".out.css"),
      });

      return result.css;
    } catch (error) {
      console.error("[TailwindCSS] PostCSS 处理失败:", error);
      throw error;
    }
  }

  /**
   * 清除编译缓存
   */
  clearCache(): void {
    this.cachedResult = null;
  }
}
