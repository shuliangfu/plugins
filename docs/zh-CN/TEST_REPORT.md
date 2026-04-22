# @dreamer/plugins 测试报告

**English**: [docs/en-US/TEST_REPORT.md](../en-US/TEST_REPORT.md)

## 测试概览

| 项目         | 说明                           |
| ------------ | ------------------------------ |
| 测试库版本   | @dreamer/test@1.0.0-beta.40    |
| 运行时适配器 | @dreamer/runtime-adapter@1.0.0 |
| 测试框架     | Deno Test                      |
| 测试日期     | 2026-04-22                     |
| 测试环境     | Deno 2.5+，macOS/Linux         |

---

## 测试结果

### 总体统计

| 指标     | 结果 |
| -------- | ---- |
| 总测试数 | 365  |
| 通过     | 365  |
| 失败     | 0    |
| 通过率   | 100% |
| 执行时间 | ~6s  |

### 测试文件统计

| 测试文件                           | `it(...)` 用例数 | 状态        |
| ---------------------------------- | ---------------- | ----------- |
| analytics.test.ts                  | 24               | ✅ 全部通过 |
| auth.test.ts                       | 20               | ✅ 全部通过 |
| compression.test.ts                | 21               | ✅ 全部通过 |
| cors.test.ts                       | 20               | ✅ 全部通过 |
| i18n.test.ts                       | 27               | ✅ 全部通过 |
| mod.test.ts                        | 36               | ✅ 全部通过 |
| pwa.test.ts                        | 18               | ✅ 全部通过 |
| queue.test.ts                      | 6                | ✅ 全部通过 |
| ratelimit.test.ts                  | 22               | ✅ 全部通过 |
| scheduled.test.ts                  | 16               | ✅ 全部通过 |
| security.test.ts                   | 16               | ✅ 全部通过 |
| seo.test.ts                        | 23               | ✅ 全部通过 |
| social.test.ts                     | 23               | ✅ 全部通过 |
| static.test.ts                     | 17               | ✅ 全部通过 |
| tailwindcss-compile.test.ts        | 0                | —           |
| tailwindcss.test.ts                | 14               | ✅ 全部通过 |
| theme.test.ts                      | 24               | ✅ 全部通过 |
| unocss-compile.test.ts             | 0                | —           |
| unocss.test.ts                     | 20               | ✅ 全部通过 |
| **小计（`it` 用例）**              | **347**          |             |
| **整包单次（`deno test tests/`）** | **365**          | ✅ 全部通过 |

整包单次运行 **365** 为权威通过数（`deno test --allow-all tests/`）；除上表
**347** 条 `it` 用例外，另含测试运行器级步骤。

---

## 功能测试详情

### 1. 分析插件 (analytics.test.ts) - 24 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 customEvents 配置
- ✅ 应拒绝无效的 otherServices 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 analyticsConfig 服务
- ✅ 应注册 analyticsService 服务
- ✅ analyticsService 应提供 trackPageview 方法
- ✅ analyticsService 应提供 trackEvent 方法
- ✅ analyticsService 应提供 trackPerformance 方法
- ✅ analyticsService 应提供 trackUserBehavior 方法
- ✅ 调试模式启用时应输出日志
- ✅ 存在 logger 时应输出初始化日志

#### onRequest 钩子

- ✅ disableInDev 为真时在开发环境应跳过
- ✅ 生产环境应记录请求开始时间
- ✅ 禁用性能追踪时不应记录开始时间

#### onResponse 钩子

- ✅ disableInDev 为真时在开发环境应跳过
- ✅ 应跳过非 HTML 响应
- ✅ 应注入 Google Analytics 4 脚本
- ✅ 应注入 Universal Analytics 脚本
- ✅ 应注入 Plausible Analytics 脚本
- ✅ 应注入多个分析服务脚本
- ✅ 未配置分析服务时不应注入脚本

---

