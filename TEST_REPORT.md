# @dreamer/plugins 测试报告

## 测试概览

| 项目 | 信息 |
|------|------|
| 测试库版本 | @dreamer/test@1.0.0-beta.40 |
| 运行时适配器 | @dreamer/runtime-adapter@1.0.0 |
| 测试框架 | Deno Test |
| 测试时间 | 2026-02-01 |
| 测试环境 | Deno 2.5+, macOS/Linux |

---

## 测试结果

### 总体统计

| 指标 | 结果 |
|------|------|
| 总测试数 | 322 |
| 通过 | 322 |
| 失败 | 0 |
| 通过率 | 100% |
| 执行时间 | ~2s |

### 测试文件统计

| 测试文件 | 测试数 | 状态 |
|----------|--------|------|
| analytics.test.ts | 24 | ✅ 全部通过 |
| auth.test.ts | 20 | ✅ 全部通过 |
| compression.test.ts | 21 | ✅ 全部通过 |
| cors.test.ts | 20 | ✅ 全部通过 |
| i18n.test.ts | 27 | ✅ 全部通过 |
| mod.test.ts | 36 | ✅ 全部通过 |
| pwa.test.ts | 18 | ✅ 全部通过 |
| ratelimit.test.ts | 22 | ✅ 全部通过 |
| security.test.ts | 16 | ✅ 全部通过 |
| seo.test.ts | 23 | ✅ 全部通过 |
| social.test.ts | 23 | ✅ 全部通过 |
| static.test.ts | 17 | ✅ 全部通过 |
| tailwindcss.test.ts | 14 | ✅ 全部通过 |
| theme.test.ts | 24 | ✅ 全部通过 |
| unocss.test.ts | 17 | ✅ 全部通过 |

---

## 功能测试详情

### 1. Analytics 分析统计插件 (analytics.test.ts) - 24 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 customEvents 配置
- ✅ 应该拒绝无效的 otherServices 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 analyticsConfig 服务
- ✅ 应该注册 analyticsService 服务
- ✅ analyticsService 应该提供 trackPageview 方法
- ✅ analyticsService 应该提供 trackEvent 方法
- ✅ analyticsService 应该提供 trackPerformance 方法
- ✅ analyticsService 应该提供 trackUserBehavior 方法
- ✅ 开启 debug 模式时应该输出日志
- ✅ 应该在有 logger 时输出初始化日志

#### onRequest 钩子
- ✅ 应该在开发环境且 disableInDev 时跳过
- ✅ 应该在生产环境记录请求开始时间
- ✅ 禁用性能追踪时不应该记录开始时间

#### onResponse 钩子
- ✅ 应该在开发环境且 disableInDev 时跳过
- ✅ 应该跳过非 HTML 响应
- ✅ 应该注入 Google Analytics 4 脚本
- ✅ 应该注入 Universal Analytics 脚本
- ✅ 应该注入 Plausible Analytics 脚本
- ✅ 应该同时注入多个分析服务脚本
- ✅ 没有配置分析服务时不应该注入脚本

---

### 2. 认证插件 (auth.test.ts) - 20 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的认证类型
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 authConfig 服务
- ✅ 应该注册 authService 服务
- ✅ authService 应该提供正确的方法
- ✅ hasRole 应该正确检查角色
- ✅ hasPermission 应该正确检查权限

#### onRequest 钩子 - 公开路径
- ✅ 应该跳过公开路径
- ✅ 应该跳过不在保护路径中的路径

#### onRequest 钩子 - JWT 认证
- ✅ 应该拒绝没有 token 的请求
- ✅ 应该拒绝过期的 token
- ✅ 应该接受有效的 JWT
- ✅ 应该验证 JWT 签发者

#### onRequest 钩子 - Bearer Token 认证
- ✅ 应该使用自定义验证函数

#### onRequest 钩子 - Basic 认证
- ✅ 应该验证基础认证

