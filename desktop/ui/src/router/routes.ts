import type { RouteRecordRaw } from "vue-router";

import HomePage from "../pages/HomePage.vue";
import QuickRecordPage from "../pages/QuickRecordPage.vue";
import ProfilesPage from "../pages/ProfilesPage.vue";
import TalksPage from "../pages/TalksPage.vue";
import TalkDefinePage from "../pages/TalkDefinePage.vue";
import TalkTrainPage from "../pages/TalkTrainPage.vue";
import TalkExportPage from "../pages/TalkExportPage.vue";
import ProjectSetupPage from "../pages/ProjectSetupPage.vue";
import QuestPage from "../pages/QuestPage.vue";
import FeedbackPage from "../pages/FeedbackPage.vue";
import FeedbackTimelinePage from "../pages/FeedbackTimelinePage.vue";
import PeerReviewPage from "../pages/PeerReviewPage.vue";
import TalkBuilderPage from "../pages/TalkBuilderPage.vue";
import BossRunPage from "../pages/BossRunPage.vue";
import PacksPage from "../pages/PacksPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";
import AboutPage from "../pages/AboutPage.vue";
import OnboardingPage from "../pages/OnboardingPage.vue";
import HelpPage from "../pages/HelpPage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/training" },
  { path: "/training", name: "training", component: HomePage },
  { path: "/record", name: "quick-record", component: QuickRecordPage },
  { path: "/profiles", name: "profiles", component: ProfilesPage },
  { path: "/talks", name: "talks", component: TalksPage },
  { path: "/talks/:projectId/define", name: "talk-define", component: TalkDefinePage },
  { path: "/talks/:projectId/builder", name: "talk-builder", component: TalkBuilderPage },
  { path: "/talks/:projectId/train", name: "talk-train", component: TalkTrainPage },
  { path: "/talks/:projectId/export", name: "talk-export", component: TalkExportPage },
  {
    path: "/talks/:projectId",
    name: "talk-report",
    redirect: (to) => `/talks/${String(to.params.projectId || "")}/train`,
  },
  { path: "/project/new", name: "project-new", component: ProjectSetupPage },
  { path: "/quest/:questCode", name: "quest", component: QuestPage },
  { path: "/feedback", name: "feedbacks", component: FeedbackTimelinePage },
  { path: "/feedback/:feedbackId", name: "feedback", component: FeedbackPage },
  { path: "/peer-review/:peerReviewId", name: "peer-review", component: PeerReviewPage },
  { path: "/builder", name: "builder", component: TalkBuilderPage },
  { path: "/boss-run", name: "boss-run", component: BossRunPage },
  { path: "/packs", name: "packs", component: PacksPage },
  { path: "/settings", name: "settings", component: SettingsPage },
  { path: "/onboarding", name: "onboarding", component: OnboardingPage },
  { path: "/help", name: "help", component: HelpPage },
  { path: "/about", name: "about", component: AboutPage },
];
