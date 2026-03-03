import type { RouteRecordRaw } from "vue-router";
import FeedbackTimelinePage from "../features/feedback/pages/FeedbackTimelinePage.vue";
import FeedbackPage from "../features/feedback/pages/FeedbackPage.vue";
import PeerReviewPage from "../features/feedback/pages/PeerReviewPage.vue";

export const feedbackRoutes: RouteRecordRaw[] = [
  { path: "/feedback", name: "feedbacks", component: FeedbackTimelinePage },
  { path: "/feedback/:feedbackId", name: "feedback", component: FeedbackPage },
  { path: "/peer-review/:peerReviewId", name: "peer-review", component: PeerReviewPage },
];
