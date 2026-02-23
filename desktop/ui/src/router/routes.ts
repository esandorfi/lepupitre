import type { RouteRecordRaw } from "vue-router";

import HomePage from "../pages/HomePage.vue";
import ProfilesPage from "../pages/ProfilesPage.vue";
import TalksPage from "../pages/TalksPage.vue";
import ProjectSetupPage from "../pages/ProjectSetupPage.vue";
import QuestPage from "../pages/QuestPage.vue";
import FeedbackPage from "../pages/FeedbackPage.vue";
import PeerReviewPage from "../pages/PeerReviewPage.vue";
import TalkReportPage from "../pages/TalkReportPage.vue";
import TalkBuilderPage from "../pages/TalkBuilderPage.vue";
import BossRunPage from "../pages/BossRunPage.vue";
import PacksPage from "../pages/PacksPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";
import AboutPage from "../pages/AboutPage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: HomePage },
  { path: "/profiles", name: "profiles", component: ProfilesPage },
  { path: "/talks", name: "talks", component: TalksPage },
  { path: "/talks/:projectId", name: "talk-report", component: TalkReportPage },
  { path: "/project/new", name: "project-new", component: ProjectSetupPage },
  { path: "/quest/:questCode", name: "quest", component: QuestPage },
  { path: "/feedback/:feedbackId", name: "feedback", component: FeedbackPage },
  { path: "/peer-review/:peerReviewId", name: "peer-review", component: PeerReviewPage },
  { path: "/builder", name: "builder", component: TalkBuilderPage },
  { path: "/boss-run", name: "boss-run", component: BossRunPage },
  { path: "/packs", name: "packs", component: PacksPage },
  { path: "/settings", name: "settings", component: SettingsPage },
  { path: "/about", name: "about", component: AboutPage },
];