#### onRequest 钩子 - 角色权限
- ✅ 应该检查角色权限

#### getUser 方法
- ✅ 应该从上下文获取用户

---

### 3. 压缩插件 (compression.test.ts) - 21 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的压缩级别
- ✅ 应该拒绝无效的阈值
- ✅ 应该拒绝无效的编码列表
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 compressionConfig 服务
- ✅ 应该注册 compressionService 服务
- ✅ compressionService 应该提供 compress 方法
- ✅ 应该在有 logger 且开启 debug 时输出日志

#### compressionService
- ✅ 应该能使用 gzip 压缩数据
- ✅ 应该能使用 deflate 压缩数据

#### onResponse 钩子
- ✅ 应该跳过没有 Accept-Encoding 的请求
- ✅ 应该跳过已压缩的响应
- ✅ 应该跳过不支持压缩的 MIME 类型
- ✅ 应该跳过小于阈值的响应
- ✅ 应该使用 gzip 压缩响应
- ✅ 应该使用 deflate 压缩响应
- ✅ 应该添加 Vary 头
- ✅ 应该更新 Content-Length

---

### 4. CORS 插件 (cors.test.ts) - 20 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 methods 配置
- ✅ 应该拒绝无效的 maxAge 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 corsConfig 服务
- ✅ 应该在有 logger 且开启 debug 时输出日志

#### onRequest 钩子（预检请求）
- ✅ 应该处理 OPTIONS 预检请求
- ✅ 应该在预检请求中返回允许的头部
- ✅ 应该在允许凭证时设置相应头
- ✅ 应该设置预检缓存时间

#### onResponse 钩子
- ✅ 应该为允许的源添加 CORS 头
- ✅ 应该为特定源返回该源而不是 *
- ✅ 应该不为不允许的源添加 CORS 头
- ✅ 应该使用函数判断源是否允许
- ✅ 应该在允许凭证时设置相应头
- ✅ 应该暴露指定的响应头
- ✅ 应该添加 Vary: Origin 头
- ✅ 应该跳过没有 Origin 的请求

---

### 5. i18n 国际化插件 (i18n.test.ts) - 27 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 locales 配置
- ✅ 应该拒绝无效的 detectMethods 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 i18nConfig 服务
- ✅ 应该注册 i18nService 服务
- ✅ i18nService 应该提供 t 函数
- ✅ i18nService 应该提供 getLocale 和 setLocale
- ✅ i18nService 应该忽略不支持的语言
- ✅ 应该在有 logger 时输出日志

#### onRequest 钩子 - 语言检测
- ✅ 应该从 Accept-Language 头检测语言
- ✅ 应该从 Cookie 检测语言
- ✅ 应该从 Query 参数检测语言
- ✅ 应该从路径检测语言
- ✅ 未检测到时应该使用默认语言
- ✅ 禁用语言检测时应该跳过

#### onResponse 钩子
- ✅ 应该设置响应头
- ✅ 应该在 HTML 中注入 lang 属性
- ✅ 应该更新已存在的 lang 属性

#### 全局 $t 方法
- ✅ 应该注册全局 $t 函数
- ✅ 应该注册全局 $i18n 实例
- ✅ $t 应该返回未翻译的 key
- ✅ $t 应该支持加载翻译并翻译
- ✅ $t 应该支持嵌套键
- ✅ 切换语言后应该使用正确的翻译

---

### 6. 模块导出测试 (mod.test.ts) - 36 个测试

#### 插件函数导出
- ✅ 应该导出 tailwindPlugin 函数
- ✅ 应该导出 unocssPlugin 函数
- ✅ 应该导出 i18nPlugin 函数
- ✅ 应该导出 seoPlugin 函数
- ✅ 应该导出 pwaPlugin 函数
- ✅ 应该导出 analyticsPlugin 函数
- ✅ 应该导出 themePlugin 函数

