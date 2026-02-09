# @dreamer/plugins Test Report

## Test Overview

| Item                 | Info                           |
| -------------------- | ------------------------------ |
| Test library version | @dreamer/test@1.0.0-beta.40    |
| Runtime adapter      | @dreamer/runtime-adapter@1.0.0 |
| Test framework       | Deno Test                      |
| Test date            | 2026-02-01                     |
| Test environment     | Deno 2.5+, macOS/Linux         |

---

## Test Results

### Overall Statistics

| Metric         | Result |
| -------------- | ------ |
| Total tests    | 322    |
| Passed         | 322    |
| Failed         | 0      |
| Pass rate      | 100%   |
| Execution time | ~2s    |

### Test File Statistics

| Test file           | Count | Status        |
| ------------------- | ----- | ------------- |
| analytics.test.ts   | 24    | ✅ All passed |
| auth.test.ts        | 20    | ✅ All passed |
| compression.test.ts | 21    | ✅ All passed |
| cors.test.ts        | 20    | ✅ All passed |
| i18n.test.ts        | 27    | ✅ All passed |
| mod.test.ts         | 36    | ✅ All passed |
| pwa.test.ts         | 18    | ✅ All passed |
| ratelimit.test.ts   | 22    | ✅ All passed |
| security.test.ts    | 16    | ✅ All passed |
| seo.test.ts         | 23    | ✅ All passed |
| social.test.ts      | 23    | ✅ All passed |
| static.test.ts      | 17    | ✅ All passed |
| tailwindcss.test.ts | 14    | ✅ All passed |
| theme.test.ts       | 24    | ✅ All passed |
| unocss.test.ts      | 17    | ✅ All passed |

---

## Feature Test Details

### 1. Analytics Plugin (analytics.test.ts) - 24 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid customEvents config
- ✅ Should reject invalid otherServices config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register analyticsConfig service
- ✅ Should register analyticsService service
- ✅ analyticsService should provide trackPageview method
- ✅ analyticsService should provide trackEvent method
- ✅ analyticsService should provide trackPerformance method
- ✅ analyticsService should provide trackUserBehavior method
- ✅ Should output logs when debug mode is enabled
- ✅ Should output init logs when logger is present

#### onRequest hook

- ✅ Should skip in dev when disableInDev is set
- ✅ Should record request start time in production
- ✅ Should not record start time when performance tracking is disabled

#### onResponse hook

- ✅ Should skip in dev when disableInDev is set
- ✅ Should skip non-HTML responses
- ✅ Should inject Google Analytics 4 script
- ✅ Should inject Universal Analytics script
- ✅ Should inject Plausible Analytics script
- ✅ Should inject multiple analytics service scripts
- ✅ Should not inject scripts when no analytics service configured

---

### 2. Auth Plugin (auth.test.ts) - 20 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid auth type
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register authConfig service
- ✅ Should register authService service
- ✅ authService should provide correct methods
- ✅ hasRole should check roles correctly
- ✅ hasPermission should check permissions correctly

#### onRequest hook - Public paths

- ✅ Should skip public paths
- ✅ Should skip paths not in protected paths

#### onRequest hook - JWT auth

- ✅ Should reject requests without token
- ✅ Should reject expired token
- ✅ Should accept valid JWT
- ✅ Should validate JWT issuer

#### onRequest hook - Bearer Token auth

- ✅ Should use custom validation function

#### onRequest hook - Basic auth

- ✅ Should validate basic auth

#### onRequest hook - Role permissions

- ✅ Should check role permissions

#### getUser method

- ✅ Should get user from context

---

### 3. Compression Plugin (compression.test.ts) - 21 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid compression level
- ✅ Should reject invalid threshold
- ✅ Should reject invalid encoding list
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register compressionConfig service
- ✅ Should register compressionService service
- ✅ compressionService should provide compress method
- ✅ Should output logs when logger and debug are enabled

#### compressionService

- ✅ Should compress data with gzip
- ✅ Should compress data with deflate

#### onResponse hook

- ✅ Should skip requests without Accept-Encoding
- ✅ Should skip already compressed responses
- ✅ Should skip unsupported MIME types
- ✅ Should skip responses smaller than threshold
- ✅ Should compress response with gzip
- ✅ Should compress response with deflate
- ✅ Should add Vary header
- ✅ Should update Content-Length

