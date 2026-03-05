import type { RouteRecordRaw } from "vue-router";

export const supportRoutes: RouteRecordRaw[] = [
  {
    path: "/settings",
    name: "settings",
    component: () => import("../features/support/pages/SettingsPage.vue"),
  },
  {
    path: "/onboarding",
    name: "onboarding",
    component: () => import("../features/support/pages/OnboardingPage.vue"),
  },
  {
    path: "/help",
    name: "help",
    component: () => import("../features/support/pages/HelpPage.vue"),
  },
  {
    path: "/about",
    name: "about",
    component: () => import("../features/support/pages/AboutPage.vue"),
  },
];
