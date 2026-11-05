import { USER_INTRODUCTION_MAX_LENGTH, USER_NAME_MAX_LENGTH } from "@shared/constants/user";
import { updateProfileSchema } from "@shared/schemas/me";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileValues = {
  name: string;
  introduction: string;
};

type Props = {
  defaultValues: ProfileValues;
  submitLabel: string;
  pending: boolean;
  // 提交失败时的错误（接口返回的错误）
  error: unknown;
  onSubmit: (values: ProfileValues) => void;
};

// 名字和自我介绍的输入表单（首次设置、设置页共用）
// 提交前用与后端相同的 Zod schema 检查，出错时在输入框下方显示提示
export function ProfileForm({ defaultValues, submitLabel, pending, error, onSubmit }: Props) {
  const { t } = useTranslation();
  const nameId = useId();
  const introductionId = useId();
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<{ name?: string; introduction?: string }>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = updateProfileSchema.safeParse(values);
    if (!result.success) {
      const fields = new Set(result.error.issues.map((issue) => issue.path[0]));
      setErrors({
        name: fields.has("name")
          ? values.name.trim() === ""
            ? t("profile.nameRequired")
            : t("profile.nameTooLong", { max: USER_NAME_MAX_LENGTH })
          : undefined,
        introduction: fields.has("introduction")
          ? t("profile.introductionTooLong", { max: USER_INTRODUCTION_MAX_LENGTH })
          : undefined,
      });
      return;
    }
    setErrors({});
    onSubmit(values);
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId} className="text-base font-bold">
          {t("profile.name")}
        </Label>
        <Input
          id={nameId}
          value={values.name}
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.nameHint")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={introductionId} className="text-base font-bold">
          {t("profile.introduction")}
          <span className="font-normal text-muted-foreground">（{t("profile.optional")}）</span>
        </Label>
        <Textarea
          id={introductionId}
          className="min-h-32"
          value={values.introduction}
          placeholder={t("profile.introductionPlaceholder")}
          aria-invalid={errors.introduction ? true : undefined}
          onChange={(event) => setValues({ ...values, introduction: event.target.value })}
        />
        {errors.introduction && <p className="text-sm text-destructive">{errors.introduction}</p>}
      </div>

      {error ? <QueryError error={error} /> : null}

      <Button type="submit" size="xl" disabled={pending}>
        {pending ? t("common.saving") : submitLabel}
      </Button>
    </form>
  );
}