---

### 4. CORS Plugin (cors.test.ts) - 20 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid methods config
- ✅ Should reject invalid maxAge config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register corsConfig service
- ✅ Should output logs when logger and debug are enabled

#### onRequest hook (preflight)

- ✅ Should handle OPTIONS preflight request
- ✅ Should return allowed headers in preflight
- ✅ Should set credentials header when enabled
- ✅ Should set preflight cache time

#### onResponse hook

- ✅ Should add CORS headers for allowed origins
- ✅ Should return specific origin instead of * for that origin
- ✅ Should not add CORS headers for disallowed origins
- ✅ Should use function to determine origin allowance
- ✅ Should set credentials header when enabled
- ✅ Should expose specified response headers
- ✅ Should add Vary: Origin header
- ✅ Should skip requests without Origin

---

### 5. i18n Plugin (i18n.test.ts) - 27 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid locales config
- ✅ Should reject invalid detectMethods config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register i18nConfig service
- ✅ Should register i18nService service
- ✅ i18nService should provide t function
- ✅ i18nService should provide getLocale and setLocale
- ✅ i18nService should ignore unsupported languages
- ✅ Should output logs when logger is present

#### onRequest hook - Language detection

- ✅ Should detect language from Accept-Language header
- ✅ Should detect language from Cookie
- ✅ Should detect language from Query param
- ✅ Should detect language from path
- ✅ Should use default language when not detected
- ✅ Should skip when detection is disabled

#### onResponse hook

- ✅ Should set response headers
- ✅ Should inject lang attribute in HTML
- ✅ Should update existing lang attribute

#### Global $t method

- ✅ Should register global $t function
- ✅ Should register global $i18n instance
- ✅ $t should return untranslated key
- ✅ $t should support loading translations and translating
- ✅ $t should support nested keys
- ✅ Should use correct translation after locale switch

---

### 6. Module Export Tests (mod.test.ts) - 36 tests

#### Plugin function exports

- ✅ Should export tailwindPlugin function
- ✅ Should export unocssPlugin function
- ✅ Should export i18nPlugin function
- ✅ Should export seoPlugin function
- ✅ Should export pwaPlugin function
- ✅ Should export analyticsPlugin function
- ✅ Should export themePlugin function

#### Plugin instantiation

- ✅ tailwindPlugin should return valid plugin object
- ✅ unocssPlugin should return valid plugin object
- ✅ i18nPlugin should return valid plugin object
- ✅ seoPlugin should return valid plugin object
- ✅ pwaPlugin should return valid plugin object
- ✅ analyticsPlugin should return valid plugin object
- ✅ themePlugin should return valid plugin object

#### Plugin interface

- ✅ All plugins should have validateConfig method
- ✅ All plugins should have onInit hook
- ✅ CSS plugins should have onRequest and onResponse hooks
- ✅ i18n plugin should have onRequest and onResponse hooks
- ✅ SEO plugin should have onResponse and onBuildComplete hooks
- ✅ PWA plugin should have onResponse hook
- ✅ Analytics plugin should have onRequest and onResponse hooks
- ✅ Theme plugin should have onRequest and onResponse hooks

#### Type export validation

- ✅ TailwindPluginOptions type should be available
- ✅ UnoCSSPluginOptions type should be available
- ✅ I18nPluginOptions type should be available
- ✅ SEOPluginOptions type should be available
- ✅ PWAPluginOptions type should be available
- ✅ AnalyticsPluginOptions type should be available
- ✅ ThemePluginOptions type should be available

#### Submodule exports

- ✅ Should import from tailwindcss submodule
- ✅ Should import from unocss submodule
- ✅ Should import from i18n submodule
- ✅ Should import from seo submodule
- ✅ Should import from pwa submodule
- ✅ Should import from analytics submodule
- ✅ Should import from theme submodule

---

