import type { RouteRecordRaw } from "vue-router";

export const trainingRoutes: RouteRecordRaw[] = [
  {
    path: "/record",
    name: "quick-record",
    component: () => import("../features/training/pages/QuickRecordPage.vue"),
  },
  {
    path: "/quest/:questCode",
    name: "quest",
    component: () => import("../features/training/pages/QuestPage.vue"),
  },
  {
    path: "/boss-run",
    name: "boss-run",
    component: () => import("../features/training/pages/BossRunPage.vue"),
  },
];