#### 插件实例化
- ✅ tailwindPlugin 应该返回有效的插件对象
- ✅ unocssPlugin 应该返回有效的插件对象
- ✅ i18nPlugin 应该返回有效的插件对象
- ✅ seoPlugin 应该返回有效的插件对象
- ✅ pwaPlugin 应该返回有效的插件对象
- ✅ analyticsPlugin 应该返回有效的插件对象
- ✅ themePlugin 应该返回有效的插件对象

#### 插件接口
- ✅ 所有插件应该有 validateConfig 方法
- ✅ 所有插件应该有 onInit 钩子
- ✅ CSS 插件应该有 onRequest 和 onResponse 钩子
- ✅ i18n 插件应该有 onRequest 和 onResponse 钩子
- ✅ SEO 插件应该有 onResponse 和 onBuildComplete 钩子
- ✅ PWA 插件应该有 onResponse 钩子
- ✅ Analytics 插件应该有 onRequest 和 onResponse 钩子
- ✅ Theme 插件应该有 onRequest 和 onResponse 钩子

#### 类型导出验证
- ✅ TailwindPluginOptions 类型应该可用
- ✅ UnoCSSPluginOptions 类型应该可用
- ✅ I18nPluginOptions 类型应该可用
- ✅ SEOPluginOptions 类型应该可用
- ✅ PWAPluginOptions 类型应该可用
- ✅ AnalyticsPluginOptions 类型应该可用
- ✅ ThemePluginOptions 类型应该可用

#### 子模块导出
- ✅ 应该能从 tailwindcss 子模块导入
- ✅ 应该能从 unocss 子模块导入
- ✅ 应该能从 i18n 子模块导入
- ✅ 应该能从 seo 子模块导入
- ✅ 应该能从 pwa 子模块导入
- ✅ 应该能从 analytics 子模块导入
- ✅ 应该能从 theme 子模块导入

---

### 7. PWA 插件 (pwa.test.ts) - 18 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 icons 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 pwaConfig 服务
- ✅ 应该注册 pwaService 服务
- ✅ pwaService 应该提供 generateManifest 方法
- ✅ 应该在有 logger 时输出日志
- ✅ 应该输出 Service Worker 信息
- ✅ 应该输出推送通知信息

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该注入 manifest 链接
- ✅ 应该注入 theme-color meta 标签
- ✅ 应该注入移动端 meta 标签
- ✅ 应该注入 Apple Touch Icon
- ✅ 应该注入 Service Worker 注册脚本
- ✅ 禁用离线支持时不应该注入 Service Worker 脚本

---

### 8. 速率限制插件 (ratelimit.test.ts) - 22 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 max 配置
- ✅ 应该拒绝无效的 windowMs 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 rateLimitConfig 服务
- ✅ 应该注册 rateLimitService 服务
- ✅ rateLimitService 应该提供正确的方法
- ✅ 应该在有 logger 且开启 debug 时输出日志

#### rateLimitService
- ✅ 应该正确检查是否超出限制
- ✅ 应该返回正确的重置时间

#### onRequest 钩子
- ✅ 应该允许在限制内的请求
- ✅ 应该阻止超出限制的请求
- ✅ 应该返回正确的限流响应
- ✅ 应该在限流响应中包含正确的头部
- ✅ 应该跳过字符串配置的路径
- ✅ 应该跳过正则配置的路径
- ✅ 应该使用自定义的标识符生成器

#### onResponse 钩子
- ✅ 应该在响应中添加限流头
- ✅ 应该在 skipSuccessfulRequests 时减少计数
- ✅ 应该在 skipFailedRequests 时减少计数

---

### 9. 安全头插件 (security.test.ts) - 16 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 frameOptions 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 securityConfig 服务
- ✅ 应该在有 logger 且开启 debug 时输出日志

