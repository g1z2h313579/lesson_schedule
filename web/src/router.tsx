import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/layouts/root-layout";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";

// 路由表：新增页面时，在 pages/ 下新建组件，再在 children 中追加一项
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
