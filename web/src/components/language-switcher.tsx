import { useTranslation } from "react-i18next";
import { changeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

// 语言切换（日语 / 中文），分段按钮的样式
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <fieldset className="flex rounded-xl bg-black/5 p-1">
      <legend className="sr-only">{t("language.label")}</legend>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = i18n.resolvedLanguage === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            aria-pressed={active}
            className={cn(
              "h-9 rounded-lg px-3 text-base font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => changeLanguage(lang.code)}
          >
            {lang.label}
          </button>
        );
      })}
    </fieldset>
  );
}
