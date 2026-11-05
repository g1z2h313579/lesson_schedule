import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  // 传入时左边显示返回按钮（没有上一页时去这个地址）
  back?: string;
  // 右边的操作（语言切换等）
  right?: ReactNode;
};

// 页面顶部栏，固定在画面顶部
// 有返回按钮的页面：标题居中（手机应用常见的样式）；底部标签栏中的页面：大标题靠左
export function PageHeader({ title, back, right }: Props) {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div
        className={cn(
          "grid min-h-14 items-center gap-1 px-1",
          back ? "grid-cols-[3rem_minmax(0,1fr)_3rem]" : "grid-cols-[minmax(0,1fr)_auto] px-4",
        )}
      >
        {back && <BackButton fallback={back} />}
        <h1 className={cn("truncate font-bold", back ? "text-center text-lg" : "text-2xl")}>
          {title}
        </h1>
        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  );
}
