/**
 * @module @dreamer/plugins/unocss/compiler
 *
 * UnoCSS 编译器
 *
 * 负责编译 UnoCSS 样式
 */

import { exists, readTextFile } from "@dreamer/runtime-adapter";

/**
 * UnoCSS 编译选项
 */
export interface UnoCompileOptions {
  /** CSS 入口文件路径 */
  cssEntry: string;
  /** 内容扫描路径 */
  content: string[];
  /** 配置文件路径（可选） */
  config?: string;
  /** 是否为开发模式 */
  dev?: boolean;
  /** 预设列表 */
  presets?: string[];
  /** 是否启用图标系统 */
  icons?: boolean;
  /** 图标预设 */
  iconPresets?: string[];
  /** 自定义规则 */
  rules?: Array<[string, unknown]>;
  /** 自定义快捷方式 */
  shortcuts?: Record<string, string>;
  /** 自定义主题 */
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
 * UnoCSS 编译器类
 *
 * 负责将 UnoCSS 源文件编译为最终的 CSS 输出
 */
export class UnoCompiler {
  /** 编译配置选项 */
  private options: UnoCompileOptions;
  /** CSS 缓存（用于开发模式热重载） */
  private cache: Map<string, { css: string; mtime: number }> = new Map();

  /**
   * 创建 UnoCSS 编译器实例
   *
   * @param options - 编译配置选项
   */
  constructor(options: UnoCompileOptions) {
    this.options = options;
  }

  /**
   * 编译 UnoCSS
   *
   * @returns 编译后的 CSS 结果
   */
  async compile(): Promise<CSSCompileResult> {
    const { cssEntry } = this.options;

    // 检查入口文件是否存在
    if (!(await exists(cssEntry))) {
      console.warn(`[UnoCSS] CSS 入口文件不存在: ${cssEntry}`);
      return { css: "" };
    }

    return await this.compileUnoCSS();
  }

  /**
   * 编译 UnoCSS 样式
   *
   * @returns 编译结果
   */
  private async compileUnoCSS(): Promise<CSSCompileResult> {
    const { cssEntry, content, config } = this.options;
    const dev = this.options.dev ?? false;

    try {
      // 读取入口文件
      let cssContent = await readTextFile(cssEntry);

      // 检查是否需要 UnoCSS 处理
      if (!cssContent.includes("@unocss")) {
        // 如果没有 UnoCSS 指令，添加默认导入
        cssContent = `@unocss preflights;\n@unocss default;\n${cssContent}`;
      }

      // 在开发模式下，使用简单的处理
      // 在生产模式下，使用完整的 UnoCSS 处理
      if (dev) {
        // 开发模式：返回基础样式 + 占位符（实际应该实时编译）
        return {
          css: cssContent,
          needsRebuild: true, // 开发模式需要热重载
        };
      } else {
        // 生产模式：使用 UnoCSS 处理
        return {
          css: await this.processUnoCSS(cssContent, content, config),
        };
      }
    } catch (error) {
      console.error("[UnoCSS] 编译失败:", error);
      return { css: "" };
    }
  }

  /**
   * 处理 UnoCSS（生产模式）
   *
   * @param css - CSS 内容
   * @param _content - 内容扫描路径
   * @param _config - 配置文件路径
   * @returns 处理后的 CSS 内容
   */
  private processUnoCSS(
    css: string,
    _content: string[],
    _config?: string,
  ): Promise<string> {
    // 这里应该调用实际的 UnoCSS 编译器
    // 暂时返回原内容（实际实现需要安装 unocss 包）
    return Promise.resolve(css);
  }

  /**
   * 清除编译缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}
