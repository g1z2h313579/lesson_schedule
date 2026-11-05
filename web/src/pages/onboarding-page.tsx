import { USER_ROLES, type UserRole } from "@shared/constants/user";
import { BookOpen, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router";
import { type Me, useMeQuery, useRegisterMutation } from "@/api/me";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { QueryError } from "@/components/query-error";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

const ROLE_ICONS = { teacher: BookOpen, student: GraduationCap } as const;

// 完成后跳回的页面：只接受本站内的路径（防止被带到其他网站）
function safeNextPath(next: string | null): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function parseRole(value: string | null): UserRole | null {
  return USER_ROLES.find((role) => role === value) ?? null;
}

/**
 * 首次设置：① 选择身份 → ② 填写名字和自我介绍。
 * 网址参数：role（从邀请进入时预选的身份，直接进入第 ② 步）、next（完成后跳回的页面）
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const me = useMeQuery();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [role, setRole] = useState(() => parseRole(params.get("role")));

  if (me.isPending) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }
  if (me.isError) {
    return <QueryError error={me.error} onRetry={() => me.refetch()} />;
  }
  // 已完成首次设置（包括刚刚提交成功）：回到原来要去的页面
  if (me.data.user.registered) {
    return <Navigate to={next} replace />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 还没选语言的新用户也能在这里切换 */}
      <PageHeader title={t("onboarding.title")} right={<LanguageSwitcher />} />
      {role === null ? (
        <RoleStep onSelect={setRole} />
      ) : (
        <ProfileStep me={me.data.user} role={role} onChangeRole={() => setRole(null)} />
      )}
    </div>
  );
}

// 第 ① 步：选择身份（点卡片后直接进入下一步）
function RoleStep({ onSelect }: { onSelect: (role: UserRole) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-xl font-bold">{t("onboarding.roleQuestion")}</p>
      <div className="flex flex-col gap-3">
        {USER_ROLES.map((role) => {
          const Icon = ROLE_ICONS[role];
          return (
            <button
              key={role}
              type="button"
              className="flex items-center gap-4 rounded-2xl border-2 border-transparent bg-card p-5 text-left transition-colors active:border-primary active:bg-brand-soft"
              onClick={() => onSelect(role)}
            >
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
                <Icon className="size-8" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xl font-bold">{t(`onboarding.roles.${role}.title`)}</span>
                <span className="text-muted-foreground">
                  {t(`onboarding.roles.${role}.description`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-sm text-muted-foreground">{t("onboarding.roleNote")}</p>
    </div>
  );
}

// 第 ② 步：填写名字（默认为 LINE 昵称）和自我介绍
function ProfileStep({
  me,
  role,
  onChangeRole,
}: {
  me: Me;
  role: UserRole;
  onChangeRole: () => void;
}) {
  const { t } = useTranslation();
  const register = useRegisterMutation();

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-xl font-bold">{t("onboarding.profileTitle")}</p>
      <Panel className="flex items-center gap-4">
        <UserAvatar
          name={me.lineDisplayName}
          pictureUrl={me.pictureUrl}
          className="size-14 text-xl"
        />
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="text-lg">
            {t("settings.role")}：<strong>{t(`roles.${role}`)}</strong>
          </span>
          <Button variant="soft" size="lg" onClick={onChangeRole} disabled={register.isPending}>
            {t("onboarding.changeRole")}
          </Button>
        </div>
      </Panel>
      <Panel>
        <ProfileForm
          defaultValues={{ name: me.lineDisplayName, introduction: "" }}
          submitLabel={t("onboarding.submit")}
          pending={register.isPending}
          error={register.error}
          onSubmit={(values) => register.mutate({ role, ...values })}
        />
      </Panel>
    </div>
  );
}
