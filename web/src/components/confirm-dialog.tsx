import { type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // 写清楚确认后会发生什么
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  // 传入时显示理由的输入框（选填）
  reasonLabel?: string;
  pending: boolean;
  error: unknown;
  onConfirm: (reason: string) => void;
};

// 确认对话框：取消课程、请假、删除留言、拒绝申请等操作之前，先让用户确认
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  reasonLabel,
  pending,
  error,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const reasonId = useId();
  const [reason, setReason] = useState("");

  // 每次打开时清空上次输入的理由
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-base">{description}</DialogDescription>
          )}
        </DialogHeader>
        {reasonLabel && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId} className="text-base">
              {reasonLabel}
              <span className="font-normal text-muted-foreground">（{t("profile.optional")}）</span>
            </Label>
            <Textarea
              id={reasonId}
              className="text-lg md:text-lg"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}
        {error ? <QueryError error={error} /> : null}
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            className="h-12 text-lg"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="h-12 text-lg"
            disabled={pending}
            onClick={() => onConfirm(reason)}
          >
            {pending ? t("common.processing") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
