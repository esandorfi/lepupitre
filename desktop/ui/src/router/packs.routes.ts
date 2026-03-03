import type { RouteRecordRaw } from "vue-router";
import PacksPage from "../features/packs/pages/PacksPage.vue";

export const packsRoutes: RouteRecordRaw[] = [
  { path: "/packs", name: "packs", component: PacksPage },
];
