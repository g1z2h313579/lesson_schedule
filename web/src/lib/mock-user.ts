// 本地开发（LIFF Mock）时可以切换的模拟用户，只在本地开发时使用
// 与 scripts/seed-local.sql 中的测试数据对应；U_mock_new 不在测试数据中，用来测试首次设置
export const MOCK_USERS = [
  { id: "U_mock_teacher", label: "模拟老师" },
  { id: "U_mock_student", label: "模拟学生 A" },
  { id: "U_mock_student2", label: "模拟学生 B" },
  { id: "U_mock_admin", label: "模拟管理员（学生）" },
  { id: "U_mock_new", label: "新用户（未注册）" },
] as const;

const STORAGE_KEY = "app.mockUserId";

/** 当前的模拟用户：页面上切换过的优先，其次为 .env.development 中的 VITE_MOCK_USER_ID */
export function getMockUserId(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? import.meta.env.VITE_MOCK_USER_ID;
  } catch {
    return import.meta.env.VITE_MOCK_USER_ID;
  }
}

export function setMockUserId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 无法使用 localStorage 时不保存（只在本地开发时使用，不影响正式环境）
  }
}