### 2. 认证插件 (auth.test.ts) - 20 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的认证类型
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 authConfig 服务
- ✅ 应注册 authService 服务
- ✅ authService 应提供正确的方法
- ✅ hasRole 应正确检查角色
- ✅ hasPermission 应正确检查权限

#### onRequest 钩子 - 公开路径

- ✅ 应跳过公开路径
- ✅ 应跳过不在受保护路径中的路径

#### onRequest 钩子 - JWT 认证

- ✅ 应拒绝无 token 的请求
- ✅ 应拒绝过期的 token
- ✅ 应接受有效的 JWT
- ✅ 应验证 JWT 签发者

#### onRequest 钩子 - Bearer Token 认证

- ✅ 应使用自定义验证函数

#### onRequest 钩子 - Basic 认证

- ✅ 应验证 Basic 认证

#### onRequest 钩子 - 角色权限

- ✅ 应检查角色权限

#### getUser 方法

- ✅ 应从上下文获取用户

---

### 3. 压缩插件 (compression.test.ts) - 21 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的压缩级别
- ✅ 应拒绝无效的阈值
- ✅ 应拒绝无效的编码列表
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 compressionConfig 服务
- ✅ 应注册 compressionService 服务
- ✅ compressionService 应提供 compress 方法
- ✅ logger 与 debug 启用时应输出日志

#### compressionService

- ✅ 应使用 gzip 压缩数据
- ✅ 应使用 deflate 压缩数据

#### onResponse 钩子

- ✅ 应跳过无 Accept-Encoding 的请求
- ✅ 应跳过已压缩的响应
- ✅ 应跳过不支持的 MIME 类型
- ✅ 应跳过小于阈值的响应
- ✅ 应使用 gzip 压缩响应
- ✅ 应使用 deflate 压缩响应
- ✅ 应添加 Vary 头
- ✅ 应更新 Content-Length

---

### 4. CORS 插件 (cors.test.ts) - 20 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 methods 配置
- ✅ 应拒绝无效的 maxAge 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 corsConfig 服务
- ✅ logger 与 debug 启用时应输出日志

#### onRequest 钩子（预检）

- ✅ 应处理 OPTIONS 预检请求
- ✅ 预检响应应返回允许的头部
- ✅ 启用时应设置 credentials 头
- ✅ 应设置预检缓存时间

#### onResponse 钩子

- ✅ 应对允许的源添加 CORS 头
- ✅ 应对该源返回具体 origin 而非 *
- ✅ 不应为不允许的源添加 CORS 头
- ✅ 应使用函数判断是否允许源
- ✅ 启用时应设置 credentials 头
- ✅ 应暴露指定的响应头
- ✅ 应添加 Vary: Origin 头
- ✅ 应跳过无 Origin 的请求

---

### 5. 国际化插件 (i18n.test.ts) - 27 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 locales 配置
- ✅ 应拒绝无效的 detectMethods 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 i18nConfig 服务
- ✅ 应注册 i18nService 服务
- ✅ i18nService 应提供 t 函数
- ✅ i18nService 应提供 getLocale 和 setLocale
- ✅ i18nService 应忽略不支持的语言
- ✅ 存在 logger 时应输出日志

#### onRequest 钩子 - 语言检测

- ✅ 应从 Accept-Language 头检测语言
- ✅ 应从 Cookie 检测语言
- ✅ 应从 Query 参数检测语言
- ✅ 应从路径检测语言
- ✅ 未检测到时应使用默认语言
- ✅ 禁用检测时应跳过

#### onResponse 钩子

- ✅ 应设置响应头
- ✅ 应在 HTML 中注入 lang 属性
- ✅ 应更新已存在的 lang 属性

#### 全局 $t 方法

- ✅ 应注册全局 $t 函数
- ✅ 应注册全局 $i18n 实例
- ✅ $t 应返回未翻译的 key
- ✅ $t 应支持加载翻译并翻译
- ✅ $t 应支持嵌套 key
- ✅ 切换语言后应使用正确翻译

---

