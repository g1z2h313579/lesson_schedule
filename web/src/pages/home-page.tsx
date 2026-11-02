import { useTranslation } from "react-i18next";
import { useRegisteredMe } from "@/api/me";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// 首页（暂定）：阶段 3、6 中改为「下一节课」卡片和课程表（月历）
export function HomePage() {
  const { t } = useTranslation();
  const me = useRegisteredMe();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("home.greeting", { name: me.name })}</CardTitle>
        <CardDescription>{t(`roles.${me.role}`)}</CardDescription>
      </CardHeader>
      <CardContent>{t("home.placeholder")}</CardContent>
    </Card>
  );
}
