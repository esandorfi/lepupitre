import type { RouteRecordRaw } from "vue-router";

export const talksRoutes: RouteRecordRaw[] = [
  {
    path: "/talks",
    name: "talks",
    component: () => import("../features/talks/pages/TalksPage.vue"),
  },
  {
    path: "/talks/:projectId/define",
    name: "talk-define",
    component: () => import("../features/talks/pages/TalkDefinePage.vue"),
  },
  {
    path: "/talks/:projectId/builder",
    name: "talk-builder",
    component: () => import("../features/talks/pages/TalkBuilderPage.vue"),
  },
  {
    path: "/talks/:projectId/train",
    name: "talk-train",
    component: () => import("../features/talks/pages/TalkTrainPage.vue"),
  },
  {
    path: "/talks/:projectId/export",
    name: "talk-export",
    component: () => import("../features/talks/pages/TalkExportPage.vue"),
  },
  {
    path: "/talks/:projectId",
    name: "talk-report",
    redirect: (to) => `/talks/${String(to.params.projectId || "")}/train`,
  },
  {
    path: "/project/new",
    name: "project-new",
    component: () => import("../features/talks/pages/ProjectSetupPage.vue"),
  },
  {
    path: "/builder",
    name: "builder",
    component: () => import("../features/talks/pages/TalkBuilderPage.vue"),
  },
];
