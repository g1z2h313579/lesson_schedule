import { useTranslation } from "react-i18next";
import type { LanguageCode } from "@/i18n";

/** 当前的界面语言（日期格式化等需要语言代码时使用） */
export function useLanguage(): LanguageCode {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === "zh" ? "zh" : "ja";
}
