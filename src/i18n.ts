/**
 * @module @dreamer/plugins/i18n.ts
 *
 * Plugins package i18n: user-facing messages for social (OAuth/share) and
 * ratelimit. Locale is detected from LANGUAGE / LC_ALL / LANG.
 */

import {
  createI18n,
  type I18n,
  type TranslationData,
  type TranslationParams,
} from "@dreamer/i18n";
import { getEnv } from "@dreamer/runtime-adapter";
import enUS from "./locales/en-US.json" with { type: "json" };
import zhCN from "./locales/zh-CN.json" with { type: "json" };

export type Locale = "en-US" | "zh-CN";
export const DEFAULT_LOCALE: Locale = "en-US";

const PLUGINS_LOCALES: Locale[] = ["en-US", "zh-CN"];
const LOCALE_DATA: Record<string, TranslationData> = {
  "en-US": enUS as TranslationData,
  "zh-CN": zhCN as TranslationData,
};

let pluginsI18n: I18n | null = null;

/**
 * Detect locale from environment (LANGUAGE, LC_ALL, LANG).
 */
export function detectLocale(): Locale {
  const langEnv = getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return DEFAULT_LOCALE;
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return DEFAULT_LOCALE;
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${
      match[2].toUpperCase()
    }` as Locale;
    if (PLUGINS_LOCALES.includes(normalized)) return normalized;
  }
  const primary = first.substring(0, 2).toLowerCase();
  if (primary === "zh") return "zh-CN";
  if (primary === "en") return "en-US";
  return DEFAULT_LOCALE;
}

function initPluginsI18n(): void {
  if (pluginsI18n) return;
  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...PLUGINS_LOCALES],
    translations: LOCALE_DATA as Record<string, TranslationData>,
  });
  i18n.setLocale(detectLocale());
  pluginsI18n = i18n;
}

initPluginsI18n();

/**
 * Set plugins package locale (affects $tr for subsequent calls).
 */
export function setPluginsLocale(lang: Locale): void {
  initPluginsI18n();
  if (pluginsI18n) pluginsI18n.setLocale(lang);
}

/**
 * Translate a key. Keys are under "plugins.*" (e.g. plugins.social.shareLinkFailed).
 */
export function $tr(
  key: string,
  params?: TranslationParams,
  lang?: Locale,
): string {
  if (!pluginsI18n) initPluginsI18n();
  if (!pluginsI18n) return key;
  if (lang !== undefined) {
    const prev = pluginsI18n.getLocale();
    pluginsI18n.setLocale(lang);
    try {
      return pluginsI18n.t(key, params);
    } finally {
      pluginsI18n.setLocale(prev);
    }
  }
  return pluginsI18n.t(key, params);
}
