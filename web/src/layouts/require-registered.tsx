import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router";
import { useMeQuery } from "@/api/me";
import { BottomNav } from "@/components/bottom-nav";
import { QueryError } from "@/components/query-error";

// 需要已完成首次设置的页面都放在这个布局之下：
// 未完成时跳转到首次设置页，完成后再回到原来的页面（next 参数）
export function RequireRegistered() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const location = useLocation();

  if (me.isPending) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }
  if (me.isError) {
    return <QueryError error={me.error} onRetry={() => me.refetch()} />;
  }
  if (!me.data.user.registered) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/onboarding?next=${next}`} replace />;
  }
  return (
    <>
      <Outlet />
      {/* 给底部标签栏留出位置，页面最下方的内容不会被挡住 */}
      <div className="h-20" />
      <BottomNav />
    </>
  );
}
