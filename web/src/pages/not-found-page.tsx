import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";

// 404 页面
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("notFound.title")} />
      <Panel className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-lg">{t("notFound.title")}</p>
        <Button asChild size="xl">
          <Link to="/">{t("notFound.backHome")}</Link>
        </Button>
      </Panel>
    </div>
  );
}