#### onResponse 钩子
- ✅ 应该添加默认安全头
- ✅ 应该添加 HSTS 头
- ✅ 应该添加带 preload 的 HSTS 头
- ✅ 应该添加 CSP 头
- ✅ 应该添加完整的 CSP 指令
- ✅ 应该添加 Permissions-Policy 头
- ✅ 应该添加其他安全头
- ✅ 应该能禁用特定安全头
- ✅ 应该跳过没有响应的请求

---

### 10. SEO 优化插件 (seo.test.ts) - 23 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 keywords 配置
- ✅ 应该拒绝无效的 robotsRules 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 seoConfig 服务
- ✅ 应该注册 seoService 服务
- ✅ seoService 应该提供 generateMetaTags 方法
- ✅ seoService 应该提供 generateSitemap 方法
- ✅ seoService 应该提供 generateRobots 方法
- ✅ 应该在有 logger 时输出日志

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该注入 title 标签
- ✅ 应该注入 description meta 标签
- ✅ 应该注入 keywords meta 标签
- ✅ 应该注入 canonical 链接
- ✅ 应该注入 favicon 链接
- ✅ 应该注入 Open Graph 标签
- ✅ 应该注入 Twitter Card 标签
- ✅ 应该注入结构化数据

#### onBuildComplete 钩子
- ✅ 应该在启用时生成 Sitemap
- ✅ 应该在启用时生成 Robots.txt

---

### 11. 社交分享插件 (social.test.ts) - 23 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件
- ✅ 应该支持 OAuth 配置

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 socialConfig 服务
- ✅ 应该注册 socialService 服务
- ✅ socialService 应该提供 getShareUrl 方法
- ✅ socialService 应该提供 getOAuthUrl 方法
- ✅ socialService 应该提供 getEnabledPlatforms 方法

#### socialService - 分享链接
- ✅ 应该生成 Twitter 分享链接
- ✅ 应该生成 Facebook 分享链接
- ✅ 应该生成微博分享链接
- ✅ 应该生成 LinkedIn 分享链接
- ✅ 应该生成微信分享链接
- ✅ 应该生成所有平台的分享链接

#### socialService - OAuth
- ✅ 应该生成 GitHub OAuth 链接
- ✅ 应该生成 Google OAuth 链接
- ✅ 应该返回 null 当 OAuth 提供商未配置时
- ✅ 应该返回可用的 OAuth 提供商列表

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该为 HTML 响应注入分享脚本
- ✅ 应该跳过注入当 injectShareButtons 为 false

---

### 12. 静态文件插件 (static.test.ts) - 17 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 index 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 staticConfig 服务
- ✅ 应该注册 staticService 服务
- ✅ staticService 应该提供 getMimeType 方法
- ✅ staticService 应该提供 computeEtag 方法

#### onRequest 钩子
- ✅ 应该跳过不匹配前缀的请求
- ✅ 应该拒绝目录遍历攻击
- ✅ 应该拒绝隐藏文件访问（默认）
- ✅ 应该只处理 GET 和 HEAD 请求

#### MIME 类型检测
- ✅ 应该正确检测常见 MIME 类型
- ✅ 应该支持自定义 MIME 类型

#### ETag 支持
- ✅ 应该生成一致的 ETag
- ✅ 不同内容应该生成不同的 ETag

---

### 13. TailwindCSS 插件 (tailwindcss.test.ts) - 14 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 content 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 tailwindConfig 服务
- ✅ 应该注册 tailwindCompiler 服务
- ✅ 应该在有 logger 时输出日志

#### onRequest 钩子
- ✅ 应该在开发模式下编译 CSS

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该在生产模式下注入 link 标签

#### TailwindCompiler
- ✅ 应该创建编译器实例
- ✅ 应该在文件不存在时返回空 CSS
- ✅ 应该清除缓存

---

