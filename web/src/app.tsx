import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";

// 应用根组件：挂载全局 Provider 和路由
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* 操作成功等的提示（显示在画面上方，字大一些） */}
      <Toaster position="top-center" richColors toastOptions={{ className: "text-base" }} />
    </QueryClientProvider>
  );
}
