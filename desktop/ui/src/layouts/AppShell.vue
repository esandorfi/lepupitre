<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <div class="text-xs uppercase tracking-[0.3em] text-slate-400">
        Le Pupitre
      </div>
      <nav class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <RouterLink class="hover:text-slate-100" to="/">Home</RouterLink>
        <RouterLink class="hover:text-slate-100" to="/profiles">Profiles</RouterLink>
        <RouterLink class="hover:text-slate-100" to="/project/new">Talk</RouterLink>
      </nav>
    </header>
    <main class="px-6 py-6">
      <slot />
    </main>
  </div>
</template>
