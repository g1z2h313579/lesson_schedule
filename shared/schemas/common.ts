import { z } from "zod";

// 路径参数中的 id（/api/xxx/:id）
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** 选填的文字：去掉首尾空格，空白视为未填写（null） */
export function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null)
    .optional();
}
