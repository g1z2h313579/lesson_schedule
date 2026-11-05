import { CalendarDays, Settings, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { cn } from "@/lib/utils";

// 显示底部标签栏的页面（其他页面有返回按钮，不显示标签栏，画面更宽敞）
export const TAB_PATHS = ["/", "/members", "/settings"];

// 底部标签栏：「课程表」「老师」/「学生」（管理员为「全部」）「设置」
export function BottomNav() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const membersLabel = me.isAdmin
    ? t("nav.all")
    : me.role === "teacher"
      ? t("nav.students")
      : t("nav.teachers");
  const items = [
    { to: "/", label: t("nav.schedule"), Icon: CalendarDays },
    { to: "/members", label: membersLabel, Icon: Users },
    { to: "/settings", label: t("settings.title"), Icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-sm transition-colors",
              isActive ? "font-bold text-primary" : "text-muted-foreground",
            )
          }
        >
          <Icon className="size-6" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
