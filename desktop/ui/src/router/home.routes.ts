import type { RouteRecordRaw } from "vue-router";

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: "/training",
    name: "training",
    component: () => import("../features/home/pages/HomePage.vue"),
  },
];
