import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ja } from "./locales/ja";
import { zh } from "./locales/zh";

// 支持的语言（新增语言时：在 locales/ 下新增文件，并加到这里）
export const SUPPORTED_LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// 用户手动切换的语言保存在 localStorage
const STORAGE_KEY = "app.language";
// 设备语言既不是日语也不是中文时使用的语言
const FALLBACK_LANGUAGE: LanguageCode = "ja";

export const resources = {
  ja: { translation: ja },
  zh: { translation: zh },
} as const;

function isSupported(code: string | null | undefined): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// 决定初始语言：手动选择过的语言 > 设备语言 > 默认语言
function detectLanguage(): LanguageCode {
  const stored = readStoredLanguage();
  if (isSupported(stored)) return stored;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase().split("-")[0];
    if (isSupported(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}

// 同步 <html lang>，让浏览器按语言选择正确的字体
function syncDocumentLanguage(code: string) {
  document.documentElement.lang = code;
  document.title = i18n.t("app.title");
}

export function initI18n() {
  i18n.on("languageChanged", syncDocumentLanguage);
  return i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

export function changeLanguage(code: LanguageCode) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // 无法使用 localStorage 时（隐私模式等）只在本次打开期间生效
  }
  return i18n.changeLanguage(code);
}

export { i18n };
