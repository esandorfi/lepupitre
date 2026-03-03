import type { RouteRecordRaw } from "vue-router";
import HomePage from "../features/home/pages/HomePage.vue";

export const homeRoutes: RouteRecordRaw[] = [
  { path: "/training", name: "training", component: HomePage },
];
