import { INVITATION_VALID_DAYS, type InvitationStatus } from "@shared/constants/invitation";
import type { Database } from "../db/client";
import type { Invitation, User } from "../db/schema";
import { isRegistered, type RegisteredUser } from "../lib/access";
import { ApiError } from "../lib/errors";
import { toProfile } from "../lib/serializers";
import { createInvitationRepository } from "../repositories/invitation-repository";
import { createRelationRepository } from "../repositories/relation-repository";
import { createUserRepository } from "../repositories/user-repository";
import type { Notifier } from "./notifier";

// 不能接受邀请时的状态 → 错误码
const STATUS_ERRORS = {
  expired: "INVITATION_EXPIRED",
  used: "INVITATION_USED",
  self: "INVITATION_SELF",
  same_role: "INVITATION_SAME_ROLE",
  already_linked: "ALREADY_LINKED",
} as const;

/** 随机生成 22 位的邀请码（128 位随机数，base64url 编码，无法猜到） */
function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 邀请：生成邀请码、查看邀请、接受邀请（建立师生关系）
export function createInvitationService(db: Database, notifier: Notifier) {
  const invitationRepository = createInvitationRepository(db);
  const relationRepository = createRelationRepository(db);
  const userRepository = createUserRepository(db);

  // 邀请人和被邀请人分别是老师还是学生（邀请人是老师时，被邀请人是学生，反之亦然）
  function pairOf(inviter: RegisteredUser, invitee: User) {
    return inviter.role === "teacher"
      ? { teacherId: inviter.id, studentId: invitee.id }
      : { teacherId: invitee.id, studentId: inviter.id };
  }

  // 取得邀请和邀请人；邀请码不存在时返回 404
  async function load(code: string) {
    const invitation = await invitationRepository.findByCode(code);
    const inviter = invitation && (await userRepository.findById(invitation.inviterId));
    if (!invitation || !inviter || !isRegistered(inviter)) {
      throw new ApiError(404, "NOT_FOUND", "邀请不存在");
    }
    return { invitation, inviter };
  }

  // 这个用户现在能否接受这个邀请（未完成首次设置时，不检查身份和是否已关联）
  async function evaluate(
    invitation: Invitation,
    inviter: RegisteredUser,
    user: User,
    now: Date,
  ): Promise<InvitationStatus> {
    if (inviter.id === user.id) return "self";
    if (invitation.acceptedById !== null) return "used";
    if (invitation.expiresAt <= now) return "expired";
    if (!isRegistered(user)) return "valid";
    if (user.role === inviter.role) return "same_role";
    const { teacherId, studentId } = pairOf(inviter, user);
    if (await relationRepository.findByPair(teacherId, studentId)) return "already_linked";
    return "valid";
  }

  return {
    /** 生成邀请码（7 天内有效，只能使用 1 次） */
    async create(user: User, now: Date) {
      const invitation = await invitationRepository.create({
        code: generateCode(),
        inviterId: user.id,
        expiresAt: new Date(now.getTime() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000),
      });
      return { code: invitation.code, expiresAt: invitation.expiresAt };
    },

    /** 查看邀请：邀请人资料和当前用户能否接受（未完成首次设置的用户也能查看） */
    async preview(user: User, code: string, now: Date) {
      const { invitation, inviter } = await load(code);
      return {
        inviter: toProfile(inviter),
        status: await evaluate(invitation, inviter, user, now),
        expiresAt: invitation.expiresAt,
      };
    },

    /** 接受邀请：建立师生关系，返回关系 id */
    async accept(user: User, code: string, now: Date) {
      if (!isRegistered(user)) throw new ApiError(403, "NOT_REGISTERED", "未完成首次设置");
      const { invitation, inviter } = await load(code);
      const status = await evaluate(invitation, inviter, user, now);
      if (status !== "valid") {
        throw new ApiError(409, STATUS_ERRORS[status], `不能接受这个邀请（${status}）`);
      }

      // 先把邀请标记为已使用（只有一人能成功），再建立关系
      if (!(await invitationRepository.markAccepted(invitation.id, user.id, now))) {
        throw new ApiError(409, "INVITATION_USED", "邀请已被使用");
      }
      const { teacherId, studentId } = pairOf(inviter, user);
      const relation =
        (await relationRepository.create(teacherId, studentId)) ??
        (await relationRepository.findByPair(teacherId, studentId));
      if (!relation) throw new Error("师生关系写入失败");
      await notifier.relationChanged(relation, user);
      return { relationId: relation.id };
    },
  };
}
