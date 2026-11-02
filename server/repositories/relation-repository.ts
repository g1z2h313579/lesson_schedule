import { and, eq, or } from "drizzle-orm";
import type { Database } from "../db/client";
import { teacherStudents } from "../db/schema";

// 师生关系表的数据访问
export function createRelationRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.teacherStudents.findFirst({ where: eq(teacherStudents.id, id) });
    },

    findByPair(teacherId: number, studentId: number) {
      return db.query.teacherStudents.findFirst({
        where: and(
          eq(teacherStudents.teacherId, teacherId),
          eq(teacherStudents.studentId, studentId),
        ),
      });
    },

    // userId 参与的所有关系；传 null 时返回全部（管理员用）
    list(userId: number | null) {
      return db
        .select()
        .from(teacherStudents)
        .where(
          userId === null
            ? undefined
            : or(eq(teacherStudents.teacherId, userId), eq(teacherStudents.studentId, userId)),
        )
        .orderBy(teacherStudents.id);
    },

    // 新建关系（已存在时不新建，返回 undefined）
    async create(teacherId: number, studentId: number) {
      const [relation] = await db
        .insert(teacherStudents)
        .values({ teacherId, studentId })
        .onConflictDoNothing()
        .returning();
      return relation;
    },
  };
}
