import { createApp } from "vue";
import ui from "@nuxt/ui/vue-plugin";
import App from "./App.vue";
import { router } from "./router";
import { useTheme } from "./lib/theme";
import "./assets/main.css";

useTheme().initTheme();

const app = createApp(App);

app.use(router);
app.use(ui);

app.mount("#app");
