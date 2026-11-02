import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

// 返回按钮：有上一页时返回上一页；直接打开这个页面（没有上一页）时去 fallback
export function BackButton({ fallback }: { fallback: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // React Router 在 history.state.idx 中记录这是第几个页面（0 表示没有上一页）
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <Button
      variant="ghost"
      className="-ml-2 h-10 self-start px-2 text-base"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
    >
      <ChevronLeft className="size-5" />
      {t("common.back")}
    </Button>
  );
}
