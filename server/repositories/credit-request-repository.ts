import { and, desc, eq, inArray, sum } from "drizzle-orm";
import type { Database } from "../db/client";
import { type CreditRequest, creditRequests, type NewCreditRequest } from "../db/schema";

// 课时申请表的数据访问
export function createCreditRequestRepository(db: Database) {
  return {
    async create(values: NewCreditRequest) {
      const [request] = await db.insert(creditRequests).values(values).returning();
      if (!request) throw new Error("课时申请写入失败");
      return request;
    },

    findById(id: number) {
      return db.query.creditRequests.findFirst({ where: eq(creditRequests.id, id) });
    },

    // 申请记录（新的在前）
    listByRelation(relationId: number) {
      return db
        .select()
        .from(creditRequests)
        .where(eq(creditRequests.teacherStudentId, relationId))
        .orderBy(desc(creditRequests.createdAt), desc(creditRequests.id));
    },

    findPending(relationId: number) {
      return db.query.creditRequests.findFirst({
        where: and(
          eq(creditRequests.teacherStudentId, relationId),
          eq(creditRequests.status, "pending"),
        ),
      });
    },

    // 有待处理申请的关系 id
    async pendingRelationIds(relationIds: number[]) {
      if (relationIds.length === 0) return new Set<number>();
      const rows = await db
        .select({ relationId: creditRequests.teacherStudentId })
        .from(creditRequests)
        .where(
          and(
            inArray(creditRequests.teacherStudentId, relationIds),
            eq(creditRequests.status, "pending"),
          ),
        );
      return new Set(rows.map((row) => row.relationId));
    },

    // 各关系的总课时（已确认申请的课时之和），返回 关系 id → 总课时 的 Map
    async approvedTotals(relationIds: number[]) {
      if (relationIds.length === 0) return new Map<number, number>();
      const rows = await db
        .select({ relationId: creditRequests.teacherStudentId, total: sum(creditRequests.amount) })
        .from(creditRequests)
        .where(
          and(
            inArray(creditRequests.teacherStudentId, relationIds),
            eq(creditRequests.status, "approved"),
          ),
        )
        .groupBy(creditRequests.teacherStudentId);
      return new Map(rows.map((row) => [row.relationId, Number(row.total ?? 0)]));
    },

    // 处理申请（确认 / 拒绝 / 撤回）：只在还是待处理时更新，已被处理时返回 undefined
    async decide(
      id: number,
      values: Pick<CreditRequest, "status" | "decidedAt"> & { rejectReason?: string | null },
    ) {
      const [request] = await db
        .update(creditRequests)
        .set(values)
        .where(and(eq(creditRequests.id, id), eq(creditRequests.status, "pending")))
        .returning();
      return request;
    },
  };
}
