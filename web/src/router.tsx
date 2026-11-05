import { createBrowserRouter } from "react-router";
import { RequireRegistered } from "@/layouts/require-registered";
import { RootLayout } from "@/layouts/root-layout";
import { HomePage } from "@/pages/home-page";
import { InvitePage } from "@/pages/invite-page";
import { LessonPage } from "@/pages/lesson-page";
import { MembersPage } from "@/pages/members-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { RelationPage } from "@/pages/relation-page";
import { ReschedulePage } from "@/pages/reschedule-page";
import { SchedulePage } from "@/pages/schedule-page";
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
      // 邀请确认：未完成首次设置的用户也能打开
      { path: "invite/:code", element: <InvitePage /> },
      {
        element: <RequireRegistered />,
        children: [
          // 课程表（首页）
          { index: true, element: <HomePage /> },
          // 老师 / 学生列表
          { path: "members", element: <MembersPage /> },
          // 老师详情 / 学生详情
          { path: "relations/:id", element: <RelationPage /> },
          // 排课（老师和学生）
          { path: "relations/:id/schedule", element: <SchedulePage /> },
          // 课程详情 + 留言板
          { path: "lessons/:id", element: <LessonPage /> },
          // 改时间（老师和学生）
          { path: "lessons/:id/reschedule", element: <ReschedulePage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
