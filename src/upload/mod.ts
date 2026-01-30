/**
 * @module @dreamer/plugins/upload
 *
 * 文件上传插件
 *
 * 提供文件上传处理功能，支持：
 * - 单文件/多文件上传
 * - 文件大小限制
 * - 文件类型验证
 * - 自定义存储路径
 * - 文件重命名
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import { ensureDir, writeFile } from "@dreamer/runtime-adapter";

/**
 * 上传的文件信息
 */
export interface UploadedFile {
  /** 原始文件名 */
  originalName: string;
  /** 保存后的文件名 */
  filename: string;
  /** 保存的完整路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 表单字段名 */
  fieldName: string;
}

/**
 * 文件上传插件配置选项
 */
export interface UploadPluginOptions {
  /** 上传文件保存目录（默认 "./uploads"） */
  uploadDir?: string;
  /** 处理上传的 URL 路径（默认 "/upload"） */
  uploadPath?: string | string[];
  /** 单个文件最大大小（字节，默认 10MB） */
  maxFileSize?: number;
  /** 总上传大小限制（字节，默认 50MB） */
  maxTotalSize?: number;
  /** 允许的 MIME 类型（默认允许所有） */
  allowedMimeTypes?: string[];
  /** 禁止的 MIME 类型 */
  forbiddenMimeTypes?: string[];
  /** 允许的文件扩展名（默认允许所有） */
  allowedExtensions?: string[];
  /** 禁止的文件扩展名 */
  forbiddenExtensions?: string[];
  /** 文件名生成函数（默认使用 UUID） */
  generateFilename?: (originalName: string, mimeType: string) => string;
  /** 是否保留原始扩展名（默认 true） */
  preserveExtension?: boolean;
  /** 错误时的状态码（默认 400） */
  errorStatus?: number;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 默认禁止的扩展名（可执行文件）
 */
const DEFAULT_FORBIDDEN_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".jsp",
  ".asp",
  ".aspx",
];

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 */
function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 扩展名（包含点号）
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0) {
    return filename.slice(lastDot).toLowerCase();
  }
  return "";
}

/**
 * 文件验证参数
 */
interface FileValidationInput {
  /** 文件名 */
  name: string;
  /** MIME 类型 */
  type: string;
  /** 文件大小（字节） */
  size?: number;
}

/**
 * 验证文件是否允许上传
 * @param file - 文件信息对象
 * @param options - 配置选项
 * @returns 验证结果
 */
function validateFile(
  file: FileValidationInput,
  options: UploadPluginOptions,
): { valid: boolean; error?: string } {
  const { name: filename, type: mimeType, size: fileSize } = file;

  // 检查文件大小
  if (fileSize !== undefined && options.maxFileSize !== undefined) {
    if (fileSize > options.maxFileSize) {
      const maxSizeMB = (options.maxFileSize / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `文件大小超过限制，最大允许 ${maxSizeMB} MB`,
      };
    }
  }

  const ext = getExtension(filename);

  // 检查禁止的扩展名
  const forbiddenExts = options.forbiddenExtensions ||
    DEFAULT_FORBIDDEN_EXTENSIONS;
  if (forbiddenExts.includes(ext)) {
    return { valid: false, error: `禁止上传 ${ext} 类型的文件` };
  }

  // 检查允许的扩展名
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    if (!options.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `只允许上传 ${options.allowedExtensions.join(", ")} 类型的文件`,
      };
    }
  }

  // 检查禁止的 MIME 类型
  if (options.forbiddenMimeTypes && options.forbiddenMimeTypes.length > 0) {
    for (const forbidden of options.forbiddenMimeTypes) {
      if (mimeType.startsWith(forbidden) || mimeType === forbidden) {
        return { valid: false, error: `禁止上传 ${mimeType} 类型的文件` };
      }
    }
  }

  // 检查允许的 MIME 类型
  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    let allowed = false;
    for (const allowedType of options.allowedMimeTypes) {
      if (allowedType.endsWith("/*")) {
        // 通配符匹配
        const prefix = allowedType.slice(0, -1);
        if (mimeType.startsWith(prefix)) {
          allowed = true;
          break;
        }
      } else if (mimeType === allowedType) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      return {
        valid: false,
        error: `只允许上传 ${options.allowedMimeTypes.join(", ")} 类型的文件`,
      };
    }
  }

  return { valid: true };
}

