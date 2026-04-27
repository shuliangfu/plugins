/**
 * @module @dreamer/plugins/scheduled
 *
 * 计划任务（Cron）插件：在应用 `onStart` 时用 `@dreamer/runtime-adapter` 的 `cron()`
 * 注册任务，在 `onStop` 时关闭句柄。日志统一走 `@dreamer/logger`：优先从容器取 `Logger` 实例并
 * `child()` 合并第二参 `LoggerConfig`，否则独立 `createLogger`。
 */

import type { Plugin } from "@dreamer/plugin";
import type { Logger, LoggerConfig } from "@dreamer/logger";
import {
  createCommand,
  cron,
  type CronHandle,
  cwd,
  execPath,
  resolve,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

import {
  buildPluginTaskLogger,
  type PluginTaskLogger,
} from "../internal/plugin-logger.ts";

/** 重新导出，便于 `scheduledPlugin(tasks, logger)` 第二参类型标注 */
export type { LoggerConfig } from "@dreamer/logger";

/** 计划任务执行层使用的变参日志（与 `PluginTaskLogger` 同形） */
type TaskLogger = PluginTaskLogger;

// ---------------------------------------------------------------------------
// 类型：Cron 任务条目（command / script 二选一）
// ---------------------------------------------------------------------------

/**
 * 直接执行子进程 argv（首项为可执行文件）
 */
export interface ScheduledTaskCommandEntry {
  /** 日志展示名；缺省为 `command[0]` */
  name?: string;
  /** Cron：5 段（从分）或 6 段（从秒），与 node-cron 一致 */
  cron: string;
  timezone?: string;
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  inheritIo?: boolean;
}

/**
 * 使用当前运行时 `execPath()` 执行脚本（默认 `deno run -A`）
 */
export interface ScheduledTaskScriptEntry {
  name?: string;
  cron: string;
  timezone?: string;
  script: string;
  cwd?: string;
  denoArgs?: string[];
  args?: string[];
  inheritIo?: boolean;
}

/**
 * 单条任务：`command` 与 `script` 二选一
 */
export type ScheduledTaskEntry =
  | ScheduledTaskCommandEntry
  | ScheduledTaskScriptEntry;

/**
 * 插件内部：首参任务 + 次参 `@dreamer/logger` 配置
 */
type ScheduledPluginRuntime = {
  tasks: ScheduledTaskEntry[];
  logger?: LoggerConfig;
};

const PLUGIN_NAME = "@dreamer/plugins-scheduled";
const PLUGIN_VERSION = "1.0.0";

const SCHEDULED_TAG = "@dreamer/plugins-scheduled";

/**
 * 校验任务列表；非法时抛出带说明的 `Error`。
 * 由 `scheduledPlugin()` 构造时调用，无需业务侧单独调用。
 *
 * @param tasks 任务数组
 */
function validateScheduledTaskEntries(tasks: unknown): void {
  if (!Array.isArray(tasks)) {
    throw new Error("scheduledPlugin: tasks must be an array");
  }
  for (let i = 0; i < tasks.length; i++) {
    const msg = validateOneTask(tasks[i], i);
    if (msg) throw new Error(`scheduledPlugin: ${msg}`);
  }
}

/**
 * 校验单条任务，合法返回 `undefined`，否则返回英文错误句
 */
function validateOneTask(task: unknown, index: number): string | undefined {
  if (!task || typeof task !== "object") {
    return `tasks[${index}] must be an object`;
  }
  const t = task as Record<string, unknown>;
  const hasCmd = "command" in t && t.command !== undefined;
  const hasScript = "script" in t && t.script !== undefined;
  if (hasCmd === hasScript) {
    return `tasks[${index}] must have exactly one of "command" or "script"`;
  }
  if (typeof t.cron !== "string" || t.cron.trim() === "") {
    return `tasks[${index}].cron must be a non-empty string`;
  }
  if (hasCmd) {
    if (!Array.isArray(t.command) || t.command.length < 1) {
      return `tasks[${index}].command must be a non-empty string array`;
    }
    const exe = t.command[0];
    if (typeof exe !== "string" || exe.trim() === "") {
      return `tasks[${index}].command[0] must be a non-empty string`;
    }
  } else if (typeof t.script !== "string" || t.script.trim() === "") {
    return `tasks[${index}].script must be a non-empty string`;
  }
  if (t.timezone !== undefined && typeof t.timezone !== "string") {
    return `tasks[${index}].timezone must be a string when set`;
  }
  if (t.cwd !== undefined && typeof t.cwd !== "string") {
    return `tasks[${index}].cwd must be a string when set`;
  }
  return undefined;
}

/**
 * 截断二进制输出用于日志
 */
function truncateBytes(buf: Uint8Array, max: number): string {
  const slice = buf.byteLength > max ? buf.subarray(0, max) : buf;
  const text = new TextDecoder().decode(slice);
  return buf.byteLength > max ? `${text}…` : text;
}

function taskLabel(task: ScheduledTaskEntry, index: number): string {
  if (task.name && task.name.trim() !== "") return task.name;
  if (isCommandTask(task)) return task.command[0] ?? `task#${index}`;
  return task.script;
}

function isCommandTask(
  task: ScheduledTaskEntry,
): task is ScheduledTaskCommandEntry {
  return "command" in task && Array.isArray(task.command);
}

function isScriptTask(
  task: ScheduledTaskEntry,
): task is ScheduledTaskScriptEntry {
  return "script" in task && typeof task.script === "string";
}

/**
 * 注册全部 Cron，返回关闭函数
 */
function registerCronJobs(
  tasks: ScheduledTaskEntry[],
  logger: TaskLogger,
): () => void {
  if (!tasks.length) return () => {};

  const handles: CronHandle[] = [];
  const baseCwd = cwd();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const label = taskLabel(task, i);
    const run = () => runOneTask(task, label, baseCwd, logger);

    const handle = cron(task.cron, run, {
      timezone: task.timezone,
      onError: (error) => {
        logger.error(`task "${label}" cron failed:`, error);
      },
    });
    handles.push(handle);
  }

  /** 注册完成系诊断信息，用 debug 避免默认 info 刷屏 */
  logger.debug?.(`registered ${handles.length} cron job(s)`);

  return () => {
    for (const h of handles) {
      try {
        h.close();
      } catch (e) {
        logger.warn(`failed to close cron handle:`, e);
      }
    }
  };
}

