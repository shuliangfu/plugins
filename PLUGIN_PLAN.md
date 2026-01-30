# @dreamer/plugins 插件规划

> 本文档记录已实现和计划实现的插件列表

---

## ✅ 已实现插件

| 插件 | 功能 | 子路径 | 状态 |
|------|------|--------|------|
| **tailwindcss** | TailwindCSS v4 原子化 CSS | `@dreamer/plugins/tailwindcss` | ✅ 已实现 |
| **unocss** | UnoCSS 原子化 CSS | `@dreamer/plugins/unocss` | ✅ 已实现 |
| **i18n** | 国际化/多语言 | `@dreamer/plugins/i18n` | ✅ 已实现 |
| **seo** | SEO 优化、Meta 标签 | `@dreamer/plugins/seo` | ✅ 已实现 |
| **pwa** | 渐进式 Web 应用 | `@dreamer/plugins/pwa` | ✅ 已实现 |
| **analytics** | Google Analytics 数据分析 | `@dreamer/plugins/analytics` | ✅ 已实现 |
| **theme** | 亮色/暗色主题切换 | `@dreamer/plugins/theme` | ✅ 已实现 |

---

## 📋 计划实现插件

### 第一优先级（高频使用）

| 插件 | 功能 | 说明 | 状态 |
|------|------|------|------|
| **compression** | 响应压缩 | Gzip/Brotli 压缩，减小传输体积 | ⏳ 待实现 |
| **cors** | 跨域支持 | CORS 头处理，跨域请求配置 | ⏳ 待实现 |
| **ratelimit** | 速率限制 | API 限流，防止滥用 | ⏳ 待实现 |
| **security** | 安全头 | CSP、XSS 防护、HSTS 等安全头 | ⏳ 待实现 |
| **auth** | 用户认证 | JWT、OAuth2、Session 认证，登录/注册流程 | ⏳ 待实现 |

### 第二优先级（常用功能）

| 插件 | 功能 | 说明 | 状态 |
|------|------|------|------|
| **sitemap** | 站点地图 | 自动生成 sitemap.xml（从 SEO 独立） | ⏳ 待实现 |
| **robots** | Robots.txt | 自动生成 robots.txt（从 SEO 独立） | ⏳ 待实现 |
| **static** | 静态文件 | 静态文件服务，缓存控制 | ⏳ 待实现 |
| **upload** | 文件上传 | 文件上传处理，大小限制，类型验证 | ⏳ 待实现 |
| **captcha** | 验证码 | 图形验证码、滑动验证、reCAPTCHA | ⏳ 待实现 |

### 第三优先级（增强功能）

| 插件 | 功能 | 说明 | 状态 |
|------|------|------|------|
| **markdown** | Markdown 渲染 | Markdown 解析和渲染，代码高亮 | ⏳ 待实现 |
| **image** | 图片处理 | 图片压缩、格式转换、懒加载 | ⏳ 待实现 |
| **toast** | 消息提示 | 全局 Toast 消息通知（客户端） | ⏳ 待实现 |
| **modal** | 模态框 | 全局模态框管理（客户端） | ⏳ 待实现 |
| **breadcrumb** | 面包屑导航 | 自动生成面包屑 | ⏳ 待实现 |
| **pagination** | 分页 | 分页组件和逻辑 | ⏳ 待实现 |

### 第四优先级（特定场景）

| 插件 | 功能 | 说明 | 状态 |
|------|------|------|------|
| **payment** | 支付集成 | Stripe、PayPal、支付宝、微信支付 | ⏳ 待实现 |
| **social** | 社交分享 | 社交媒体分享按钮、OAuth 登录 | ⏳ 待实现 |
| **notification** | 推送通知 | Web Push、邮件通知 | ⏳ 待实现 |
| **search** | 全文搜索 | Algolia、Elasticsearch 集成 | ⏳ 待实现 |
| **comment** | 评论系统 | 评论、点赞、回复功能 | ⏳ 待实现 |

---

## 🎯 插件设计原则

### 插件结构

每个插件应遵循以下目录结构：

```
src/
└── {plugin-name}/
    ├── mod.ts          # 主模块（服务端）
    ├── client/
    │   └── mod.ts      # 客户端模块（如需要）
    └── types.ts        # 类型定义（如需要）
```

### 插件接口

每个插件必须实现 `@dreamer/plugin` 的 `Plugin` 接口：

```typescript
import type { Plugin } from "@dreamer/plugin";

export interface MyPluginOptions {
  // 插件配置选项
}

export function createMyPlugin(options?: MyPluginOptions): Plugin {
  return {
    name: "my-plugin",
    version: "1.0.0",

    // 可选生命周期钩子
    onInit(container) { /* 初始化 */ },
    onReady(container) { /* 准备就绪 */ },
    onRequest(ctx, container) { /* 请求处理 */ },
    onResponse(ctx, container) { /* 响应处理 */ },
    onError(error, container) { /* 错误处理 */ },
    onDestroy(container) { /* 销毁清理 */ },
  };
}
```

### 命名规范

- 插件目录名：小写字母，单词用连字符分隔（如 `rate-limit`）
- 导出函数名：`create{PluginName}Plugin`（如 `createRateLimitPlugin`）
- 配置接口名：`{PluginName}PluginOptions`（如 `RateLimitPluginOptions`）

---

## 📊 实现进度

| 优先级 | 总数 | 已完成 | 进度 |
|--------|------|--------|------|
| 已实现 | 7 | 7 | 100% |
| 第一优先级 | 5 | 0 | 0% |
| 第二优先级 | 5 | 0 | 0% |
| 第三优先级 | 6 | 0 | 0% |
| 第四优先级 | 5 | 0 | 0% |
| **总计** | **28** | **7** | **25%** |

---

## 更新日志

| 日期 | 插件 | 状态 | 说明 |
|------|------|------|------|
| 2026-01-30 | - | 📝 规划 | 创建插件规划文档 |
