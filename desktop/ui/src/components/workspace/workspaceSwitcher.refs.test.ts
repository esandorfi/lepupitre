import { afterAll, describe, expect, it } from "vitest";
import { resolveButtonElement, resolveInputElement } from "./workspaceSwitcher.refs";

class MockElement {
  constructor(private readonly map: Record<string, unknown> = {}) {}

  querySelector(selector: string) {
    return this.map[selector] ?? null;
  }
}

class MockInputElement extends MockElement {}
class MockButtonElement extends MockElement {}

const previousHTMLElement = globalThis.HTMLElement;
const previousHTMLInputElement = globalThis.HTMLInputElement;
const previousHTMLButtonElement = globalThis.HTMLButtonElement;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLElement = MockElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLInputElement = MockInputElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLButtonElement = MockButtonElement;

describe("workspaceSwitcher.refs", () => {
  it("resolves input elements from direct refs, inputRef and $el query", () => {
    const direct = new MockInputElement();
    expect(resolveInputElement(direct as unknown as HTMLInputElement)).toBe(direct);

    const byInputRef = { inputRef: new MockInputElement() };
    expect(resolveInputElement(byInputRef as unknown as { inputRef?: HTMLInputElement })).toBe(
      byInputRef.inputRef
    );

    const queried = new MockInputElement();
    const byEl = { $el: new MockElement({ input: queried }) };
    expect(resolveInputElement(byEl as unknown as { $el?: Element })).toBe(queried);

    expect(resolveInputElement(null)).toBeNull();
  });

  it("resolves button elements from direct refs and $el query", () => {
    const direct = new MockButtonElement();
    expect(resolveButtonElement(direct as unknown as HTMLButtonElement)).toBe(direct);

    const directEl = { $el: new MockButtonElement() };
    expect(resolveButtonElement(directEl as unknown as { $el?: Element })).toBe(directEl.$el);

    const queried = new MockButtonElement();
    const byEl = { $el: new MockElement({ button: queried }) };
    expect(resolveButtonElement(byEl as unknown as { $el?: Element })).toBe(queried);

    expect(resolveButtonElement(null)).toBeNull();
    expect(resolveButtonElement({ $el: null })).toBeNull();
  });
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).HTMLElement = previousHTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).HTMLInputElement = previousHTMLInputElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).HTMLButtonElement = previousHTMLButtonElement;
});
