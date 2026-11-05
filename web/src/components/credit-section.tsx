import { CREDIT_REQUEST_MAX_AMOUNT } from "@shared/constants/credit-request";
import { Hourglass, Minus, Plus, Ticket } from "lucide-react";
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
import { EmptyState, ListGroup, Section } from "@/components/section";
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

// 申请状态的标签颜色：待处理（黄）/ 已确认（绿）/ 已拒绝（红）/ 已撤回（灰）
const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  withdrawn: "muted",
} as const;

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
    <Section title={t("credit.title")}>
      {pending && (
        <div className="flex flex-col gap-3 rounded-2xl bg-warning p-4 text-warning-foreground">
          <p className="flex items-start gap-3 text-lg font-bold">
            <Hourglass className="mt-1 size-5 shrink-0" aria-hidden />
            {myRole === "teacher"
              ? t("credit.pendingForTeacher", {
                  name: relation.student.name,
                  amount: pending.amount,
                })
              : t("credit.pendingForStudent", { amount: pending.amount })}
          </p>
          {pending.note && <p className="pl-8">{pending.note}</p>}
          {myRole === "teacher" && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="xl" onClick={() => setConfirm("reject")}>
                {t("credit.reject")}
              </Button>
              <Button size="xl" onClick={() => setConfirm("approve")}>
                {t("credit.approve")}
              </Button>
            </div>
          )}
          {myRole === "student" && (
            <Button variant="outline" size="xl" onClick={() => setConfirm("withdraw")}>
              {t("credit.withdraw")}
            </Button>
          )}
        </div>
      )}

      {myRole === "student" && !pending && (
        <Button variant="soft" size="xl" onClick={() => setRequestOpen(true)}>
          <Plus aria-hidden />
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
    </Section>
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
          <DialogTitle>{t("credit.request")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="soft"
            size="icon-lg"
            className="size-14 rounded-full"
            aria-label={t("credit.decrease")}
            onClick={() => change(-1)}
          >
            <Minus className="size-6" />
          </Button>
          <span className="flex min-w-24 items-baseline justify-center gap-1">
            <span className="text-5xl font-bold text-primary tabular-nums">{amount}</span>
            <span className="text-lg">{t("credit.unit")}</span>
          </span>
          <Button
            variant="soft"
            size="icon-lg"
            className="size-14 rounded-full"
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
              className="h-11 rounded-full px-1 text-base"
              onClick={() => setAmount(value)}
            >
              {t("credit.amount", { amount: value })}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={noteId} className="text-base font-bold">
            {t("credit.note")}
            <span className="font-normal text-muted-foreground">（{t("profile.optional")}）</span>
          </Label>
          <Textarea
            id={noteId}
            value={note}
            placeholder={t("credit.notePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {create.error ? <QueryError error={create.error} /> : null}
        <DialogFooter>
          <Button
            size="xl"
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

// 申请记录（新的在前，放在白色卡片的列表中）
function CreditHistory({ relationId }: { relationId: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const requests = useCreditRequestsQuery(relationId);

  if (requests.isPending) return null;
  if (requests.isError) {
    return <QueryError error={requests.error} onRetry={() => requests.refetch()} />;
  }
  if (requests.data.requests.length === 0) {
    return (
      <EmptyState
        icon={<Ticket className="size-6 shrink-0" aria-hidden />}
        text={t("credit.noHistory")}
      />
    );
  }
  return (
    <ListGroup>
      {requests.data.requests.map((request) => (
        <li key={request.id} className="flex flex-col gap-1 px-4 py-3">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-lg font-bold">
                {t("credit.amount", { amount: request.amount })}
              </span>
              <span className="text-muted-foreground">
                {formatDate(new Date(request.createdAt), language)}
              </span>
            </span>
            <Badge variant={STATUS_BADGE[request.status]}>
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
    </ListGroup>
  );
}
