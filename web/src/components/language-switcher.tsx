import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { changeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

// 语言切换按钮（日语 / 中文）
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">{t("language.label")}</legend>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          size="sm"
          variant={i18n.resolvedLanguage === lang.code ? "default" : "outline"}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          onClick={() => changeLanguage(lang.code)}
        >
          {lang.label}
        </Button>
      ))}
    </fieldset>
  );
}
