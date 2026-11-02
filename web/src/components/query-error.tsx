import { useTranslation } from "react-i18next";
import { getApiErrorCode } from "@/api/client";
import { Button } from "@/components/ui/button";

type Props = {
  error: unknown;
  onRetry?: () => void;
};

// 接口出错时的统一提示（按错误码显示对应语言的文字）
export function QueryError({ error, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-start gap-3 text-destructive">
      <p>{t(`errors.${getApiErrorCode(error)}`)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
