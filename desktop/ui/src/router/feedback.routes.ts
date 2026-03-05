import type { RouteRecordRaw } from "vue-router";

export const feedbackRoutes: RouteRecordRaw[] = [
  {
    path: "/feedback",
    name: "feedbacks",
    component: () => import("../features/feedback/pages/FeedbackTimelinePage.vue"),
  },
  {
    path: "/feedback/:feedbackId",
    name: "feedback",
    component: () => import("../features/feedback/pages/FeedbackPage.vue"),
  },
  {
    path: "/peer-review/:peerReviewId",
    name: "peer-review",
    component: () => import("../features/feedback/pages/PeerReviewPage.vue"),
  },
];