/**
 * 创建文件上传插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { uploadPlugin } from "@dreamer/plugins/upload";
 *
 * // 基础用法
 * const plugin = uploadPlugin({
 *   uploadDir: "./uploads",
 *   maxFileSize: 10 * 1024 * 1024, // 10MB
 * });
 *
 * // 限制图片上传
 * const plugin = uploadPlugin({
 *   allowedMimeTypes: ["image/*"],
 *   allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
 *   maxFileSize: 5 * 1024 * 1024, // 5MB
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function uploadPlugin(options: UploadPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    uploadDir = "./uploads",
    uploadPath = "/upload",
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxTotalSize = 50 * 1024 * 1024, // 50MB
    allowedMimeTypes,
    forbiddenMimeTypes,
    allowedExtensions,
    forbiddenExtensions = DEFAULT_FORBIDDEN_EXTENSIONS,
    generateFilename = () => generateUuid(),
    preserveExtension = true,
    errorStatus = 400,
    debug = false,
  } = options;

  // 上传路径数组
  const uploadPaths = Array.isArray(uploadPath) ? uploadPath : [uploadPath];

  return {
    name: "@dreamer/plugins-upload",
    version: "1.0.0",

    // 插件配置
    config: {
      upload: {
        uploadDir,
        uploadPath,
        maxFileSize,
        maxTotalSize,
        allowedMimeTypes,
        forbiddenMimeTypes,
        allowedExtensions,
        forbiddenExtensions,
        preserveExtension,
        errorStatus,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.upload && typeof config.upload === "object") {
        const up = config.upload as Record<string, unknown>;
        // 验证 maxFileSize
        if (
          up.maxFileSize !== undefined &&
          (typeof up.maxFileSize !== "number" || up.maxFileSize < 0)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册上传服务到容器，创建上传目录
     */
    async onInit(container: ServiceContainer) {
      // 确保上传目录存在（使用 runtime-adapter 的 ensureDir）
      // ensureDir 会自动处理：目录不存在则创建，存在则不做操作
      await ensureDir(uploadDir);

      // 注册上传配置服务
      container.registerSingleton("uploadConfig", () => ({
        uploadDir,
        uploadPath,
        maxFileSize,
        maxTotalSize,
        allowedMimeTypes,
        forbiddenMimeTypes,
        allowedExtensions,
        forbiddenExtensions,
        preserveExtension,
        errorStatus,
        debug,
      }));

      // 注册上传服务
      container.registerSingleton("uploadService", () => ({
        /**
         * 获取上传目录
         */
        getUploadDir: () => uploadDir,
        /**
         * 验证文件
         * @param file - 文件信息对象 { name, type, size }
         * @returns 验证结果 { valid, error? }
         */
        validateFile: (file: FileValidationInput) => validateFile(file, options),
        /**
         * 生成文件名
         */
        generateFilename: (originalName: string, mimeType: string) => {
          const ext = preserveExtension ? getExtension(originalName) : "";
          return generateFilename(originalName, mimeType) + ext;
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `文件上传插件已初始化: uploadDir=${uploadDir}, maxFileSize=${maxFileSize}`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理文件上传请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 只处理 POST 请求
      if (ctx.method !== "POST") {
        return;
      }

      const path = ctx.path || "";

      // 检查是否是上传路径
      if (!uploadPaths.some((p) => path === p || path.startsWith(p + "/"))) {
        return;
      }

      // 检查 Content-Type
      const contentType = ctx.headers?.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return;
      }

      try {
        // 获取请求体
        if (!ctx.request) {
          ctx.response = new Response(
            JSON.stringify({ error: "无法获取请求体" }),
            {
              status: errorStatus,
              headers: { "Content-Type": "application/json" },
            },
          );
          return;
        }

        // 解析 multipart/form-data
        const formData = await ctx.request.formData();
        const uploadedFiles: UploadedFile[] = [];
        let totalSize = 0;

        for (const [fieldName, value] of formData.entries()) {
          if (value instanceof File) {
            const file = value;

            // 检查单个文件大小
            if (file.size > maxFileSize) {
              ctx.response = new Response(
                JSON.stringify({
                  error: `文件 ${file.name} 超出大小限制（最大 ${
                    Math.round(maxFileSize / 1024 / 1024)
                  }MB）`,
                }),
                {
                  status: errorStatus,
                  headers: { "Content-Type": "application/json" },
                },
              );
              return;
            }

            // 检查总大小
            totalSize += file.size;
            if (totalSize > maxTotalSize) {
              ctx.response = new Response(
                JSON.stringify({
                  error: `总上传大小超出限制（最大 ${
                    Math.round(maxTotalSize / 1024 / 1024)
                  }MB）`,
                }),
                {
                  status: errorStatus,
                  headers: { "Content-Type": "application/json" },
                },
              );
              return;
            }

            // 验证文件
            const validation = validateFile(
              { name: file.name, type: file.type, size: file.size },
              options,
            );
            if (!validation.valid) {
              ctx.response = new Response(
                JSON.stringify({ error: validation.error }),
                {
                  status: errorStatus,
                  headers: { "Content-Type": "application/json" },
                },
              );
              return;
            }

            // 生成文件名
            const ext = preserveExtension ? getExtension(file.name) : "";
            const filename = generateFilename(file.name, file.type) + ext;
            const filePath = `${uploadDir}/${filename}`;

            // 保存文件（使用 runtime-adapter 的 writeFile）
            const arrayBuffer = await file.arrayBuffer();
            await writeFile(filePath, new Uint8Array(arrayBuffer));

            uploadedFiles.push({
              originalName: file.name,
              filename,
              path: filePath,
              size: file.size,
              mimeType: file.type,
              fieldName,
            });

            // 调试日志
            if (debug) {
              const logger = container.has("logger")
                ? container.get<{ info: (msg: string) => void }>("logger")
                : null;
              if (logger) {
                logger.info(
                  `文件上传: ${file.name} -> ${filePath} (${file.size} bytes)`,
                );
              }
            }
          }
        }

        // 返回上传结果
        ctx.response = new Response(
          JSON.stringify({
            success: true,
            files: uploadedFiles,
            count: uploadedFiles.length,
            totalSize,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `文件上传失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        ctx.response = new Response(
          JSON.stringify({
            error: "文件上传失败",
            message: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  };
}

// 导出默认创建函数
export default uploadPlugin;
