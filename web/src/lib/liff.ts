import liff from "@line/liff";
import type { LiffMockConfig } from "@line/liff-mock";

// 只有本地开发（pnpm dev）且 VITE_LIFF_MOCK=true 时才使用 LIFF Mock，生产构建中一定不会启用
export const isLiffMock = import.meta.env.DEV && import.meta.env.VITE_LIFF_MOCK === "true";

/**
 * 初始化 LIFF（必须在渲染页面之前完成）。
 * - 在 LINE 中打开：自动登录
 * - 在外部浏览器打开：跳转到 LINE 登录页
 * - 本地 Mock 模式：不需要 LINE，直接以模拟用户登录
 */
export async function initLiff(): Promise<void> {
  if (isLiffMock) {
    // 动态加载，避免把 Mock 代码打包进生产环境
    const { LiffMockPlugin } = await import("@line/liff-mock");
    liff.use(new LiffMockPlugin());
    // LIFF 自带的类型里没有 mock 选项，这里补上 LIFF Mock 的配置类型
    const mockConfig: Parameters<typeof liff.init>[0] & LiffMockConfig = {
      liffId: import.meta.env.VITE_LIFF_ID || "mock-liff-id",
      mock: true,
    };
    await liff.init(mockConfig);
  } else {
    if (!import.meta.env.VITE_LIFF_ID) {
      throw new Error("未设置 VITE_LIFF_ID");
    }
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
  }

  if (!liff.isLoggedIn()) {
    // 外部浏览器：跳转到 LINE 登录页，登录后会回到本页面重新初始化
    liff.login();
    return;
  }

  if (!isLiffMock) {
    await requestProfilePermission();
  }
}

/**
 * MINI App 首次打开时只授权了 openid（渠道同意简化），取不到 LINE 昵称和头像。
 * 未同意 profile 权限时显示 LINE 的验证画面，请用户同意。
 * 用户拒绝或环境不支持（外部浏览器等）时不影响使用，只是显示不了名字。
 */
async function requestProfilePermission(): Promise<void> {
  try {
    const { state } = await liff.permission.query("profile");
    if (state === "prompt") {
      await liff.permission.requestAll();
    }
  } catch (error) {
    console.warn("[LIFF] 未能取得 profile 权限", error);
  }
}

/** 取得发给后端校验身份用的 ID token */
export function getIdToken(): string | null {
  return liff.getIDToken();
}

/** 取得 access token（后端用来获取 LINE 昵称和头像，本地 Mock 模式下不使用） */
export function getAccessToken(): string | null {
  return isLiffMock ? null : liff.getAccessToken();
}

export { liff };
