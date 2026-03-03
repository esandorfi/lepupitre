import type { RouteRecordRaw } from "vue-router";
import { feedbackRoutes } from "./feedback.routes";
import { homeRoutes } from "./home.routes";
import { packsRoutes } from "./packs.routes";
import { supportRoutes } from "./support.routes";
import { talksRoutes } from "./talks.routes";
import { trainingRoutes } from "./training.routes";
import { workspaceRoutes } from "./workspace.routes";

export const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/training" },
  ...homeRoutes,
  ...trainingRoutes,
  ...workspaceRoutes,
  ...talksRoutes,
  ...feedbackRoutes,
  ...packsRoutes,
  ...supportRoutes,
];
