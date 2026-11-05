import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getApiErrorCode } from "@/api/client";
import {
  type Invitation,
  useAcceptInvitationMutation,
  useInvitationQuery,
} from "@/api/invitations";
import { useMeQuery } from "@/api/me";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkifiedText } from "@/components/linkified-text";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

// 邀请确认页：从邀请卡片打开。显示邀请人的资料，点「接受」建立关联
// 未完成首次设置的用户也能打开：先显示邀请人，再去做首次设置（身份预选为与邀请人相反的身份）
export function InvitePage() {
  const { t } = useTranslation();
  const code = useParams().code ?? "";
  const me = useMeQuery();
  const invitation = useInvitationQuery(code);

  return (
    <div className="flex flex-col gap-5">
      {/* 还没选语言的新用户也能在这里切换 */}
      <PageHeader title={t("invite.title")} right={<LanguageSwitcher />} />
      {me.isPending || invitation.isPending ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : me.isError ? (
        <QueryError error={me.error} onRetry={() => me.refetch()} />
      ) : invitation.isError ? (
        getApiErrorCode(invitation.error) === "NOT_FOUND" ? (
          <InviteMessage text={t("invite.notFound")} />
        ) : (
          <QueryError error={invitation.error} onRetry={() => invitation.refetch()} />
        )
      ) : (
        <InviteContent
          code={code}
          invitation={invitation.data.invitation}
          registered={me.data.user.registered}
        />
      )}
    </div>
  );
}

// 邀请人的资料，以及接受邀请（或先去做首次设置）的按钮
function InviteContent({
  code,
  invitation,
  registered,
}: {
  code: string;
  invitation: Invitation;
  registered: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accept = useAcceptInvitationMutation(code);

  const { inviter, status } = invitation;
  const oppositeRole = inviter.role === "teacher" ? "student" : "teacher";
  const next = encodeURIComponent(`/invite/${code}`);

  return (
    <>
      <Panel className="flex flex-col items-center gap-3 py-6 text-center">
        <UserAvatar
          name={inviter.name}
          pictureUrl={inviter.pictureUrl}
          className="size-20 text-3xl"
        />
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{inviter.name}</span>
          {inviter.role && (
            <span className="text-muted-foreground">{t(`roles.${inviter.role}`)}</span>
          )}
        </div>
        {inviter.introduction && (
          <LinkifiedText
            text={inviter.introduction}
            className="w-full rounded-xl bg-muted px-4 py-3 text-left"
          />
        )}
      </Panel>

      {status !== "valid" ? (
        <InviteMessage text={t(`invite.status.${status}`)} />
      ) : !registered ? (
        <>
          <p className="px-1 text-lg">{t("invite.registerFirst")}</p>
          <Button
            size="xl"
            onClick={() => navigate(`/onboarding?role=${oppositeRole}&next=${next}`)}
          >
            {t("invite.toOnboarding")}
          </Button>
        </>
      ) : (
        <>
          <p className="px-1 text-center text-xl font-bold">
            {t(inviter.role === "teacher" ? "invite.confirmTeacher" : "invite.confirmStudent", {
              name: inviter.name,
            })}
          </p>
          {accept.error ? <QueryError error={accept.error} /> : null}
          <Button
            size="xl"
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
    </>
  );
}

function InviteMessage({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Panel className="text-lg">{text}</Panel>
      <Button asChild variant="outline" size="xl">
        <Link to="/">{t("notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
