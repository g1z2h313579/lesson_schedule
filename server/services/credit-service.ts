import type { CreateCreditRequestValues } from "@shared/schemas/credit-request";
import type { Database } from "../db/client";
import type { User } from "../db/schema";
import { ApiError } from "../lib/errors";
import { toCreditRequest } from "../lib/serializers";
import { createCreditRequestRepository } from "../repositories/credit-request-repository";
import type { Notifier } from "./notifier";
import {
  assertRelationStudent,
  assertRelationTeacher,
  getViewableRelation,
} from "./relation-access";
import { createScheduleService } from "./schedule-service";

// 课时申请：学生申请增加课时，老师确认或拒绝，学生可以在处理前撤回
export function createCreditService(db: Database, notifier: Notifier) {
  const creditRequestRepository = createCreditRequestRepository(db);

  // 取得申请和所属的师生关系（看不到时返回 404）
  async function load(user: User, requestId: number) {
    const request = await creditRequestRepository.findById(requestId);
    if (!request) throw new ApiError(404, "NOT_FOUND", "课时申请不存在");
    const relation = await getViewableRelation(db, user, request.teacherStudentId);
    return { request, relation };
  }

  // 更新为已处理；已被处理时报错
  async function decide(
    requestId: number,
    values: Parameters<typeof creditRequestRepository.decide>[1],
  ) {
    const decided = await creditRequestRepository.decide(requestId, values);
    if (!decided) throw new ApiError(409, "REQUEST_ALREADY_DECIDED", "申请已被处理");
    return toCreditRequest(decided);
  }

  return {
    /** 申请记录（新的在前） */
    async list(user: User, relationId: number) {
      const relation = await getViewableRelation(db, user, relationId);
      const requests = await creditRequestRepository.listByRelation(relation.id);
      return requests.map(toCreditRequest);
    },

    /** 学生申请增加课时（同时只能有 1 个待处理的申请） */
    async create(user: User, relationId: number, values: CreateCreditRequestValues) {
      const relation = await getViewableRelation(db, user, relationId);
      assertRelationStudent(user, relation);
      if (await creditRequestRepository.findPending(relation.id)) {
        throw new ApiError(409, "CREDIT_REQUEST_PENDING", "已有待处理的课时申请");
      }
      const request = await creditRequestRepository.create({
        teacherStudentId: relation.id,
        amount: values.amount,
        note: values.note ?? null,
      });
      await notifier.relationChanged(relation, user);
      return toCreditRequest(request);
    },

    /** 老师确认：总课时增加，并补排本月因课时不足而没排上的每周课程 */
    async approve(user: User, requestId: number, now: Date) {
      const { relation } = await load(user, requestId);
      assertRelationTeacher(user, relation);
      const request = await decide(requestId, { status: "approved", decidedAt: now });
      const createdLessons = await createScheduleService(db, notifier).fillRelation(relation, now);
      await notifier.relationChanged(relation, user);
      return { request, createdLessons };
    },

    /** 老师拒绝（可附理由） */
    async reject(user: User, requestId: number, reason: string | null, now: Date) {
      const { relation } = await load(user, requestId);
      assertRelationTeacher(user, relation);
      const request = await decide(requestId, {
        status: "rejected",
        rejectReason: reason,
        decidedAt: now,
      });
      await notifier.relationChanged(relation, user);
      return request;
    },

    /** 学生撤回 */
    async withdraw(user: User, requestId: number, now: Date) {
      const { relation } = await load(user, requestId);
      assertRelationStudent(user, relation);
      const request = await decide(requestId, { status: "withdrawn", decidedAt: now });
      await notifier.relationChanged(relation, user);
      return request;
    },
  };
}
