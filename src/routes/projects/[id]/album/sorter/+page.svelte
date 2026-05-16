<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import PageThumb from '$lib/components/PageThumb.svelte';
  import { setPageOrder } from '$lib/db';
  import { invalidateAll, goto } from '$app/navigation';

  let { data } = $props();

  let localOrder = $state<typeof data.pages>([]);
  $effect(() => { localOrder = [...data.pages]; });

  let draggingId = $state<number | null>(null);
  let overIdx = $state<number | null>(null);

  function onDragStart(e: DragEvent, pageId: number) {
    draggingId = pageId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(pageId));
    }
  }

  function onDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    overIdx = idx;
  }

  async function onDrop(e: DragEvent, dropIdx: number) {
    e.preventDefault();
    overIdx = null;
    if (draggingId === null) return;
    const fromIdx = localOrder.findIndex((p) => p.id === draggingId);
    if (fromIdx === -1 || fromIdx === dropIdx) {
      draggingId = null;
      return;
    }
    const next = [...localOrder];
    const [moved] = next.splice(fromIdx, 1);
    const insertAt = fromIdx < dropIdx ? dropIdx - 1 : dropIdx;
    next.splice(insertAt, 0, moved);
    localOrder = next;
    draggingId = null;
    if (!data.selection) return;
    await setPageOrder(data.selection.id, next.map((p) => p.id));
    await invalidateAll();
  }

  function onDragEnd() {
    draggingId = null;
    overIdx = null;
  }

  function openInReview() {
    goto(`/projects/${data.project.id}/album/review`);
  }
</script>

<div class="container-page" style="max-width: 1100px;">
  <PageHeader backHref={`/projects/${data.project.id}`}>
    <h1 class="text-xl font-medium">{data.project.name} — album sorter</h1>
  </PageHeader>

  {#if !data.selection || localOrder.length === 0}
    <section class="surface-card mt-4">
      <p style="color: var(--color-muted)">No album generated yet.</p>
    </section>
  {:else}
    <p class="text-sm mt-2" style="color: var(--color-muted)">
      {localOrder.length} pages · drag to reorder · click a page to open the full review
    </p>
    <p class="text-sm mt-1">
      <a class="btn-ghost" href={`/projects/${data.project.id}/album/review`}>← back to full review</a>
    </p>

    <div class="grid grid-cols-4 gap-3 mt-4">
      {#each localOrder as page, idx (page.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="relative"
          style="
            cursor: grab;
            opacity: {draggingId === page.id ? 0.4 : 1};
            outline: {overIdx === idx ? '2px dashed var(--color-fg)' : 'none'};
            outline-offset: 4px;
          "
          draggable="true"
          ondragstart={(e) => onDragStart(e, page.id)}
          ondragover={(e) => onDragOver(e, idx)}
          ondrop={(e) => onDrop(e, idx)}
          ondragend={onDragEnd}
          onclick={openInReview}
          title="Page {idx + 1}{page.title ? ` · ${page.title}` : ''} · drag to move, click to open in review"
        >
          <PageThumb
            templateId={page.template_id}
            slots={data.slotsByPage.get(page.id) ?? []}
            width={220}
          />
          <p class="text-xs text-center mt-1" style="color: var(--color-muted)">
            {idx + 1}{page.title ? ` · ${page.title}` : ''}
          </p>
        </div>
      {/each}
    </div>
  {/if}
</div>