### 7. PWA Plugin (pwa.test.ts) - 18 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid icons config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register pwaConfig service
- ✅ Should register pwaService service
- ✅ pwaService should provide generateManifest method
- ✅ Should output logs when logger is present
- ✅ Should output Service Worker info
- ✅ Should output push notification info

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject manifest link
- ✅ Should inject theme-color meta tag
- ✅ Should inject mobile meta tags
- ✅ Should inject Apple Touch Icon
- ✅ Should inject Service Worker registration script
- ✅ Should not inject Service Worker script when offline disabled

---

### 8. Rate Limit Plugin (ratelimit.test.ts) - 22 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid max config
- ✅ Should reject invalid windowMs config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register rateLimitConfig service
- ✅ Should register rateLimitService service
- ✅ rateLimitService should provide correct methods
- ✅ Should output logs when logger and debug are enabled

#### rateLimitService

- ✅ Should correctly check if limit exceeded
- ✅ Should return correct reset time

#### onRequest hook

- ✅ Should allow requests within limit
- ✅ Should block requests exceeding limit
- ✅ Should return correct rate limit response
- ✅ Should include correct headers in rate limit response
- ✅ Should skip string-configured paths
- ✅ Should skip regex-configured paths
- ✅ Should use custom identifier generator

#### onResponse hook

- ✅ Should add rate limit headers to response
- ✅ Should decrement count when skipSuccessfulRequests
- ✅ Should decrement count when skipFailedRequests

---

### 9. Security Headers Plugin (security.test.ts) - 16 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid frameOptions config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register securityConfig service
- ✅ Should output logs when logger and debug are enabled

#### onResponse hook

- ✅ Should add default security headers
- ✅ Should add HSTS header
- ✅ Should add HSTS header with preload
- ✅ Should add CSP header
- ✅ Should add full CSP directives
- ✅ Should add Permissions-Policy header
- ✅ Should add other security headers
- ✅ Should be able to disable specific security headers
- ✅ Should skip requests without response

---

### 10. SEO Plugin (seo.test.ts) - 23 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid keywords config
- ✅ Should reject invalid robotsRules config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register seoConfig service
- ✅ Should register seoService service
- ✅ seoService should provide generateMetaTags method
- ✅ seoService should provide generateSitemap method
- ✅ seoService should provide generateRobots method
- ✅ Should output logs when logger is present

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject title tag
- ✅ Should inject description meta tag
- ✅ Should inject keywords meta tag
- ✅ Should inject canonical link
- ✅ Should inject favicon link
- ✅ Should inject Open Graph tags
- ✅ Should inject Twitter Card tags
- ✅ Should inject structured data

#### onBuildComplete hook

- ✅ Should generate Sitemap when enabled
- ✅ Should generate Robots.txt when enabled

---

### 11. Social Share Plugin (social.test.ts) - 23 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config
- ✅ Should support OAuth config

#### Config validation

- ✅ Should validate valid config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register socialConfig service
- ✅ Should register socialService service
- ✅ socialService should provide getShareUrl method
- ✅ socialService should provide getOAuthUrl method
- ✅ socialService should provide getEnabledPlatforms method

#### socialService - Share links

- ✅ Should generate Twitter share link
- ✅ Should generate Facebook share link
- ✅ Should generate Weibo share link
- ✅ Should generate LinkedIn share link
- ✅ Should generate WeChat share link
- ✅ Should generate share links for all platforms

#### socialService - OAuth

- ✅ Should generate GitHub OAuth link
- ✅ Should generate Google OAuth link
- ✅ Should return null when OAuth provider not configured
- ✅ Should return list of available OAuth providers

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject share script for HTML responses
- ✅ Should skip injection when injectShareButtons is false

---

### 12. Static File Plugin (static.test.ts) - 17 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid index config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register staticConfig service
- ✅ Should register staticService service
- ✅ staticService should provide getMimeType method
- ✅ staticService should provide computeEtag method

#### onRequest hook

- ✅ Should skip requests not matching prefix
- ✅ Should reject directory traversal attacks
- ✅ Should reject hidden file access (default)
- ✅ Should only handle GET and HEAD requests

#### MIME type detection

- ✅ Should correctly detect common MIME types
- ✅ Should support custom MIME types

#### ETag support

- ✅ Should generate consistent ETag
- ✅ Different content should generate different ETag

---

