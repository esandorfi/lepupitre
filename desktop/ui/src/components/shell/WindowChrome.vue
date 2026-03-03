<template>
  <header class="app-window-chrome shrink-0 border-b">
    <div class="app-container px-4 sm:px-6">
      <div class="flex h-[var(--shell-chrome-height)] items-center gap-3">
        <RouterLink
          class="app-toolbar-link app-focus-ring rounded-lg px-1 py-1 text-sm font-bold tracking-[0.22em] uppercase"
          to="/"
        >
          LE PUPITRE
        </RouterLink>

        <div class="min-w-0 flex-1" data-tauri-drag-region></div>

        <div class="flex items-center gap-2">
          <slot />
          <!-- Native titlebar controls are the single source of truth on desktop OSes. -->
        </div>
      </div>
    </div>
  </header>
</template>
