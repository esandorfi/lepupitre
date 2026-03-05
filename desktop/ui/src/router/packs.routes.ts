import type { RouteRecordRaw } from "vue-router";

export const packsRoutes: RouteRecordRaw[] = [
  {
    path: "/packs",
    name: "packs",
    component: () => import("../features/packs/pages/PacksPage.vue"),
  },
];
