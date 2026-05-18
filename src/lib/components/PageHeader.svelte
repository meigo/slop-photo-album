<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import { page } from '$app/state';
  import ThemeToggle from './ThemeToggle.svelte';

  interface Props {
    backHref?: string;
    children?: import('svelte').Snippet;
  }
  let { backHref, children }: Props = $props();

  let isHome = $derived(backHref ? page.url.pathname === backHref : true);
</script>

<header class="relative py-4 pr-12">
  <!-- Theme toggle stays in the top-right corner so it's always at the
       same spot regardless of whether a back link is rendered. -->
  <div class="absolute top-4 right-0">
    <ThemeToggle />
  </div>
  <!-- Title comes first so the h1 is the leading element on the page;
       the back link sits below it, left-aligned with the body. -->
  {@render children?.()}
  {#if !isHome && backHref}
    <a href={backHref} class="btn-ghost inline-flex items-center gap-1 mt-2" style="padding-left: 0;">
      <ArrowLeft size={16} /> Back
    </a>
  {/if}
</header>