async function runOneTask(
  task: ScheduledTaskEntry,
  label: string,
  baseCwd: string,
  logger: TaskLogger,
): Promise<void> {
  try {
    if (isCommandTask(task)) {
      await runCommandTask(task, label, logger);
    } else if (isScriptTask(task)) {
      await runScriptTask(task, label, baseCwd, logger);
    }
  } catch (error) {
    logger.error(`task "${label}" failed:`, error);
  }
}

async function runCommandTask(
  task: ScheduledTaskCommandEntry,
  label: string,
  logger: TaskLogger,
): Promise<void> {
  const exe = task.command[0];
  const args = task.command.slice(1);
  const io = task.inheritIo === true
    ? { stdout: "inherit" as const, stderr: "inherit" as const }
    : { stdout: "piped" as const, stderr: "piped" as const };

  const cmd = createCommand(exe, {
    args,
    cwd: task.cwd,
    env: task.env,
    ...io,
  });

  if (task.inheritIo === true) {
    const child = cmd.spawn();
    const st = await child.status;
    try {
      child.unref();
    } catch {
      /* ignore */
    }
    if (!st.success) {
      logger.warn(`"${label}" exited with code ${st.code}`);
    }
    return;
  }

  const out = await cmd.output();
  if (!out.success) {
    logger.warn(
      `"${label}" exit ${out.code} stderr=${truncateBytes(out.stderr, 2048)}`,
    );
  }
}

async function runScriptTask(
  task: ScheduledTaskScriptEntry,
  label: string,
  baseCwd: string,
  logger: TaskLogger,
): Promise<void> {
  const denoBin = execPath();
  const scriptPath = resolve(task.cwd ?? baseCwd, task.script);
  const denoArgs = task.denoArgs ?? ["run", "-A"];
  const args = [...denoArgs, scriptPath, ...(task.args ?? [])];

  const io = task.inheritIo === true
    ? { stdout: "inherit" as const, stderr: "inherit" as const }
    : { stdout: "piped" as const, stderr: "piped" as const };

  const cmd = createCommand(denoBin, {
    args,
    cwd: task.cwd,
    ...io,
  });

  if (task.inheritIo === true) {
    const child = cmd.spawn();
    const st = await child.status;
    try {
      child.unref();
    } catch {
      /* ignore */
    }
    if (!st.success) {
      logger.warn(`"${label}" exited with code ${st.code}`);
    }
    return;
  }

  const out = await cmd.output();
  if (!out.success) {
    logger.warn(
      `"${label}" exit ${out.code} stderr=${truncateBytes(out.stderr, 2048)}`,
    );
  }
}

/**
 * 创建计划任务插件：在 `onStart` 注册 Cron，在 `onStop` 关闭。
 *
 * @param tasks Cron 任务列表（`command` 与 `script` 二选一）
 * @param logger 可选；与 `APP_CONFIG.logger` 同形的 **`LoggerConfig`**，写入独立文件、轮转等均在第二参配置
 *
 * @example
 * ```ts
 * import { scheduledPlugin } from "jsr:@dreamer/plugins/scheduled";
 *
 * scheduledPlugin(
 *   [{ name: "ping", cron: "0/30 * * * * *", command: ["echo", "ok"], inheritIo: true }],
 *   { level: "info", output: { console: false, file: { path: "./logs/scheduled.log" } } },
 * );
 * ```
 */
export function scheduledPlugin(
  tasks: ScheduledTaskEntry[],
  logger?: LoggerConfig,
): Plugin {
  validateScheduledTaskEntries(tasks);
  const runtime: ScheduledPluginRuntime = { tasks, logger };

  /** 关闭已注册的 Cron；仅在 onStart 成功后赋值 */
  let disposeCron: (() => void) | null = null;
  /** 由本插件创建或 `child()` 出的 Logger，需在 onStop 中 close */
  let dreamerToClose: Logger | null = null;

  return {
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,

    config: {
      scheduledTasks: {
        count: tasks.length,
        hasLoggerConfig: Boolean(logger),
      },
    },

    /**
     * 服务监听就绪后注册 Cron（`onStart` 钩子内）
     */
    onStart(container: ServiceContainer) {
      if (!tasks.length) {
        return;
      }
      const built = buildPluginTaskLogger(
        container,
        runtime.logger,
        SCHEDULED_TAG,
      );
      dreamerToClose = built.dreamerToClose;
      disposeCron = registerCronJobs(tasks, built.taskLogger);
    },

    /**
     * 优雅停止时先关闭 Cron，再关闭计划任务专用 Logger 的文件句柄
     */
    async onStop(_container: ServiceContainer) {
      if (disposeCron) {
        try {
          disposeCron();
        } catch (e) {
          console.warn("scheduledPlugin onStop cron cleanup error:", e);
        }
        disposeCron = null;
      }
      if (dreamerToClose) {
        try {
          await dreamerToClose.close();
        } catch (e) {
          console.warn("scheduledPlugin onStop logger close error:", e);
        }
        dreamerToClose = null;
      }
    },
  };
}
