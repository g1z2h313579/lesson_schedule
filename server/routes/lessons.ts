import { idParamSchema } from "@shared/schemas/common";
import {
  cancelLessonSchema,
  createMessageSchema,
  lessonRangeQuerySchema,
  rescheduleLessonSchema,
} from "@shared/schemas/lesson";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createLessonService } from "../services/lesson-service";
import { createMessageService } from "../services/message-service";
import type { AppEnv } from "../types";

// 课程：课程表、课程详情、请假、取消、改时间、留言板
export const lessonRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser, requireRegistered)
  // 课程表：from ～ to 之间的课
  .get("/", validate("query", lessonRangeQuerySchema), async (c) => {
    const { from, to } = c.req.valid("query");
    const lessons = await createLessonService(c.get("db")).listInRange(
      c.get("currentUser"),
      new Date(from),
      new Date(to),
    );
    return c.json({ lessons });
  })
  // 课程详情
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const detail = await createLessonService(c.get("db")).get(
      c.get("currentUser"),
      c.req.valid("param").id,
      new Date(),
    );
    return c.json(detail);
  })
  // 学生请假
  .post(
    "/:id/leave",
    validate("param", idParamSchema),
    validate("json", cancelLessonSchema),
    async (c) => {
      await createLessonService(c.get("db")).leave(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json").reason ?? null,
        new Date(),
      );
      return c.json({ ok: true as const });
    },
  )
  // 老师取消
  .post(
    "/:id/cancel",
    validate("param", idParamSchema),
    validate("json", cancelLessonSchema),
    async (c) => {
      await createLessonService(c.get("db")).cancel(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json").reason ?? null,
        new Date(),
      );
      return c.json({ ok: true as const });
    },
  )
  // 老师改时间
  .post(
    "/:id/reschedule",
    validate("param", idParamSchema),
    validate("json", rescheduleLessonSchema),
    async (c) => {
      const { startsAt, reason } = c.req.valid("json");
      const lesson = await createLessonService(c.get("db")).reschedule(
        c.get("currentUser"),
        c.req.valid("param").id,
        new Date(startsAt),
        reason ?? null,
        new Date(),
      );
      return c.json({ lesson });
    },
  )
  // 留言列表
  .get("/:id/messages", validate("param", idParamSchema), async (c) => {
    const messages = await createMessageService(c.get("db")).list(
      c.get("currentUser"),
      c.req.valid("param").id,
    );
    return c.json({ messages });
  })
  // 发留言
  .post(
    "/:id/messages",
    validate("param", idParamSchema),
    validate("json", createMessageSchema),
    async (c) => {
      const message = await createMessageService(c.get("db")).create(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json").body,
      );
      return c.json({ message });
    },
  );
