import { describe, expect, it } from "vitest";
import { routes } from "./routes";

function routeByName(name: string) {
  return routes.find((route) => route.name === name);
}

describe("routes", () => {
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

  it("keeps route names unique", () => {
    const names = routes
      .map((route) => route.name)
      .filter((name): name is string => typeof name === "string");
    expect(new Set(names).size).toBe(names.length);
  });
});
