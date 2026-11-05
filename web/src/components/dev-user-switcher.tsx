import { getMockUserId, MOCK_USERS, setMockUserId } from "@/lib/mock-user";

// 本地开发用：切换模拟用户（只在 LIFF Mock 模式下显示，正式环境不会出现）
// 切换后重新加载页面，让所有数据按新的用户重新获取
export function DevUserSwitcher() {
  return (
    <select
      aria-label="模拟用户"
      className="h-7 rounded-md border bg-card px-1 text-sm text-foreground"
      defaultValue={getMockUserId()}
      onChange={(event) => {
        setMockUserId(event.target.value);
        window.location.reload();
      }}
    >
      {MOCK_USERS.map((user) => (
        <option key={user.id} value={user.id}>
          {user.label}
        </option>
      ))}
    </select>
  );
}
