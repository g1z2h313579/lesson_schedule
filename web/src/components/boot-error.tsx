import { useTranslation } from "react-i18next";

// 启动失败（如 LIFF 初始化失败）时显示的页面
export function BootError({ error }: { error: unknown }) {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg">{t("errors.bootFailed")}</p>
      {import.meta.env.DEV && (
        <pre className="max-w-full overflow-auto text-sm text-muted-foreground">
          {String(error)}
        </pre>
      )}
    </main>
  );
}