### 6. 模块导出测试 (mod.test.ts) - 36 项测试

#### 插件函数导出

- ✅ 应导出 tailwindPlugin 函数
- ✅ 应导出 unocssPlugin 函数
- ✅ 应导出 i18nPlugin 函数
- ✅ 应导出 seoPlugin 函数
- ✅ 应导出 pwaPlugin 函数
- ✅ 应导出 analyticsPlugin 函数
- ✅ 应导出 themePlugin 函数

#### 插件实例化

- ✅ tailwindPlugin 应返回有效插件对象
- ✅ unocssPlugin 应返回有效插件对象
- ✅ i18nPlugin 应返回有效插件对象
- ✅ seoPlugin 应返回有效插件对象
- ✅ pwaPlugin 应返回有效插件对象
- ✅ analyticsPlugin 应返回有效插件对象
- ✅ themePlugin 应返回有效插件对象

#### 插件接口

- ✅ 所有插件应有 validateConfig 方法
- ✅ 所有插件应有 onInit 钩子
- ✅ CSS 插件应有 onRequest 和 onResponse 钩子
- ✅ i18n 插件应有 onRequest 和 onResponse 钩子
- ✅ SEO 插件应有 onResponse 和 onBuildComplete 钩子
- ✅ PWA 插件应有 onResponse 钩子
- ✅ 分析插件应有 onRequest 和 onResponse 钩子
- ✅ 主题插件应有 onRequest 和 onResponse 钩子

#### 类型导出验证

- ✅ TailwindPluginOptions 类型应可用
- ✅ UnoCSSPluginOptions 类型应可用
- ✅ I18nPluginOptions 类型应可用
- ✅ SEOPluginOptions 类型应可用
- ✅ PWAPluginOptions 类型应可用
- ✅ AnalyticsPluginOptions 类型应可用
- ✅ ThemePluginOptions 类型应可用

#### 子模块导出

- ✅ 应从 tailwindcss 子模块导入
- ✅ 应从 unocss 子模块导入
- ✅ 应从 i18n 子模块导入
- ✅ 应从 seo 子模块导入
- ✅ 应从 pwa 子模块导入
- ✅ 应从 analytics 子模块导入
- ✅ 应从 theme 子模块导入

---

### 7. PWA 插件 (pwa.test.ts) - 18 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 icons 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 pwaConfig 服务
- ✅ 应注册 pwaService 服务
- ✅ pwaService 应提供 generateManifest 方法
- ✅ 存在 logger 时应输出日志
- ✅ 应输出 Service Worker 信息
- ✅ 应输出推送通知信息

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 应注入 manifest 链接
- ✅ 应注入 theme-color meta 标签
- ✅ 应注入移动端 meta 标签
- ✅ 应注入 Apple Touch Icon
- ✅ 应注入 Service Worker 注册脚本
- ✅ 禁用离线时应不注入 Service Worker 脚本

---

### 8. 速率限制插件 (ratelimit.test.ts) - 22 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 max 配置
- ✅ 应拒绝无效的 windowMs 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 rateLimitConfig 服务
- ✅ 应注册 rateLimitService 服务
- ✅ rateLimitService 应提供正确的方法
- ✅ logger 与 debug 启用时应输出日志

#### rateLimitService

- ✅ 应正确判断是否超出限制
- ✅ 应返回正确的重置时间

#### onRequest 钩子

- ✅ 应在限制内放行请求
- ✅ 应拦截超出限制的请求
- ✅ 应返回正确的速率限制响应
- ✅ 速率限制响应应包含正确的头
- ✅ 应跳过字符串配置的路径
- ✅ 应跳过正则配置的路径
- ✅ 应使用自定义标识生成器

#### onResponse 钩子

- ✅ 应向响应添加速率限制头
- ✅ skipSuccessfulRequests 时应减少计数
- ✅ skipFailedRequests 时应减少计数

---

### 9. 安全头插件 (security.test.ts) - 16 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 frameOptions 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 securityConfig 服务
- ✅ logger 与 debug 启用时应输出日志

