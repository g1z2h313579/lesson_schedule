import { createDb } from "../db/client";
import { createScheduleService } from "../services/schedule-service";

// 按每周课程补排课程的 cron：UTC 15:00 = 日本时间每天 0:00（需与 wrangler.jsonc 的 triggers.crons 一致）
export const FILL_WEEKLY_LESSONS_CRON = "0 15 * * *";

// 定时任务入口：按 cron 表达式分发到具体的任务
// cron 需要同时在 wrangler.jsonc 的 triggers.crons 中声明（时间为 UTC）
export async function runScheduledJobs(controller: ScheduledController, env: Env): Promise<void> {
  switch (controller.cron) {
    case FILL_WEEKLY_LESSONS_CRON: {
      // 以预定的执行时间为准（实际执行稍有延迟时，月末的判断也不会出错）
      const created = await createScheduleService(createDb(env.DB)).fillAll(
        new Date(controller.scheduledTime),
      );
      console.log(`[scheduled] 每周课程补齐完成，新排 ${created} 节`);
      break;
    }
    default:
      console.warn(`[scheduled] 没有对应处理的 cron：${controller.cron}`);
  }
}
