import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getApiErrorCode } from "@/api/client";
import { useAcceptInvitationMutation, useInvitationQuery } from "@/api/invitations";
import { useMeQuery } from "@/api/me";
import { LinkifiedText } from "@/components/linkified-text";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

// 邀请确认页：从邀请卡片打开。显示邀请人的资料，点「接受」建立关联
// 未完成首次设置的用户也能打开：先显示邀请人，再去做首次设置（身份预选为与邀请人相反的身份）
export function InvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const code = useParams().code ?? "";
  const me = useMeQuery();
  const invitation = useInvitationQuery(code);
  const accept = useAcceptInvitationMutation(code);

  if (me.isPending || invitation.isPending) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }
  if (me.isError) return <QueryError error={me.error} onRetry={() => me.refetch()} />;
  if (invitation.isError) {
    return getApiErrorCode(invitation.error) === "NOT_FOUND" ? (
      <InviteMessage text={t("invite.notFound")} />
    ) : (
      <QueryError error={invitation.error} onRetry={() => invitation.refetch()} />
    );
  }

  const { inviter, status } = invitation.data.invitation;
  const registered = me.data.user.registered;
  const oppositeRole = inviter.role === "teacher" ? "student" : "teacher";
  const next = encodeURIComponent(`/invite/${code}`);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{t("invite.title")}</h2>
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center gap-4">
          <UserAvatar name={inviter.name} pictureUrl={inviter.pictureUrl} className="size-16" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{inviter.name}</span>
            {inviter.role && (
              <span className="text-muted-foreground">{t(`roles.${inviter.role}`)}</span>
            )}
          </div>
        </div>
        {inviter.introduction && <LinkifiedText text={inviter.introduction} className="text-lg" />}
      </div>

      {status !== "valid" ? (
        <InviteMessage text={t(`invite.status.${status}`)} />
      ) : !registered ? (
        <>
          <p className="text-lg">{t("invite.registerFirst")}</p>
          <Button
            className="h-12 text-lg"
            onClick={() => navigate(`/onboarding?role=${oppositeRole}&next=${next}`)}
          >
            {t("invite.toOnboarding")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-lg">
            {t(inviter.role === "teacher" ? "invite.confirmTeacher" : "invite.confirmStudent", {
              name: inviter.name,
            })}
          </p>
          {accept.error ? <QueryError error={accept.error} /> : null}
          <Button
            className="h-12 text-lg"
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(undefined, {
                onSuccess: ({ relationId }) => {
                  toast.success(t("invite.accepted"));
                  navigate(`/relations/${relationId}`, { replace: true });
                },
              })
            }
          >
            {accept.isPending ? t("common.processing") : t("invite.accept")}
          </Button>
        </>
      )}
    </div>
  );
}

function InviteMessage({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">{text}</p>
      <Button asChild variant="outline" className="h-12 text-lg">
        <Link to="/">{t("notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
