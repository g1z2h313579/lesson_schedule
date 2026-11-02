import { invitationCodeParamSchema } from "@shared/schemas/invitation";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createInvitationService } from "../services/invitation-service";
import type { AppEnv } from "../types";

// 邀请（流程见 docs/implementation-plan.md 阶段 2）
// 查看邀请不要求完成首次设置：从邀请进入的新用户要先看到邀请人，再去做首次设置
export const invitationRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser)
  // 生成邀请码
  .post("/", requireRegistered, async (c) => {
    const invitation = await createInvitationService(c.get("db")).create(
      c.get("currentUser"),
      new Date(),
    );
    return c.json({ invitation });
  })
  // 查看邀请：邀请人资料、当前用户能否接受
  .get("/:code", validate("param", invitationCodeParamSchema), async (c) => {
    const invitation = await createInvitationService(c.get("db")).preview(
      c.get("currentUser"),
      c.req.valid("param").code,
      new Date(),
    );
    return c.json({ invitation });
  })
  // 接受邀请，建立师生关系
  .post(
    "/:code/accept",
    requireRegistered,
    validate("param", invitationCodeParamSchema),
    async (c) => {
      const result = await createInvitationService(c.get("db")).accept(
        c.get("currentUser"),
        c.req.valid("param").code,
        new Date(),
      );
      return c.json(result);
    },
  );
