/**
 * @module @dreamer/plugins/tailwindcss/compiler
 *
 * TailwindCSS 编译器
 *
 * 负责编译 TailwindCSS 样式
 */

import { exists, readTextFile } from "@dreamer/runtime-adapter";

/**
 * TailwindCSS 编译选项
 */
export interface TailwindCompileOptions {
  /** CSS 入口文件路径 */
  cssEntry: string;
  /** 内容扫描路径 */
  content: string[];
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
}

/**
 * TailwindCSS 编译器类
 *
 * 负责将 TailwindCSS 源文件编译为最终的 CSS 输出
 */
export class TailwindCompiler {
  /** 编译配置选项 */
  private options: TailwindCompileOptions;
  /** CSS 缓存（用于开发模式热重载） */
  private cache: Map<string, { css: string; mtime: number }> = new Map();

  /**
   * 创建 TailwindCSS 编译器实例
   *
   * @param options - 编译配置选项
   */
  constructor(options: TailwindCompileOptions) {
    this.options = options;
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

    return await this.compileTailwindCSS();
  }

  /**
   * 编译 TailwindCSS 样式
   *
   * @returns 编译结果
   */
  private async compileTailwindCSS(): Promise<CSSCompileResult> {
    const { cssEntry, content, config } = this.options;
    const dev = this.options.dev ?? false;

    try {
      // 读取入口文件
      let cssContent = await readTextFile(cssEntry);

      // 检查是否需要 TailwindCSS 处理
      if (
        !cssContent.includes("@import") && !cssContent.includes("@tailwind")
      ) {
        // 如果没有 TailwindCSS 指令，添加默认导入
        cssContent = `@import "tailwindcss";\n${cssContent}`;
      }

      // 在开发模式下，使用简单的处理（实际应该使用 PostCSS + TailwindCSS）
      // 在生产模式下，应该使用完整的 PostCSS 处理链
      if (dev) {
        // 开发模式：返回基础样式 + 占位符（实际应该实时编译）
        return {
          css: cssContent,
          needsRebuild: true, // 开发模式需要热重载
        };
      } else {
        // 生产模式：使用 PostCSS 处理
        return {
          css: await this.processTailwindCSS(cssContent, content, config),
        };
      }
    } catch (error) {
      console.error("[TailwindCSS] 编译失败:", error);
      return { css: "" };
    }
  }

  /**
   * 处理 TailwindCSS（生产模式）
   *
   * @param css - CSS 内容
   * @param _content - 内容扫描路径
   * @param _config - 配置文件路径
   * @returns 处理后的 CSS 内容
   */
  private processTailwindCSS(
    css: string,
    _content: string[],
    _config?: string,
  ): Promise<string> {
    // 这里应该调用实际的 TailwindCSS 编译器
    // 使用 PostCSS + tailwindcss 插件
    // 暂时返回原内容（实际实现需要安装 tailwindcss 包）
    return Promise.resolve(css);
  }

  /**
   * 清除编译缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}
