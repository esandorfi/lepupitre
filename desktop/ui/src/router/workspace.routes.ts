import type { RouteRecordRaw } from "vue-router";
import ProfilesPage from "../features/workspace/pages/ProfilesPage.vue";

export const workspaceRoutes: RouteRecordRaw[] = [
  { path: "/profiles", name: "profiles", component: ProfilesPage },
];
