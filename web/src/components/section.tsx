import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// 页面中的一块内容：上方是灰色小标题（右边可以放操作），下方是内容
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {(title || action) && (
        <div className="flex min-h-7 items-end justify-between gap-2 px-1">
          {title && <h2 className="text-base font-bold text-muted-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// 白色圆角卡片（浅灰的页面底色上，用它把内容分组）
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-card p-4", className)} {...props} />;
}

// 白色卡片中的列表：每一项之间有分隔线（列表项自己设置内边距）
export function ListGroup({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul className={cn("divide-y overflow-hidden rounded-2xl bg-card", className)} {...props} />
  );
}

// 没有内容时的提示（放在白色卡片中）
export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <Panel className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span>{text}</span>
    </Panel>
  );
}
