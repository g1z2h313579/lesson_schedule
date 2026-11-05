import { createDb } from "../db/client";
import { createImageService } from "../services/image-service";
import { createNotifier } from "../services/notifier";
import { createScheduleService } from "../services/schedule-service";

// 每天的定时任务：UTC 15:00 = 日本时间每天 0:00（需与 wrangler.jsonc 的 triggers.crons 一致）
// 按每周课程补排课程，并清理没发出去的图片
export const FILL_WEEKLY_LESSONS_CRON = "0 15 * * *";

// 定时任务入口：按 cron 表达式分发到具体的任务
// cron 需要同时在 wrangler.jsonc 的 triggers.crons 中声明（时间为 UTC）
export async function runScheduledJobs(controller: ScheduledController, env: Env): Promise<void> {
  switch (controller.cron) {
    case FILL_WEEKLY_LESSONS_CRON: {
      // 以预定的执行时间为准（实际执行稍有延迟时，月末的判断也不会出错）
      const now = new Date(controller.scheduledTime);
      const db = createDb(env.DB);
      const notifier = createNotifier(db, env.NOTIFICATION_HUB);
      const created = await createScheduleService(db, notifier).fillAll(now);
      console.log(`[scheduled] 每周课程补齐完成，新排 ${created} 节`);
      // 顺便清理上传了但没发出去的图片
      const deleted = await createImageService(db, env.IMAGES).cleanupOrphans(now);
      console.log(`[scheduled] 清理没发出去的图片 ${deleted} 张`);
      break;
    }
    default:
      console.warn(`[scheduled] 没有对应处理的 cron：${controller.cron}`);
  }
}
