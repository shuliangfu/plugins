/**
 * @module
 *
 * 供 `scheduled`、`queue` 等插件共用的 Logger 构建逻辑：
 * 优先使用容器内 `@dreamer/logger` 的 `Logger.child()` 合并第二参 `LoggerConfig`，
 * 否则独立 `createLogger`。
 */

import { createLogger, Logger, type LoggerConfig } from "@dreamer/logger";
import { cwd, resolve } from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 与 Cron / 队列等插件任务层兼容的变参日志接口
 */
export type PluginTaskLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
};

/**
 * 从容器取出 `@dreamer/logger` 的 `Logger` 实例（若存在且类型匹配）
 */
function tryGetDreamerLogger(container: ServiceContainer): Logger | undefined {
  try {
    if (container.has("logger")) {
      const raw = container.get("logger");
      if (raw instanceof Logger) return raw;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * 将变参日志适配为 `Logger` 的 `message` / `data` / `error` 形式
 */
function adaptDreamerLogger(dl: Logger): PluginTaskLogger {
  return {
    info: (...args: unknown[]) => {
      const [msg, data] = formatPluginLogArgs(args);
      dl.info(msg, data);
    },
    warn: (...args: unknown[]) => {
      const [msg, data] = formatPluginLogArgs(args);
      dl.warn(msg, data);
    },
    error: (...args: unknown[]) => {
      if (args.length === 0) return;
      const last = args[args.length - 1];
      const first = args[0];
      const msg = typeof first === "string" ? first : String(first);
      if (args.length === 2 && last instanceof Error) {
        dl.error(msg, undefined, last);
        return;
      }
      const [m, data] = formatPluginLogArgs(args);
      dl.error(m, data);
    },
    debug: (...args: unknown[]) => {
      const [msg, data] = formatPluginLogArgs(args);
      dl.debug(msg, data);
    },
  };
}

/**
 * 将多参数整理为 [message, data?]
 */
function formatPluginLogArgs(args: unknown[]): [string, unknown | undefined] {
  if (args.length === 0) return ["", undefined];
  const first = args[0];
  const message = typeof first === "string" ? first : String(first);
  if (args.length === 1) return [message, undefined];
  if (args.length === 2) return [message, args[1]];
  return [message, args.slice(1)];
}

/**
 * 合并子 Logger：继承应用级 `Logger`，第二参为完整 `LoggerConfig`（含 `output.file`）
 */
function mergeChildLoggerConfig(
  tag: string,
  logger?: LoggerConfig,
): Partial<LoggerConfig> {
  const user = logger;
  const basePartial: Partial<LoggerConfig> = {
    tags: [tag],
    ...(user ?? {}),
  };

  if (user?.output?.file?.path) {
    const p = user.output.file.path.trim();
    basePartial.output = {
      ...user.output,
      file: {
        ...user.output.file,
        path: resolve(cwd(), p),
      },
    };
    return basePartial;
  }

  return basePartial;
}

/**
 * 无容器内 `Logger` 时，独立 `createLogger` 的默认合并配置
 */
function mergeStandalonePluginConfig(
  tag: string,
  logger?: LoggerConfig,
): LoggerConfig {
  const defaultTags = [tag];
  const base: LoggerConfig = {
    level: "info",
    format: "text",
    color: "auto",
    tags: defaultTags,
    output: { console: true },
  };
  if (!logger) return base;

  const out = logger.output;
  const mergedFile = out?.file?.path
    ? {
      ...out.file,
      path: resolve(cwd(), out.file.path.trim()),
    }
    : out?.file;

  return {
    ...base,
    ...logger,
    tags: [...defaultTags, ...(logger.tags ?? [])],
    output: out
      ? {
        ...base.output,
        ...out,
        ...(mergedFile ? { file: mergedFile } : {}),
      }
      : base.output,
  };
}

/**
 * 解析插件使用的 `PluginTaskLogger` 及需在 `onStop` 中 `close()` 的 `Logger` 实例
 *
 * @param container 服务容器
 * @param loggerConfig 与 `APP_CONFIG.logger` 同形的可选配置
 * @param tag 日志 tag（如 `@dreamer/plugins-scheduled`）
 */
export function buildPluginTaskLogger(
  container: ServiceContainer,
  loggerConfig: LoggerConfig | undefined,
  tag: string,
): { taskLogger: PluginTaskLogger; dreamerToClose: Logger | null } {
  const base = tryGetDreamerLogger(container);

  if (base) {
    const child = base.child(mergeChildLoggerConfig(tag, loggerConfig));
    return { taskLogger: adaptDreamerLogger(child), dreamerToClose: child };
  }

  try {
    if (container.has("logger")) {
      const raw = container.get("logger");
      if (
        raw &&
        typeof raw === "object" &&
        "info" in raw &&
        typeof (raw as PluginTaskLogger).info === "function"
      ) {
        return { taskLogger: raw as PluginTaskLogger, dreamerToClose: null };
      }
    }
  } catch {
    /* ignore */
  }

  const standalone = createLogger(
    mergeStandalonePluginConfig(tag, loggerConfig),
  );
  return {
    taskLogger: adaptDreamerLogger(standalone),
    dreamerToClose: standalone,
  };
}