#### onResponse 钩子

- ✅ 应添加默认安全头
- ✅ 应添加 HSTS 头
- ✅ 应添加带 preload 的 HSTS 头
- ✅ 应添加 CSP 头
- ✅ 应添加完整 CSP 指令
- ✅ 应添加 Permissions-Policy 头
- ✅ 应添加其他安全头
- ✅ 应能禁用指定安全头
- ✅ 应跳过无响应的请求

---

### 10. SEO 插件 (seo.test.ts) - 23 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 keywords 配置
- ✅ 应拒绝无效的 robotsRules 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 seoConfig 服务
- ✅ 应注册 seoService 服务
- ✅ seoService 应提供 generateMetaTags 方法
- ✅ seoService 应提供 generateSitemap 方法
- ✅ seoService 应提供 generateRobots 方法
- ✅ 存在 logger 时应输出日志

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 应注入 title 标签
- ✅ 应注入 description meta 标签
- ✅ 应注入 keywords meta 标签
- ✅ 应注入 canonical 链接
- ✅ 应注入 favicon 链接
- ✅ 应注入 Open Graph 标签
- ✅ 应注入 Twitter Card 标签
- ✅ 应注入结构化数据

#### onBuildComplete 钩子

- ✅ 启用时应生成 Sitemap
- ✅ 启用时应生成 Robots.txt

---

### 11. 社交分享插件 (social.test.ts) - 23 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件
- ✅ 应支持 OAuth 配置

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 socialConfig 服务
- ✅ 应注册 socialService 服务
- ✅ socialService 应提供 getShareUrl 方法
- ✅ socialService 应提供 getOAuthUrl 方法
- ✅ socialService 应提供 getEnabledPlatforms 方法

#### socialService - 分享链接

- ✅ 应生成 Twitter 分享链接
- ✅ 应生成 Facebook 分享链接
- ✅ 应生成微博分享链接
- ✅ 应生成 LinkedIn 分享链接
- ✅ 应生成微信分享链接
- ✅ 应生成所有平台的分享链接

#### socialService - OAuth

- ✅ 应生成 GitHub OAuth 链接
- ✅ 应生成 Google OAuth 链接
- ✅ OAuth 提供商未配置时应返回 null
- ✅ 应返回可用 OAuth 提供商列表

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 应对 HTML 响应注入分享脚本
- ✅ injectShareButtons 为 false 时应跳过注入

---

### 12. 静态文件插件 (static.test.ts) - 17 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 index 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 staticConfig 服务
- ✅ 应注册 staticService 服务
- ✅ staticService 应提供 getMimeType 方法
- ✅ staticService 应提供 computeEtag 方法

#### onRequest 钩子

- ✅ 应跳过不匹配前缀的请求
- ✅ 应拒绝目录遍历攻击
- ✅ 应拒绝隐藏文件访问（默认）
- ✅ 应仅处理 GET 和 HEAD 请求

#### MIME 类型检测

- ✅ 应正确检测常见 MIME 类型
- ✅ 应支持自定义 MIME 类型

#### ETag 支持

- ✅ 应生成一致的 ETag
- ✅ 不同内容应生成不同 ETag

---

### 13. TailwindCSS 插件 (tailwindcss.test.ts) - 14 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 content 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 tailwindConfig 服务
- ✅ 应注册 tailwindCompiler 服务
- ✅ 存在 logger 时应输出日志

#### onRequest 钩子

- ✅ 开发模式下应编译 CSS

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 生产模式下应注入 link 标签

#### TailwindCompiler

- ✅ 应创建编译器实例
- ✅ 文件不存在时应返回空 CSS
- ✅ 应清除缓存

---

