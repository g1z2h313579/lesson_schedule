import { z } from "zod";
import { USER_INTRODUCTION_MAX_LENGTH, USER_NAME_MAX_LENGTH, USER_ROLES } from "../constants/user";

// 名字：去掉首尾空格后 1～50 字
const nameSchema = z.string().trim().min(1).max(USER_NAME_MAX_LENGTH);

// 自我介绍：最多 1000 字，空白视为未填写（保存为 null）
const introductionSchema = z
  .string()
  .trim()
  .max(USER_INTRODUCTION_MAX_LENGTH)
  .transform((value) => value || null);

// POST /api/me/registration（首次设置）的请求体
export const registrationSchema = z.object({
  role: z.enum(USER_ROLES),
  name: nameSchema,
  introduction: introductionSchema.optional(),
});

// PATCH /api/me（修改名字、自我介绍）的请求体
export const updateProfileSchema = z.object({
  name: nameSchema,
  introduction: introductionSchema,
});

// 前端提交时的类型（input）与后端校验后的类型（output）
export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationValues = z.output<typeof registrationSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileValues = z.output<typeof updateProfileSchema>;