### 13. TailwindCSS Plugin (tailwindcss.test.ts) - 14 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid content config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register tailwindConfig service
- ✅ Should register tailwindCompiler service
- ✅ Should output logs when logger is present

#### onRequest hook

- ✅ Should compile CSS in dev mode

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject link tag in production mode

#### TailwindCompiler

- ✅ Should create compiler instance
- ✅ Should return empty CSS when file does not exist
- ✅ Should clear cache

---

### 14. Theme Plugin (theme.test.ts) - 24 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid defaultMode
- ✅ Should reject invalid strategy
- ✅ Should reject invalid transitionDuration
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register themeConfig service
- ✅ Should register themeService service
- ✅ themeService should provide getCurrentTheme method
- ✅ themeService should provide getCurrentMode method
- ✅ themeService should provide setTheme method
- ✅ themeService should provide setMode method

#### onRequest hook

- ✅ Should read theme from Cookie
- ✅ Should handle system mode
- ✅ Should use default mode when no Cookie

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject flash prevention script
- ✅ Should add dark class for class strategy
- ✅ Should add attribute for attribute strategy
- ✅ Should not inject script when disabled

#### Config options

- ✅ Should support custom cookieName
- ✅ Should support custom cookieExpireDays
- ✅ Should support custom transitionDuration

---

### 15. UnoCSS Plugin (unocss.test.ts) - 17 tests

#### Plugin creation

- ✅ Should create plugin with default config
- ✅ Should create plugin with custom config

#### Config validation

- ✅ Should validate valid config
- ✅ Should reject invalid content config
- ✅ Should reject invalid presets config
- ✅ Should accept empty config

#### onInit hook

- ✅ Should register unocssConfig service
- ✅ Should register unocssCompiler service
- ✅ Should output logs when logger is present
- ✅ Should output preset info

#### onRequest hook

- ✅ Should compile CSS in dev mode

#### onResponse hook

- ✅ Should skip non-HTML responses
- ✅ Should inject link tag in production mode

#### UnoCompiler

- ✅ Should create compiler instance
- ✅ Should still generate preflights when file does not exist
- ✅ Should clear cache
- ✅ Should return needsRebuild flag in dev mode

---

## Test Coverage Analysis

### API Method Coverage

| Plugin      | Public API                                                     | Coverage |
| ----------- | -------------------------------------------------------------- | -------- |
| Analytics   | trackPageview, trackEvent, trackPerformance, trackUserBehavior | 100%     |
| Auth        | hasRole, hasPermission, getUser                                | 100%     |
| Compression | compress                                                       | 100%     |
| CORS        | corsConfig                                                     | 100%     |
| i18n        | t, getLocale, setLocale                                        | 100%     |
| PWA         | generateManifest                                               | 100%     |
| RateLimit   | isLimited, getReset                                            | 100%     |
| Security    | securityConfig                                                 | 100%     |
| SEO         | generateMetaTags, generateSitemap, generateRobots              | 100%     |
| Social      | getShareUrl, getOAuthUrl, getEnabledPlatforms                  | 100%     |
| Static      | getMimeType, computeEtag                                       | 100%     |
| TailwindCSS | compile, clearCache                                            | 100%     |
| Theme       | getCurrentTheme, getCurrentMode, setTheme, setMode             | 100%     |
| UnoCSS      | compile, clearCache, getLastResult                             | 100%     |

### Edge Case Coverage

- ✅ Empty config handling
- ✅ Invalid config rejection
- ✅ Non-HTML response skip
- ✅ Missing required headers handling
- ✅ File not found handling
- ✅ Directory traversal attack protection

### Error Handling Coverage

- ✅ Config validation errors
- ✅ Auth failure handling
- ✅ Rate limit exceeded handling
- ✅ File access error handling

---

## Conclusion

The @dreamer/plugins test suite includes **322 unit tests**, all passing,
covering core functionality of all 15 plugins:

1. **CSS framework plugins**: TailwindCSS v4, UnoCSS
2. **i18n plugin**: i18n
3. **SEO plugins**: SEO, PWA
4. **Security plugins**: Auth, CORS, Security headers, Rate limit
5. **Feature plugins**: Compression, Static files, Theme, Analytics, Social
   share

All plugins pass config validation, lifecycle hooks, service registration, and
edge case tests.
