<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { Users, Copy } from '@lucide/svelte';

  let { data } = $props();

  function fmtDate(t: number | null): string {
    if (!t) return '—';
    return new Date(t).toLocaleDateString();
  }

  // Blur score thresholds: empirical, refine later.
  function blurBadge(blur: number | null): string {
    if (blur === null) return '';
    if (blur < 100) return 'blurry';
    if (blur < 500) return 'soft';
    return '';  // sharp — no badge
  }
</script>

<div class="container-page" style="max-width: 1000px;">
  <PageHeader backHref={`/projects/${data.project.id}`}>
    <h1 class="text-xl font-medium">{data.project.name} — library</h1>
  </PageHeader>

  <p class="text-sm mt-2" style="color: var(--color-muted)">{data.photos.length} photos</p>

  <div class="grid grid-cols-4 gap-2 mt-4">
    {#each data.photos as photo}
      {@const cv = data.cvById.get(photo.id)}
      {@const dupGroup = data.dupGroupByPhoto.get(photo.id)}
      {@const bb = blurBadge(cv?.blur ?? null)}
      <figure class="surface-card p-1 relative">
        {#if photo.thumb_path}
          <img src={convertFileSrc(photo.thumb_path)} alt="" class="w-full aspect-square object-cover rounded" />
        {:else}
          <div class="w-full aspect-square" style="background: var(--color-line)"></div>
        {/if}
        <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {#if bb}
            <span class="text-xs px-1 rounded" style="background: var(--color-warning); color: var(--color-bg)">{bb}</span>
          {/if}
          {#if cv && (cv.faces_count ?? 0) > 0}
            <span class="text-xs px-1 rounded flex items-center gap-0.5" style="background: var(--color-surface); color: var(--color-fg); border: 1px solid var(--color-line)">
              <Users size={10} /> {cv.faces_count}
            </span>
          {/if}
          {#if dupGroup !== undefined}
            <span class="text-xs px-1 rounded flex items-center gap-0.5" title="Member of duplicate group {dupGroup}" style="background: var(--color-surface); color: var(--color-muted); border: 1px solid var(--color-line)">
              <Copy size={10} />
            </span>
          {/if}
        </div>
        <figcaption class="text-xs mt-1 truncate" style="color: var(--color-muted)" title={photo.path}>
          {fmtDate(photo.taken_at)}
        </figcaption>
      </figure>
    {/each}
  </div>
</div>
