import type { RouteRecordRaw } from "vue-router";
import SettingsPage from "../features/support/pages/SettingsPage.vue";
import OnboardingPage from "../features/support/pages/OnboardingPage.vue";
import HelpPage from "../features/support/pages/HelpPage.vue";
import AboutPage from "../features/support/pages/AboutPage.vue";

export const supportRoutes: RouteRecordRaw[] = [
  { path: "/settings", name: "settings", component: SettingsPage },
  { path: "/onboarding", name: "onboarding", component: OnboardingPage },
  { path: "/help", name: "help", component: HelpPage },
  { path: "/about", name: "about", component: AboutPage },
];
