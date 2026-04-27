/**
 * 计划任务插件（scheduledPlugin）单元测试
 *
 * 覆盖任务列表校验（在 `scheduledPlugin` 构造时执行）、插件元数据、`onStart`/`onStop` 行为。
 */

import { createLogger } from "@dreamer/logger";
import { ServiceContainer } from "@dreamer/service";
import { describe, expect, it } from "@dreamer/test";
import {
  scheduledPlugin,
  type ScheduledTaskEntry,
} from "../src/scheduled/mod.ts";

/**
 * 构造插件并触发与非法 `tasks` 相关的校验（类型上放宽以便测运行时校验）
 */
function expectScheduledPluginThrows(tasks: unknown, msg: string | RegExp) {
  expect(() => scheduledPlugin(tasks as ScheduledTaskEntry[], undefined))
    .toThrow(
      msg,
    );
}

describe("计划任务插件（scheduled）", () => {
  describe("任务列表校验（scheduledPlugin 构造时）", () => {
    it("应拒绝非数组 tasks", () => {
      expectScheduledPluginThrows(
        null,
        "scheduledPlugin: tasks must be an array",
      );
      expectScheduledPluginThrows(
        {} as unknown as ScheduledTaskEntry[],
        "scheduledPlugin: tasks must be an array",
      );
    });

    it("应接受空数组", () => {
      expect(() => scheduledPlugin([])).not.toThrow();
    });

    it("应接受合法的 command 任务", () => {
      expect(() =>
        scheduledPlugin([{ cron: "0 * * * *", command: ["echo", "hi"] }])
      ).not.toThrow();
    });

    it("应接受合法的 script 任务", () => {
      expect(() =>
        scheduledPlugin([
          { cron: "0 * * * * *", script: "./scripts/job.ts" },
        ])
      ).not.toThrow();
    });

    it("应拒绝 tasks[i] 非对象", () => {
      expectScheduledPluginThrows(
        [null],
        "scheduledPlugin: tasks[0] must be an object",
      );
    });

    it("应拒绝同时包含 command 与 script", () => {
      expectScheduledPluginThrows(
        [
          {
            cron: "* * * * *",
            command: ["echo"],
            script: "./x.ts",
          },
        ],
        'scheduledPlugin: tasks[0] must have exactly one of "command" or "script"',
      );
    });

    it("应拒绝既不包含 command 也不包含 script", () => {
      expectScheduledPluginThrows(
        [{ cron: "* * * * *" }],
        'scheduledPlugin: tasks[0] must have exactly one of "command" or "script"',
      );
    });

    it("应拒绝空或非字符串 cron", () => {
      expectScheduledPluginThrows(
        [{ cron: "", command: ["echo"] }],
        "scheduledPlugin: tasks[0].cron must be a non-empty string",
      );
      expectScheduledPluginThrows(
        [
          { cron: 1, command: ["echo"] } as unknown as {
            cron: string;
            command: string[];
          },
        ],
        "scheduledPlugin: tasks[0].cron must be a non-empty string",
      );
    });

    it("应拒绝空 command 数组或 command[0] 非法", () => {
      expectScheduledPluginThrows(
        [{ cron: "* * * * *", command: [] }],
        "scheduledPlugin: tasks[0].command must be a non-empty string array",
      );
      expectScheduledPluginThrows(
        [{ cron: "* * * * *", command: ["", "a"] }],
        "scheduledPlugin: tasks[0].command[0] must be a non-empty string",
      );
    });

    it("应拒绝空 script", () => {
      expectScheduledPluginThrows(
        [{ cron: "* * * * *", script: "  " }],
        "scheduledPlugin: tasks[0].script must be a non-empty string",
      );
    });

    it("应拒绝非法 timezone / cwd 类型", () => {
      expectScheduledPluginThrows(
        [
          {
            cron: "* * * * *",
            command: ["echo"],
            timezone: 1 as unknown as string,
          },
        ],
        "scheduledPlugin: tasks[0].timezone must be a string when set",
      );
      expectScheduledPluginThrows(
        [
          {
            cron: "* * * * *",
            command: ["echo"],
            cwd: true as unknown as string,
          },
        ],
        "scheduledPlugin: tasks[0].cwd must be a string when set",
      );
    });
  });

  describe("scheduledPlugin", () => {
    it("应返回正确的 name、version 与 config", () => {
      const plugin = scheduledPlugin([
        { cron: "0 * * * *", command: ["true"] },
      ]);

      expect(plugin.name).toBe("@dreamer/plugins-scheduled");
      expect(plugin.version).toBe("1.0.0");
      const cfg = plugin.config?.scheduledTasks as Record<string, unknown>;
      expect(cfg?.count).toBe(1);
      expect(cfg?.hasLoggerConfig).toBe(false);
    });

    it("非法 tasks 应在创建插件时抛出", () => {
      expect(() => scheduledPlugin([{ cron: "* * * * *", command: [] }]))
        .toThrow("scheduledPlugin:");
    });

    it("tasks 为空时 onStart 不应抛错", () => {
      const plugin = scheduledPlugin([]);
      const container = new ServiceContainer();
      expect(() => plugin.onStart?.(container)).not.toThrow();
    });

    it("有任务时 onStart 应注册 Cron 并记录日志；onStop 应可重复调用（duck logger）", async () => {
      const infos: string[] = [];
      const container = new ServiceContainer();
      /** 非 @dreamer/logger 实例时走兼容分支；注册成功日志为 debug */
      container.registerSingleton("logger", () => ({
        info: () => {},
        debug: (...args: unknown[]) => {
          infos.push(args.map(String).join(" "));
        },
        warn: () => {},
        error: () => {},
      }));

      const plugin = scheduledPlugin([
        { name: "noop", cron: "0 * * * * *", command: ["true"] },
      ]);

      plugin.onStart?.(container);
      expect(infos.some((m) => m.includes("registered 1 cron job(s)"))).toBe(
        true,
      );

      await plugin.onStop?.(container);
      await plugin.onStop?.(container);
    });

    it("容器内为 @dreamer/logger 时应用 child；onStop 应关闭子 Logger", async () => {
      const container = new ServiceContainer();
      const appLog = createLogger({
        level: "debug",
        format: "text",
        output: { console: false },
      });
      container.registerSingleton("logger", () => appLog);

      const lines: string[] = [];
      const plugin = scheduledPlugin(
        [{ name: "noop", cron: "0 * * * * *", command: ["true"] }],
        {
          output: {
            console: false,
            file: { path: "./logs/scheduled-plugin-test.log" },
            custom: (message: string) => {
              lines.push(message);
            },
          },
        },
      );

      plugin.onStart?.(container);
      expect(
        lines.some((m) => m.includes("registered 1 cron job(s)")),
      ).toBe(true);

      await plugin.onStop?.(container);
    });
  });
});