### 14. 主题插件 (theme.test.ts) - 24 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 defaultMode
- ✅ 应该拒绝无效的 strategy
- ✅ 应该拒绝无效的 transitionDuration
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 themeConfig 服务
- ✅ 应该注册 themeService 服务
- ✅ themeService 应该提供 getCurrentTheme 方法
- ✅ themeService 应该提供 getCurrentMode 方法
- ✅ themeService 应该提供 setTheme 方法
- ✅ themeService 应该提供 setMode 方法

#### onRequest 钩子
- ✅ 应该从 Cookie 读取主题
- ✅ 应该处理 system 模式
- ✅ 无 Cookie 时应该使用默认模式

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该注入防闪烁脚本
- ✅ 应该为 class 策略添加 dark class
- ✅ 应该为 attribute 策略添加属性
- ✅ 禁用脚本注入时不应该注入脚本

#### 配置选项
- ✅ 应该支持自定义 cookieName
- ✅ 应该支持自定义 cookieExpireDays
- ✅ 应该支持自定义 transitionDuration

---

### 15. UnoCSS 插件 (unocss.test.ts) - 17 个测试

#### 插件创建
- ✅ 应该使用默认配置创建插件
- ✅ 应该使用自定义配置创建插件

#### 配置验证
- ✅ 应该验证有效配置
- ✅ 应该拒绝无效的 content 配置
- ✅ 应该拒绝无效的 presets 配置
- ✅ 应该接受空配置

#### onInit 钩子
- ✅ 应该注册 unocssConfig 服务
- ✅ 应该注册 unocssCompiler 服务
- ✅ 应该在有 logger 时输出日志
- ✅ 应该输出预设信息

#### onRequest 钩子
- ✅ 应该在开发模式下编译 CSS

#### onResponse 钩子
- ✅ 应该跳过非 HTML 响应
- ✅ 应该在生产模式下注入 link 标签

#### UnoCompiler
- ✅ 应该创建编译器实例
- ✅ 应该在文件不存在时仍生成 preflights
- ✅ 应该清除缓存
- ✅ 应该在开发模式下返回 needsRebuild 标志

---

## 测试覆盖分析

### 接口方法覆盖

| 插件 | 公共 API | 覆盖率 |
|------|----------|--------|
| Analytics | trackPageview, trackEvent, trackPerformance, trackUserBehavior | 100% |
| Auth | hasRole, hasPermission, getUser | 100% |
| Compression | compress | 100% |
| CORS | corsConfig | 100% |
| i18n | t, getLocale, setLocale | 100% |
| PWA | generateManifest | 100% |
| RateLimit | isLimited, getReset | 100% |
| Security | securityConfig | 100% |
| SEO | generateMetaTags, generateSitemap, generateRobots | 100% |
| Social | getShareUrl, getOAuthUrl, getEnabledPlatforms | 100% |
| Static | getMimeType, computeEtag | 100% |
| TailwindCSS | compile, clearCache | 100% |
| Theme | getCurrentTheme, getCurrentMode, setTheme, setMode | 100% |
| UnoCSS | compile, clearCache, getLastResult | 100% |

### 边界情况覆盖

- ✅ 空配置处理
- ✅ 无效配置拒绝
- ✅ 非 HTML 响应跳过
- ✅ 缺少必要头部处理
- ✅ 文件不存在处理
- ✅ 目录遍历攻击防护

### 错误处理覆盖

- ✅ 配置验证错误
- ✅ 认证失败处理
- ✅ 速率限制超出处理
- ✅ 文件访问错误处理

---

## 结论

@dreamer/plugins 测试套件包含 **322 个单元测试**，全部通过，覆盖了所有 15 个插件的核心功能：

1. **CSS 框架插件**：TailwindCSS v4、UnoCSS
2. **国际化插件**：i18n
3. **SEO 优化插件**：SEO、PWA
4. **安全插件**：认证、CORS、安全头、速率限制
5. **功能增强插件**：压缩、静态文件、主题、分析统计、社交分享

所有插件均通过了配置验证、生命周期钩子、服务注册和边界情况的测试。
