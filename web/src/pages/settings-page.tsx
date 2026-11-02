import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisteredMe, useUpdateProfileMutation } from "@/api/me";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProfileForm } from "@/components/profile-form";
import { UserAvatar } from "@/components/user-avatar";

// 设置：修改名字和自我介绍、切换界面语言（身份只显示，不能修改）
export function SettingsPage() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const update = useUpdateProfileMutation();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold">{t("settings.title")}</h2>

      <section className="flex items-center gap-4">
        <UserAvatar name={me.name} pictureUrl={me.pictureUrl} className="size-16" />
        <div className="flex flex-col gap-1">
          <span className="text-lg">
            {t("settings.role")}：<strong>{t(`roles.${me.role}`)}</strong>
          </span>
          <span className="text-sm text-muted-foreground">{t("settings.roleNote")}</span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
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
          <p role="status" className="text-center text-lg">
            {t("settings.saved")}
          </p>
        )}
      </section>

      <section className="flex items-center justify-between gap-4 border-t pt-6">
        <h3 className="text-lg font-bold">{t("language.label")}</h3>
        <LanguageSwitcher />
      </section>
    </div>
  );
}
