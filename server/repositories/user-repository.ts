import type { UserRole } from "@shared/constants/user";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { type User, users } from "../db/schema";
import type { LineUser } from "../lib/line/id-token";

// 用户表的数据访问（只负责读写数据库，不包含业务判断）
export function createUserRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.users.findFirst({ where: eq(users.id, id) });
    },

    findByLineUserId(lineUserId: string) {
      return db.query.users.findFirst({ where: eq(users.lineUserId, lineUserId) });
    },

    // 一次取得多个用户，返回 id → 用户 的 Map
    async findByIds(ids: number[]) {
      if (ids.length === 0) return new Map<number, User>();
      const rows = await db
        .select()
        .from(users)
        .where(inArray(users.id, [...new Set(ids)]));
      return new Map(rows.map((user) => [user.id, user]));
    },

    // 按 LINE userId 新增或更新用户（LINE 昵称、头像以 LINE 上的最新信息为准）
    // 只同步 LINE 的信息，不改动用户在首次设置时填写的名字
    // 取不到昵称时（用户未同意 profile 权限），新用户的昵称存为空字符串，已有用户保留原来的昵称和头像
    async upsertFromLine(lineUser: LineUser) {
      const profile =
        lineUser.displayName === null
          ? null
          : { lineDisplayName: lineUser.displayName, pictureUrl: lineUser.pictureUrl };

      const [user] = await db
        .insert(users)
        .values({
          lineUserId: lineUser.userId,
          lineDisplayName: profile?.lineDisplayName ?? "",
          pictureUrl: profile?.pictureUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.lineUserId,
          set: { ...profile, updatedAt: new Date() },
        })
        .returning();

      if (!user) {
        throw new Error("用户写入失败");
      }
      return user;
    },

    // 首次设置：只在身份还为空时写入（防止重复提交时覆盖），已设置过时返回 undefined
    async register(
      id: number,
      values: { role: UserRole; name: string; introduction: string | null },
    ) {
      const [user] = await db
        .update(users)
        .set(values)
        .where(and(eq(users.id, id), isNull(users.role)))
        .returning();
      return user;
    },

    // 修改名字、自我介绍
    async updateProfile(id: number, values: { name: string; introduction: string | null }) {
      const [user] = await db.update(users).set(values).where(eq(users.id, id)).returning();
      if (!user) {
        throw new Error("用户更新失败");
      }
      return user;
    },
  };
}
