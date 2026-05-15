<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { convertFileSrc } from '@tauri-apps/api/core';

  let { data } = $props();

  function bucketLabel(key: string, kind: 'album' | 'calendar'): string {
    if (kind === 'album') {
      if (key === 'no-date') return 'No date';
      const d = new Date(key + 'T12:00:00');
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const d = new Date(key + '-15T12:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  function monthShort(key: string): string {
    const d = new Date(key + '-15T12:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }

  let totalPhotos = $derived(
    [...data.photosByBucket.values()].reduce((a, b) => a + b.length, 0)
  );
  let maxBarValue = $derived(
    Math.max(1, ...data.histogram.map((h) => h.available))
  );
</script>

<div class="container-page" style="max-width: 1000px;">
  <PageHeader backHref={`/projects/${data.project.id}`}>
    <h1 class="text-xl font-medium">
      {data.project.name} — {data.kind === 'album' ? 'album' : 'calendar'} selection
    </h1>
  </PageHeader>

  {#if !data.selection}
    <section class="surface-card mt-4">
      <p style="color: var(--color-muted)">
        No {data.kind} generated yet. Return to the dashboard and click
        "Generate {data.kind}".
      </p>
    </section>
  {:else}
    <p class="text-sm mt-2" style="color: var(--color-muted)">
      {totalPhotos} photos across {data.photosByBucket.size} bucket{data.photosByBucket.size === 1 ? '' : 's'}
      · generated {new Date(data.selection.generated_at).toLocaleString()}
    </p>

    {#if data.histogram.length > 0}
      <section class="surface-card mt-4">
        <h2 class="text-sm font-medium mb-2" style="color: var(--color-muted)">
          Distribution ({data.kind === 'album' ? data.project.album_year : data.project.calendar_year - 1})
        </h2>
        <div class="flex flex-col gap-1">
          {#each data.histogram as h}
            {@const availPct = (h.available / maxBarValue) * 100}
            {@const selPct = (h.selected / maxBarValue) * 100}
            <div class="flex items-center gap-2 text-xs">
              <span class="w-20 shrink-0" style="color: var(--color-muted)">{monthShort(h.monthKey)}</span>
              <div class="flex-1 relative" style="height: 14px; background: var(--color-bg);">
                <div class="absolute inset-y-0 left-0" style="background: var(--color-line); width: {availPct}%"></div>
                <div class="absolute inset-y-0 left-0" style="background: var(--color-fg); width: {selPct}%"></div>
              </div>
              <span class="text-right" style="width: 9rem; color: var(--color-muted)">
                {h.selected} / {h.available}
              </span>
            </div>
          {/each}
        </div>
        <p class="text-xs mt-2" style="color: var(--color-muted)">
          Bar: photos available in source. Filled: photos selected.
        </p>
      </section>
    {/if}

    <div class="flex flex-col gap-6 mt-4">
      {#each [...data.photosByBucket.entries()] as [bucket, photos]}
        <section>
          <h2 class="text-lg font-medium mb-2">{bucketLabel(bucket, data.kind)}</h2>
          <div class="grid grid-cols-4 gap-2">
            {#each photos as photo}
              <figure class="surface-card p-1">
                {#if photo.thumb_path}
                  <img src={convertFileSrc(photo.thumb_path)} alt="" class="w-full aspect-square object-cover rounded" />
                {:else}
                  <div class="w-full aspect-square" style="background: var(--color-line)"></div>
                {/if}
                <figcaption class="text-xs mt-1" style="color: var(--color-muted)">
                  rank {photo.rank} · score {photo.score?.toFixed(2) ?? '—'}
                </figcaption>
                {#if photo.notes}
                  <p class="text-xs mt-0.5" style="color: var(--color-warning)" title={photo.notes}>
                    ⚠ {photo.notes}
                  </p>
                {/if}
              </figure>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>
