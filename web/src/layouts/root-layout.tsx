import { Outlet } from "react-router";
import { DevUserSwitcher } from "@/components/dev-user-switcher";
import { isLiffMock } from "@/lib/liff";

// 所有页面共用的布局。顶部栏由各页面自己显示（PageHeader），标题和返回按钮随页面变化
export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* 本地开发时才显示：切换模拟用户 */}
      {isLiffMock && (
        <div className="flex items-center justify-end gap-2 bg-warning px-4 py-1 text-sm text-warning-foreground">
          开发用
          <DevUserSwitcher />
        </div>
      )}
      <main className="flex flex-1 flex-col px-4 pb-6">
        <Outlet />
      </main>
    </div>
  );
}
