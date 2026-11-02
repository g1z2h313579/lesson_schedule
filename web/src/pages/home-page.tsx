import { useTranslation } from "react-i18next";
import { useHealthQuery } from "@/api/health";
import { useHelloQuery } from "@/api/hello";
import { useMeQuery } from "@/api/me";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// 首页：Hello World（同时确认 API、数据库、登录都已连通）
export function HomePage() {
  const { t } = useTranslation();
  const hello = useHelloQuery();
  const health = useHealthQuery();
  const me = useMeQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("home.title")}</CardTitle>
        <CardDescription>{t("home.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">{t("home.apiMessage")}</dt>
          <dd>
            {hello.isPending && t("common.loading")}
            {hello.isError && <QueryError error={hello.error} onRetry={() => hello.refetch()} />}
            {hello.data?.message}
          </dd>

          <dt className="text-muted-foreground">{t("home.dbStatus")}</dt>
          <dd>
            {health.isPending && t("common.loading")}
            {health.isError && <QueryError error={health.error} onRetry={() => health.refetch()} />}
            {health.data && t("home.ok")}
          </dd>

          <dt className="text-muted-foreground">{t("home.currentUser")}</dt>
          <dd>
            {me.isPending && t("common.loading")}
            {me.isError && <QueryError error={me.error} onRetry={() => me.refetch()} />}
            {me.data && (me.data.user.displayName || t("home.unknownName"))}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
