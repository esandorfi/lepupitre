import type { RouteRecordRaw } from "vue-router";

export const voiceRecorderRoutes: RouteRecordRaw[] = [
  {
    path: "/voice-recorder",
    name: "voice-recorder",
    component: () => import("../features/voice-recorder/pages/VoiceRecorderPage.vue"),
  },
];
