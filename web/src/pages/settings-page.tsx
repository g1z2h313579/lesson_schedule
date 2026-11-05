import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisteredMe, useUpdateProfileMutation } from "@/api/me";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { Panel, Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";

// 设置：修改名字和自我介绍、切换界面语言（身份只显示，不能修改）
export function SettingsPage() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const update = useUpdateProfileMutation();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("settings.title")} />

      <Panel className="flex items-center gap-4">
        <UserAvatar name={me.name} pictureUrl={me.pictureUrl} className="size-16 text-2xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-xl font-bold">{me.name}</span>
            <Badge variant="secondary">{t(`roles.${me.role}`)}</Badge>
          </span>
          <span className="text-sm text-muted-foreground">{t("settings.roleNote")}</span>
        </div>
      </Panel>

      <Section title={t("settings.profile")}>
        <Panel className="flex flex-col gap-3">
          <ProfileForm
            defaultValues={{ name: me.name, introduction: me.introduction ?? "" }}
            submitLabel={t("settings.save")}
            pending={update.isPending}
            error={update.error}
            onSubmit={(values) => {
              setSaved(false);
              update.mutate(values, { onSuccess: () => setSaved(true) });
            }}
          />
          {saved && (
            <p role="status" className="text-center text-lg text-primary">
              {t("settings.saved")}
            </p>
          )}
        </Panel>
      </Section>

      <Section title={t("language.label")}>
        <Panel className="flex items-center justify-between gap-4">
          <span className="text-lg">{t("language.label")}</span>
          <LanguageSwitcher />
        </Panel>
      </Section>
    </div>
  );
}
