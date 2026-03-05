export type ButtonRefTarget = HTMLButtonElement | { $el?: Element | null } | null;

export type InputRefTarget =
  | HTMLInputElement
  | { $el?: Element | null; inputRef?: HTMLInputElement | null }
  | null;

export function resolveInputElement(target: InputRefTarget): HTMLInputElement | null {
  if (!target) {
    return null;
  }
  if (target instanceof HTMLInputElement) {
    return target;
  }
  if (target.inputRef instanceof HTMLInputElement) {
    return target.inputRef;
  }
  if (target.$el instanceof HTMLElement) {
    const input = target.$el.querySelector("input");
    if (input instanceof HTMLInputElement) {
      return input;
    }
  }
  return null;
}

export function resolveButtonElement(target: ButtonRefTarget): HTMLButtonElement | null {
  if (!target) {
    return null;
  }
  if (target instanceof HTMLButtonElement) {
    return target;
  }
  if (!(target.$el instanceof HTMLElement)) {
    return null;
  }
  if (target.$el instanceof HTMLButtonElement) {
    return target.$el;
  }
  const button = target.$el.querySelector("button");
  if (button instanceof HTMLButtonElement) {
    return button;
  }
  return null;
}
