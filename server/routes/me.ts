import { LINE_ACCESS_TOKEN_HEADER } from "@shared/constants/headers";
import { registrationSchema, updateProfileSchema } from "@shared/schemas/me";
import { Hono } from "hono";
import { toMe } from "../lib/serializers";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createUserService } from "../services/user-service";
import type { AppEnv } from "../types";

// 当前登录用户。三个接口都返回 { user }（格式相同，前端可以直接更新缓存）
export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  // 校验 LINE 登录 → 同步到数据库（LINE 昵称、头像）→ 返回用户信息
  // 前端启动时一定先调用这个接口，用户记录在这里创建
  .get("/", async (c) => {
    const user = await createUserService(c.get("db")).syncLineUser(
      c.get("lineUser"),
      c.req.header(LINE_ACCESS_TOKEN_HEADER),
    );
    return c.json({ user: toMe(user) });
  })
  // 首次设置：选择身份、填写名字和自我介绍（只能执行一次）
  .post("/registration", loadCurrentUser, validate("json", registrationSchema), async (c) => {
    const user = await createUserService(c.get("db")).register(
      c.get("currentUser"),
      c.req.valid("json"),
    );
    return c.json({ user: toMe(user) });
  })
  // 修改名字、自我介绍
  .patch(
    "/",
    loadCurrentUser,
    requireRegistered,
    validate("json", updateProfileSchema),
    async (c) => {
      const user = await createUserService(c.get("db")).updateProfile(
        c.get("currentUser"),
        c.req.valid("json"),
      );
      return c.json({ user: toMe(user) });
    },
  );
