import type { Database } from "../db/client";
import { createCreditRequestRepository } from "../repositories/credit-request-repository";
import { createLessonRepository } from "../repositories/lesson-repository";

/**
 * 剩余课时 = 总课时（已确认申请之和）− 已排好的课（含已上，不含已取消）。
 * 课排好时就扣除，取消后自动返还（统计值不保存，每次计算）。
 */
export async function getRemainingCredits(db: Database, relationId: number): Promise<number> {
  const [totals, counts] = await Promise.all([
    createCreditRequestRepository(db).approvedTotals([relationId]),
    createLessonRepository(db).countsByRelations([relationId], new Date()),
  ]);
  return (totals.get(relationId) ?? 0) - (counts.get(relationId)?.scheduled ?? 0);
}
