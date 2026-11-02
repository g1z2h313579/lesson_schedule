import { CREDIT_REQUEST_MAX_AMOUNT } from "@shared/constants/credit-request";
import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateCreditRequestMutation,
  useCreditRequestsQuery,
  useDecideCreditRequestMutation,
} from "@/api/credit-requests";
import type { RelationDetail } from "@/api/relations";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { formatDate } from "@/lib/format";

// 申请时的快捷选项（课时数）
const QUICK_AMOUNTS = [4, 8, 10];

type Props = {
  relation: RelationDetail;
  // 当前用户在这个关系中的身份（管理员查看别人的关系时为 null，只能查看）
  myRole: "teacher" | "student" | null;
};

// 详情页的课时申请部分：
// 学生：申请增加课时、撤回；老师：确认、拒绝；双方都能看到申请记录
export function CreditSection({ relation, myRole }: Props) {
  const { t } = useTranslation();
  const decide = useDecideCreditRequestMutation();
  const [requestOpen, setRequestOpen] = useState(false);
  const [confirm, setConfirm] = useState<"approve" | "reject" | "withdraw" | null>(null);
  const pending = relation.pendingCreditRequest;

  const handleDecide = (reason: string) => {
    if (!pending || !confirm) return;
    const input =
      confirm === "reject"
        ? { id: pending.id, action: "reject" as const, reason }
        : { id: pending.id, action: confirm };
    decide.mutate(input, {
      onSuccess: () => {
        setConfirm(null);
        toast.success(t(`credit.done.${confirm}`));
      },
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">{t("credit.title")}</h3>

      {pending && (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-primary p-4">
          <p className="text-lg">
            {myRole === "teacher"
              ? t("credit.pendingForTeacher", {
                  name: relation.student.name,
                  amount: pending.amount,
                })
              : t("credit.pendingForStudent", { amount: pending.amount })}
          </p>
          {pending.note && <p className="text-muted-foreground">{pending.note}</p>}
          {myRole === "teacher" && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 text-lg"
                onClick={() => setConfirm("reject")}
              >
                {t("credit.reject")}
              </Button>
              <Button className="h-12 text-lg" onClick={() => setConfirm("approve")}>
                {t("credit.approve")}
              </Button>
            </div>
          )}
          {myRole === "student" && (
            <Button
              variant="outline"
              className="h-12 text-lg"
              onClick={() => setConfirm("withdraw")}
            >
              {t("credit.withdraw")}
            </Button>
          )}
        </div>
      )}

      {myRole === "student" && !pending && (
        <Button className="h-12 text-lg" onClick={() => setRequestOpen(true)}>
          {t("credit.request")}
        </Button>
      )}

      <CreditHistory relationId={relation.id} />

      <RequestDialog relationId={relation.id} open={requestOpen} onOpenChange={setRequestOpen} />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? t(`credit.confirm.${confirm}.title`) : ""}
        description={
          confirm && pending
            ? t(`credit.confirm.${confirm}.description`, { amount: pending.amount })
            : ""
        }
        confirmLabel={confirm ? t(`credit.${confirm}`) : ""}
        destructive={confirm === "reject"}
        reasonLabel={confirm === "reject" ? t("credit.rejectReason") : undefined}
        pending={decide.isPending}
        error={decide.error}
        onConfirm={handleDecide}
      />
    </section>
  );
}

// 申请增加课时的对话框：大的 −/+ 按钮和快捷选项，方便选择课时数
function RequestDialog({
  relationId,
  open,
  onOpenChange,
}: {
  relationId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const noteId = useId();
  const create = useCreateCreditRequestMutation(relationId);
  const [amount, setAmount] = useState(8);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(8);
      setNote("");
      create.reset();
    }
  }, [open, create.reset]);

  const change = (delta: number) =>
    setAmount((value) => Math.min(CREDIT_REQUEST_MAX_AMOUNT, Math.max(1, value + delta)));

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">{t("credit.request")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-14"
            aria-label={t("credit.decrease")}
            onClick={() => change(-1)}
          >
            <Minus className="size-6" />
          </Button>
          <span className="flex min-w-20 items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tabular-nums">{amount}</span>
            <span className="text-lg">{t("credit.unit")}</span>
          </span>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-14"
            aria-label={t("credit.increase")}
            onClick={() => change(1)}
          >
            <Plus className="size-6" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <Button
              key={value}
              variant={value === amount ? "default" : "outline"}
              className="h-11 px-1 text-base"
              onClick={() => setAmount(value)}
            >
              {t("credit.amount", { amount: value })}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={noteId} className="text-base">
            {t("credit.note")}
            <span className="font-normal text-muted-foreground">（{t("profile.optional")}）</span>
          </Label>
          <Textarea
            id={noteId}
            className="text-lg md:text-lg"
            value={note}
            placeholder={t("credit.notePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {create.error ? <QueryError error={create.error} /> : null}
        <DialogFooter>
          <Button
            className="h-12 text-lg"
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { amount, note },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    toast.success(t("credit.done.request"));
                  },
                },
              )
            }
          >
            {create.isPending ? t("common.processing") : t("credit.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 申请记录（新的在前）
function CreditHistory({ relationId }: { relationId: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const requests = useCreditRequestsQuery(relationId);

  if (requests.isPending) return null;
  if (requests.isError) {
    return <QueryError error={requests.error} onRetry={() => requests.refetch()} />;
  }
  if (requests.data.requests.length === 0) {
    return <p className="text-muted-foreground">{t("credit.noHistory")}</p>;
  }
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {requests.data.requests.map((request) => (
        <li key={request.id} className="flex flex-col gap-1 p-3">
          <span className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap gap-x-3 text-lg">
              <span>{formatDate(new Date(request.createdAt), language)}</span>
              <span>{t("credit.amount", { amount: request.amount })}</span>
            </span>
            <Badge
              variant={request.status === "approved" ? "default" : "secondary"}
              className="text-sm"
            >
              {t(`credit.status.${request.status}`)}
            </Badge>
          </span>
          {request.note && <span className="text-muted-foreground">{request.note}</span>}
          {request.rejectReason && (
            <span className="text-muted-foreground">
              {t("credit.rejectReason")}：{request.rejectReason}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
