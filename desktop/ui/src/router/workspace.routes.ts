import type { RouteRecordRaw } from "vue-router";

export const workspaceRoutes: RouteRecordRaw[] = [
  {
    path: "/profiles",
    name: "profiles",
    component: () => import("../features/workspace/pages/ProfilesPage.vue"),
  },
];
