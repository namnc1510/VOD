<template>
  <section class="page-shell items-center justify-center py-8">
    <article class="page-hero w-full max-w-3xl overflow-hidden">
      <div class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div class="space-y-5">
          <span class="page-kicker">404 Error</span>
          <h1 class="page-title max-w-[10ch]">This page is outside the catalog.</h1>
          <p class="page-copy">
            The route you opened does not exist in the client app, or the page has already been moved.
          </p>
          <div class="flex flex-col gap-3 sm:flex-row">
            <RouterLink to="/" class="action-primary">Back Home</RouterLink>
            <RouterLink to="/explore" class="action-secondary">Open Explore</RouterLink>
          </div>
        </div>
        <div class="panel-muted flex min-h-[260px] items-center justify-center p-8">
          <div class="text-center">
            <p class="text-7xl font-black tracking-[-0.08em] text-primary sm:text-8xl">404</p>
            <p class="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Missing Route
            </p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
