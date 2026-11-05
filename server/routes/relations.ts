import { idParamSchema } from "@shared/schemas/common";
import { createCreditRequestSchema } from "@shared/schemas/credit-request";
import { relationLessonsQuerySchema } from "@shared/schemas/lesson";
import {
  createLessonSchema,
  saveWeeklySchedulesSchema,
  scheduleBoardQuerySchema,
} from "@shared/schemas/schedule";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createCreditService } from "../services/credit-service";
import { createRelationService } from "../services/relation-service";
import { createScheduleService } from "../services/schedule-service";
import type { AppEnv } from "../types";

// 师生关系：列表、详情、课程列表、课时申请、排课
export const relationRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser, requireRegistered)
  // 列表（含统计）：自己参与的关系，管理员为全部
  .get("/", async (c) => {
    const relations = await createRelationService(c.get("db")).list(
      c.get("currentUser"),
      new Date(),
    );
    return c.json({ relations });
  })
  // 详情：双方资料、统计、待处理的课时申请、每周课程的时段
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const relation = await createRelationService(c.get("db")).get(
      c.get("currentUser"),
      c.req.valid("param").id,
      new Date(),
    );
    return c.json({ relation });
  })
  // 课程列表：即将上的课 / 已上的课（分页）
  .get(
    "/:id/lessons",
    validate("param", idParamSchema),
    validate("query", relationLessonsQuerySchema),
    async (c) => {
      const { scope, before } = c.req.valid("query");
      const result = await createRelationService(c.get("db")).listLessons(
        c.get("currentUser"),
        c.req.valid("param").id,
        scope,
        new Date(),
        before,
      );
      return c.json(result);
    },
  )
  // 课时申请记录
  .get("/:id/credit-requests", validate("param", idParamSchema), async (c) => {
    const requests = await createCreditService(c.get("db")).list(
      c.get("currentUser"),
      c.req.valid("param").id,
    );
    return c.json({ requests });
  })
  // 学生申请增加课时
  .post(
    "/:id/credit-requests",
    validate("param", idParamSchema),
    validate("json", createCreditRequestSchema),
    async (c) => {
      const request = await createCreditService(c.get("db")).create(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      return c.json({ request });
    },
  )
  // 排课画面的数据（老师或学生）
  .get(
    "/:id/schedule-board",
    validate("param", idParamSchema),
    validate("query", scheduleBoardQuerySchema),
    async (c) => {
      const board = await createScheduleService(c.get("db")).getBoard(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("query").week,
        new Date(),
      );
      return c.json({ board });
    },
  )
  // 保存每周课程（老师或学生）
  .put(
    "/:id/weekly-schedules",
    validate("param", idParamSchema),
    validate("json", saveWeeklySchedulesSchema),
    async (c) => {
      const result = await createScheduleService(c.get("db")).saveWeekly(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json").slots,
        new Date(),
      );
      return c.json(result);
    },
  )
  // 添加单次课程（老师或学生）
  .post(
    "/:id/lessons",
    validate("param", idParamSchema),
    validate("json", createLessonSchema),
    async (c) => {
      const lesson = await createScheduleService(c.get("db")).addSingleLesson(
        c.get("currentUser"),
        c.req.valid("param").id,
        new Date(c.req.valid("json").startsAt),
        new Date(),
      );
      return c.json({ lesson });
    },
  );