### 14. 主题插件 (theme.test.ts) - 24 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 defaultMode
- ✅ 应拒绝无效的 strategy
- ✅ 应拒绝无效的 transitionDuration
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 themeConfig 服务
- ✅ 应注册 themeService 服务
- ✅ themeService 应提供 getCurrentTheme 方法
- ✅ themeService 应提供 getCurrentMode 方法
- ✅ themeService 应提供 setTheme 方法
- ✅ themeService 应提供 setMode 方法

#### onRequest 钩子

- ✅ 应从 Cookie 读取主题
- ✅ 应处理系统模式
- ✅ 无 Cookie 时应使用默认模式

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 应注入防闪烁脚本
- ✅ class 策略应添加 dark 类
- ✅ attribute 策略应添加属性
- ✅ 禁用时不注入脚本

#### 配置选项

- ✅ 应支持自定义 cookieName
- ✅ 应支持自定义 cookieExpireDays
- ✅ 应支持自定义 transitionDuration

---

### 15. UnoCSS 插件 (unocss.test.ts) - 17 项测试

#### 插件创建

- ✅ 应使用默认配置创建插件
- ✅ 应使用自定义配置创建插件

#### 配置验证

- ✅ 应验证有效配置
- ✅ 应拒绝无效的 content 配置
- ✅ 应拒绝无效的 presets 配置
- ✅ 应接受空配置

#### onInit 钩子

- ✅ 应注册 unocssConfig 服务
- ✅ 应注册 unocssCompiler 服务
- ✅ 存在 logger 时应输出日志
- ✅ 应输出 preset 信息

#### onRequest 钩子

- ✅ 开发模式下应编译 CSS

#### onResponse 钩子

- ✅ 应跳过非 HTML 响应
- ✅ 生产模式下应注入 link 标签

#### UnoCompiler

- ✅ 应创建编译器实例
- ✅ 文件不存在时仍应生成 preflights
- ✅ 应清除缓存
- ✅ 开发模式下应返回 needsRebuild 标志

---

## 测试覆盖率分析

### API 方法覆盖率

| 插件        | 公开 API                                                       | 覆盖率 |
| ----------- | -------------------------------------------------------------- | ------ |
| Analytics   | trackPageview, trackEvent, trackPerformance, trackUserBehavior | 100%   |
| Auth        | hasRole, hasPermission, getUser                                | 100%   |
| Compression | compress                                                       | 100%   |
| CORS        | corsConfig                                                     | 100%   |
| i18n        | t, getLocale, setLocale                                        | 100%   |
| PWA         | generateManifest                                               | 100%   |
| RateLimit   | isLimited, getReset                                            | 100%   |
| Security    | securityConfig                                                 | 100%   |
| SEO         | generateMetaTags, generateSitemap, generateRobots              | 100%   |
| Social      | getShareUrl, getOAuthUrl, getEnabledPlatforms                  | 100%   |
| Static      | getMimeType, computeEtag                                       | 100%   |
| TailwindCSS | compile, clearCache                                            | 100%   |
| Theme       | getCurrentTheme, getCurrentMode, setTheme, setMode             | 100%   |
| UnoCSS      | compile, clearCache, getLastResult                             | 100%   |

### 边界情况覆盖

- ✅ 空配置处理
- ✅ 无效配置拒绝
- ✅ 非 HTML 响应跳过
- ✅ 缺失必需头处理
- ✅ 文件未找到处理
- ✅ 目录遍历攻击防护

### 错误处理覆盖

- ✅ 配置验证错误
- ✅ 认证失败处理
- ✅ 超出速率限制处理
- ✅ 文件访问错误处理

---

## 结论

@dreamer/plugins 测试套件包含 **322 个单元测试**，全部通过，覆盖全部 15
个插件的核心功能：

1. **CSS 框架插件**：TailwindCSS v4、UnoCSS
2. **国际化插件**：i18n
3. **SEO 相关插件**：SEO、PWA
4. **安全相关插件**：Auth、CORS、安全头、速率限制
5. **功能插件**：压缩、静态文件、主题、分析、社交分享

所有插件均通过配置验证、生命周期钩子、服务注册及边界情况测试。
