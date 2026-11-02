import liff from "@line/liff";
import type { LiffMockConfig } from "@line/liff-mock";

// 只有本地开发（pnpm dev）且 VITE_LIFF_MOCK=true 时才使用 LIFF Mock，生产构建中一定不会启用
export const isLiffMock = import.meta.env.DEV && import.meta.env.VITE_LIFF_MOCK === "true";

// ID token 发行后 1 小时过期。提前 5 分钟视为过期，避免请求途中失效
const ID_TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;
// 两次重新登录的最短间隔（防止设备时间不准等原因导致反复跳转）
const RELOGIN_INTERVAL_MS = 5 * 60 * 1000;
const RELOGIN_AT_STORAGE_KEY = "app.liff.reloginAt";

// 页面即将跳转时使用：返回一个永远不会完成的 Promise，让后续处理（渲染、请求）停在原地
function waitForNavigation(): Promise<never> {
  return new Promise<never>(() => {});
}

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

  if (isLiffMock) {
    // LIFF Mock：liff.login() 只记录「已登录」（之后才能调用 shareTargetPicker 等），不会跳转页面，直接继续
    liff.login();
    return;
  }

  if (!liff.isLoggedIn()) {
    // 外部浏览器：跳转到 LINE 登录页，登录后会回到本页面重新初始化
    liff.login();
    return waitForNavigation();
  }

  // 上次留下的 ID token 已过期（外部浏览器再次打开等）：先重新登录
  if (isIdTokenExpired() && (await relogin())) {
    return waitForNavigation();
  }

  // 页面长时间开着不关、回到前台时 ID token 可能已过期：在用户操作之前就重新登录
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isIdTokenExpired()) {
      void relogin();
    }
  });

  await requestProfilePermission();
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

function isIdTokenExpired(): boolean {
  const exp = liff.getDecodedIDToken()?.exp;
  return exp === undefined || exp * 1000 - ID_TOKEN_EXPIRY_MARGIN_MS < Date.now();
}

/**
 * 重新登录以取得新的 ID token（liff.init() 和重新加载页面都不会更新已过期的 token）。
 * - 在 LINE 中：清除旧 token 后重新打开当前页面的 MINI App 网址，LINE 会传入新的 token
 * - 外部浏览器：清除旧 token 后跳转到 LINE 登录页
 * 返回 true 表示页面即将跳转；最近刚重新登录过或出错时返回 false。
 */
async function relogin(): Promise<boolean> {
  if (!markRelogin()) {
    return false;
  }

  try {
    if (liff.isInClient()) {
      // 形如 https://miniapp.line.me/<LIFF ID>/<路径>，需在 logout 之前取得
      const url = await liff.permanentLink.createUrlBy(window.location.href);
      liff.logout();
      window.location.href = url;
    } else {
      liff.logout();
      liff.login({ redirectUri: window.location.href });
    }
    return true;
  } catch (error) {
    console.warn("[LIFF] 重新登录失败", error);
    return false;
  }
}

// 记录本次重新登录的时间。最近已重新登录过、或无法记录时返回 false（避免无限跳转）
function markRelogin(): boolean {
  try {
    const last = Number(localStorage.getItem(RELOGIN_AT_STORAGE_KEY) ?? 0);
    if (Date.now() - last < RELOGIN_INTERVAL_MS) {
      return false;
    }
    localStorage.setItem(RELOGIN_AT_STORAGE_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * 取得发给后端校验身份用的 ID token。
 * 已过期时先重新登录（页面会跳转，本次请求不再发出）。
 */
export async function getIdToken(): Promise<string | null> {
  if (!isLiffMock && isIdTokenExpired() && (await relogin())) {
    return waitForNavigation();
  }
  return liff.getIDToken();
}

/** 取得 access token（后端用来获取 LINE 昵称和头像，本地 Mock 模式下不使用） */
export function getAccessToken(): string | null {
  return isLiffMock ? null : liff.getAccessToken();
}

export { liff };
