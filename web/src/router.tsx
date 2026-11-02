import { createBrowserRouter } from "react-router";
import { RequireRegistered } from "@/layouts/require-registered";
import { RootLayout } from "@/layouts/root-layout";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { SettingsPage } from "@/pages/settings-page";

// 路由表：新增页面时，在 pages/ 下新建组件，再在 children 中追加一项
// 需要已完成首次设置的页面，放在 RequireRegistered 的 children 中
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // 首次设置：未完成首次设置的用户会被跳转到这里
      { path: "onboarding", element: <OnboardingPage /> },
      {
        element: <RequireRegistered />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
