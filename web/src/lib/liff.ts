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
    liff.login();
  }
}

/** 取得发给后端校验身份用的 ID token */
export function getIdToken(): string | null {
  return liff.getIDToken();
}

export { liff };
