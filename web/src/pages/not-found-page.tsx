import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

// 404 页面
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-lg">{t("notFound.title")}</p>
      <Button asChild size="lg">
        <Link to="/">{t("notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
