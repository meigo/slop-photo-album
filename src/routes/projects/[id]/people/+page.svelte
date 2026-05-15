<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { updatePersonCluster } from '$lib/db';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  async function rename(id: number, name: string) {
    await updatePersonCluster(id, { name: name.trim() || null });
    await invalidateAll();
  }

  async function togglePin(id: number, current: number) {
    await updatePersonCluster(id, { is_pinned: !current });
    await invalidateAll();
  }
</script>

<div class="container-page" style="max-width: 1000px;">
  <PageHeader backHref={`/projects/${data.project.id}`}>
    <h1 class="text-xl font-medium">{data.project.name} — people</h1>
  </PageHeader>

  <p class="text-sm mt-2" style="color: var(--color-muted)">
    {data.clusters.length} clusters · {[...data.facesByCluster.values()].reduce((a, b) => a + b.length, 0)} faces total
  </p>

  <div class="flex flex-col gap-4 mt-4">
    {#each data.clusters as cluster}
      {@const cFaces = data.facesByCluster.get(cluster.id) ?? []}
      <section class="surface-card">
        <div class="flex items-center justify-between gap-2 mb-2">
          <input
            class="input-base flex-1"
            placeholder="Unnamed person"
            value={cluster.name ?? ''}
            onchange={(e) => rename(cluster.id, e.currentTarget.value)}
          />
          <button
            type="button"
            class={cluster.is_pinned ? 'btn-primary' : 'btn-secondary'}
            onclick={() => togglePin(cluster.id, cluster.is_pinned)}
            title="Pinned clusters are always included in album/calendar selection (Phase 3)"
          >
            {cluster.is_pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
        <p class="text-xs" style="color: var(--color-muted)">{cFaces.length} faces</p>
        <div class="grid grid-cols-8 gap-1 mt-2">
          {#each cFaces.slice(0, 16) as f}
            {@const photo = data.photoById.get(f.photo_id)}
            {#if photo?.thumb_path}
              <img
                src={convertFileSrc(photo.thumb_path)}
                alt=""
                class="w-full aspect-square object-cover rounded"
                title={photo.path}
              />
            {/if}
          {/each}
        </div>
        {#if cFaces.length > 16}
          <p class="text-xs mt-1" style="color: var(--color-muted)">…and {cFaces.length - 16} more</p>
        {/if}
      </section>
    {/each}
    {#if data.clusters.length === 0}
      <p style="color: var(--color-muted)">No clusters yet. Run "Re-run CV" from the project dashboard.</p>
    {/if}
  </div>
</div>
