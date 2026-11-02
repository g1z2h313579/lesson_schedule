import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router";
import { useMeQuery } from "@/api/me";
import { DevUserSwitcher } from "@/components/dev-user-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { isLiffMock } from "@/lib/liff";

// 所有页面共用的布局：顶部标题栏 + 页面内容
export function RootLayout() {
  const { t } = useTranslation();
  // 完成首次设置之后才显示设置按钮
  const registered = useMeQuery().data?.user.registered ?? false;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="shrink-0 text-lg font-bold whitespace-nowrap">
          <Link to="/">{t("app.title")}</Link>
        </h1>
        <div className="flex min-w-0 items-center gap-2">
          {isLiffMock && <DevUserSwitcher />}
          <LanguageSwitcher />
          {registered && (
            <Button asChild variant="ghost" size="icon-lg">
              <Link to="/settings" aria-label={t("settings.title")}>
                <Settings className="size-6" />
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
