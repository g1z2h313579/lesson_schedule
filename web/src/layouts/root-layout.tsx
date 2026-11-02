import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { LanguageSwitcher } from "@/components/language-switcher";

// 所有页面共用的布局：顶部标题栏 + 页面内容
export function RootLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-lg font-bold">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
