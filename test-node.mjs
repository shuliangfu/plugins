#!/usr/bin/env node
/**
 * Node.js 22+ 测试运行器——主进程内执行（无 fork/IPC）
 *
 * 【Why】node --test 即使单文件仍 fork 子进程，子进程 stdout 作 TAP/IPC 通道，
 *   被 logger.info()/console.log() 非 TAP 字节污染致父进程 structuredClone 反序列化
 *   失败（"Unable to deserialize cloned data"）。不带 --test 标志时 node:test
 *   主进程内自动执行注册用例，无 fork 无 IPC，退出码仍反映结果。
 * 【Invariant】每个测试文件独立 spawnSync 顺序执行，CI=true 全局设置。
 * 【Asm/Perf】无 fork 开销；tsx 即时转译 .ts。
 */
import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

process.env.CI = "true";
const testsRoot = resolve("tests");

function collectTestFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      collectTestFiles(fullPath, acc);
    } else if (entry.endsWith(".test.ts")) {
      acc.push(fullPath);
    }
  }
  return acc;
}

const files = collectTestFiles(testsRoot).sort();
let failed = 0;
for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test-force-exit", file],
    {
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n✗ ${failed}/${files.length} test file(s) failed`);
  process.exit(1);
}
console.log(`\n✓ All ${files.length} test files passed`);
