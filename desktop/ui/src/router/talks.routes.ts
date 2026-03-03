import type { RouteRecordRaw } from "vue-router";
import TalksPage from "../features/talks/pages/TalksPage.vue";
import TalkDefinePage from "../features/talks/pages/TalkDefinePage.vue";
import TalkBuilderPage from "../features/talks/pages/TalkBuilderPage.vue";
import TalkTrainPage from "../features/talks/pages/TalkTrainPage.vue";
import TalkExportPage from "../features/talks/pages/TalkExportPage.vue";
import ProjectSetupPage from "../features/talks/pages/ProjectSetupPage.vue";

export const talksRoutes: RouteRecordRaw[] = [
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
  { path: "/builder", name: "builder", component: TalkBuilderPage },
];
