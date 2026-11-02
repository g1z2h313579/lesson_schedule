import type { UserRole } from "@shared/constants/user";
import { isLiffMock, liff } from "@/lib/liff";

type ShareMessages = Parameters<typeof liff.shareTargetPicker>[0];

// 发送邀请的结果：已发送 / 关闭了选择画面 / 无法使用好友选择画面（需要复制链接手动发送）
export type ShareResult =
  | { type: "sent" }
  | { type: "cancelled" }
  | { type: "fallback"; url: string };

/**
 * 邀请链接：MINI App 的永久链接（https://miniapp.line.me/<LIFF ID>/invite/<邀请码>），
 * 对方点开后会打开 MINI App 的 /invite/<邀请码> 页面。本地 Mock 模式下为本地地址。
 */
async function buildInviteUrl(code: string): Promise<string> {
  const path = `${window.location.origin}/invite/${encodeURIComponent(code)}`;
  return isLiffMock ? path : liff.permanentLink.createUrlBy(path);
}

/**
 * 邀请卡片（Flex Message）：对方的界面语言未知，所以日中双语。
 * 通过好友选择画面发送的卡片，按钮只能使用 URI 动作。
 */
function buildInviteMessages(
  url: string,
  inviterName: string,
  inviterRole: UserRole,
): ShareMessages {
  const japanese =
    inviterRole === "teacher"
      ? `${inviterName} 先生から招待が届きました`
      : `${inviterName} さんから招待が届きました`;
  const chinese =
    inviterRole === "teacher"
      ? `${inviterName} 老师邀请你使用课程管理`
      : `${inviterName} 邀请你使用课程管理`;
  return [
    {
      type: "flex",
      altText: "レッスン管理への招待 / 课程管理的邀请",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "レッスン管理 / 课程管理", size: "sm", color: "#888888" },
            { type: "text", text: japanese, weight: "bold", size: "lg", wrap: true },
            { type: "text", text: chinese, wrap: true, color: "#555555" },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: { type: "uri", label: "招待を見る / 查看邀请", uri: url },
            },
          ],
        },
      },
    },
  ];
}

/**
 * 用 LINE 的好友选择画面发送邀请（每次只发给 1 位好友）。
 * 无法使用好友选择画面时（外部浏览器、本地 Mock、对方的设置等），返回邀请链接，由用户复制后手动发送。
 */
export async function shareInvitation(
  code: string,
  inviterName: string,
  inviterRole: UserRole,
): Promise<ShareResult> {
  const url = await buildInviteUrl(code);
  if (isLiffMock || !liff.isApiAvailable("shareTargetPicker")) {
    return { type: "fallback", url };
  }
  const result = await liff.shareTargetPicker(buildInviteMessages(url, inviterName, inviterRole), {
    isMultiple: false,
  });
  return result ? { type: "sent" } : { type: "cancelled" };
}
