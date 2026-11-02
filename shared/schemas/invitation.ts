import { z } from "zod";

// 路径参数中的邀请码（/api/invitations/:code）
export const invitationCodeParamSchema = z.object({
  code: z.string().min(1).max(64),
});
