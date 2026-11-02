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
import { createImageService } from "../services/image-service";
import { createLessonService } from "../services/lesson-service";
import { createMessageService } from "../services/message-service";
import type { AppEnv } from "../types";

// 课程：课程表、课程详情、请假、取消、改时间、留言板（含图片上传）
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
    const messages = await createMessageService(c.get("db"), c.env.IMAGES).list(
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
      const message = await createMessageService(c.get("db"), c.env.IMAGES).create(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json({ message });
    },
  )
  // 上传 1 张留言图片：请求体就是图片本身（不用 multipart 表单），直接流式写入 R2
  // 免费计划每个请求只有 10 毫秒 CPU 时间，解析多张图片的表单可能超时
  .post("/:id/images", validate("param", idParamSchema), async (c) => {
    const result = await createImageService(c.get("db"), c.env.IMAGES).upload(
      c.get("currentUser"),
      c.req.valid("param").id,
      {
        body: c.req.raw.body,
        contentType: c.req.header("Content-Type") ?? "",
        contentLength: Number(c.req.header("Content-Length") ?? 0),
      },
    );
    return c.json(result);
  });
