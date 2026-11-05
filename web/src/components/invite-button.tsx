import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCreateInvitationMutation } from "@/api/invitations";
import { useRegisteredMe } from "@/api/me";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareInvitation } from "@/lib/invite";

// 「邀请学生」/「邀请老师」按钮：生成邀请码 → 打开 LINE 的好友选择画面发送邀请卡片
// 无法使用好友选择画面时，显示邀请链接，由用户复制后手动贴到 LINE 聊天中
export function InviteButton() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const createInvitation = useCreateInvitationMutation();
  const [sending, setSending] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const handleClick = async () => {
    setSending(true);
    try {
      const { invitation } = await createInvitation.mutateAsync();
      const result = await shareInvitation(invitation.code, me.name, me.role);
      if (result.type === "sent") toast.success(t("invite.sent"));
      if (result.type === "fallback") setFallbackUrl(result.url);
    } catch (error) {
      console.warn("[邀请] 发送失败", error);
      toast.error(t("invite.failed"));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    if (!fallbackUrl) return;
    try {
      await navigator.clipboard.writeText(fallbackUrl);
      toast.success(t("invite.copied"));
    } catch {
      // 有些环境不允许写入剪贴板：链接显示在画面上，可以长按选择复制
      toast.error(t("invite.copyFailed"));
    }
  };

  return (
    <>
      <Button variant="soft" size="xl" className="w-full" disabled={sending} onClick={handleClick}>
        <UserPlus aria-hidden />
        {me.role === "teacher" ? t("invite.inviteStudent") : t("invite.inviteTeacher")}
      </Button>
      <Dialog open={fallbackUrl !== null} onOpenChange={(open) => !open && setFallbackUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invite.linkTitle")}</DialogTitle>
            <DialogDescription>{t("invite.linkDescription")}</DialogDescription>
          </DialogHeader>
          <p className="rounded-xl bg-muted p-3 text-sm break-all select-all">{fallbackUrl}</p>
          <DialogFooter>
            <Button size="xl" onClick={handleCopy}>
              {t("invite.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
