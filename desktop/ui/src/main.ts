import { createApp } from "vue";
import ui from "@nuxt/ui/vue-plugin";
import App from "./App.vue";
import { router } from "./router";
import { useTheme } from "./lib/theme";
import { isUiDevWithoutTauri } from "./lib/runtime";
import "./assets/main.css";

function renderFatalOverlay(title: string, detail: string) {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }
  root.innerHTML = `
    <div style="padding:16px;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial,sans-serif;">
      <h1 style="margin:0 0 8px 0;font-size:18px;font-weight:700;">${title}</h1>
      <pre style="white-space:pre-wrap;word-break:break-word;margin:0;background:#111827;color:#f9fafb;padding:12px;border-radius:8px;">${detail}</pre>
      <p style="margin:10px 0 0 0;color:#4b5563;font-size:12px;">Open DevTools console for stack trace details.</p>
    </div>
  `;
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  return String(value);
}

useTheme().initTheme();
document.title = isUiDevWithoutTauri() ? "Le Pupitre UI Preview" : "Le Pupitre";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error("vue error", err, info, instance);
  renderFatalOverlay("UI runtime error", `${info}\n${errorMessage(err)}`);
};

router.onError((err) => {
  console.error("router error", err);
  renderFatalOverlay("Routing error", errorMessage(err));
});

app.use(router);
app.use(ui);

window.addEventListener("error", (event) => {
  console.error("window error", event.error ?? event.message);
  renderFatalOverlay("Window error", errorMessage(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("unhandled rejection", event.reason);
  renderFatalOverlay("Unhandled rejection", errorMessage(event.reason));
});

try {
  app.mount("#app");
} catch (error) {
  console.error("mount failed", error);
  renderFatalOverlay("App mount failed", errorMessage(error));
}
