// 定时任务入口：按 cron 表达式分发到具体的任务
// cron 需要同时在 wrangler.jsonc 的 triggers.crons 中声明（时间为 UTC）
export async function runScheduledJobs(controller: ScheduledController, _env: Env): Promise<void> {
  switch (controller.cron) {
    // 示例：每小时检查一次即将开始的课程并推送提醒
    // case "0 * * * *":
    //   await sendLessonReminders(env);
    //   break;
    default:
      console.warn(`[scheduled] 没有对应处理的 cron：${controller.cron}`);
  }
}
