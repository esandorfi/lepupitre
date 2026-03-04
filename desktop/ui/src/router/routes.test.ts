import { describe, expect, it } from "vitest";
import { feedbackRoutes } from "./feedback.routes";
import { homeRoutes } from "./home.routes";
import { packsRoutes } from "./packs.routes";
import { routes } from "./routes";
import { supportRoutes } from "./support.routes";
import { talksRoutes } from "./talks.routes";
import { trainingRoutes } from "./training.routes";
import { workspaceRoutes } from "./workspace.routes";

function routeByName(name: string) {
  return routes.find((route) => route.name === name);
}

describe("routes", () => {
  it("keeps the root redirect to training", () => {
    expect(routes[0]).toMatchObject({ path: "/", redirect: "/training" });
  });

  it("composes all route domains in a stable order", () => {
    expect(routes.slice(1)).toEqual([
      ...homeRoutes,
      ...trainingRoutes,
      ...workspaceRoutes,
      ...talksRoutes,
      ...feedbackRoutes,
      ...packsRoutes,
      ...supportRoutes,
    ]);
  });

  it("registers core navigation routes", () => {
    expect(routeByName("training")?.path).toBe("/training");
    expect(routeByName("talks")?.path).toBe("/talks");
    expect(routeByName("talk-train")?.path).toBe("/talks/:projectId/train");
    expect(routeByName("quest")?.path).toBe("/quest/:questCode");
    expect(routeByName("feedback")?.path).toBe("/feedback/:feedbackId");
  });

  it("registers onboarding and help pages", () => {
    const onboarding = routeByName("onboarding");
    const help = routeByName("help");
    expect(onboarding?.path).toBe("/onboarding");
    expect(help?.path).toBe("/help");
  });

  it("registers feedback timeline and detail routes", () => {
    const feedbackTimeline = routeByName("feedbacks");
    const feedbackDetail = routeByName("feedback");
    expect(feedbackTimeline?.path).toBe("/feedback");
    expect(feedbackDetail?.path).toBe("/feedback/:feedbackId");
  });

  it("keeps route names unique", () => {
    const names = routes
      .map((route) => route.name)
      .filter((name): name is string => typeof name === "string");
    expect(new Set(names).size).toBe(names.length);
  });
});
