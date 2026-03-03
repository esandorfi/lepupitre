import type { RouteRecordRaw } from "vue-router";
import QuickRecordPage from "../features/training/pages/QuickRecordPage.vue";
import QuestPage from "../features/training/pages/QuestPage.vue";
import BossRunPage from "../features/training/pages/BossRunPage.vue";

export const trainingRoutes: RouteRecordRaw[] = [
  { path: "/record", name: "quick-record", component: QuickRecordPage },
  { path: "/quest/:questCode", name: "quest", component: QuestPage },
  { path: "/boss-run", name: "boss-run", component: BossRunPage },
];
