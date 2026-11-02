import { CalendarDays, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { cn } from "@/lib/utils";

// 底部标签栏：「课程表」和「老师」/「学生」（管理员为「全部」）
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
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 py-2 text-base",
              isActive ? "font-bold text-foreground" : "text-muted-foreground",
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
