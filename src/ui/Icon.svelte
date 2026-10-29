<script lang="ts">
  type Name = 'back' | 'sound' | 'muted' | 'share' | 'search' | 'shuffle' | 'close' | 'retry';
  let { name, size = 20 }: { name: Name; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'back'}
    <path d="M15 5l-7 7 7 7" />
  {:else if name === 'sound'}
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
  {:else if name === 'muted'}
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" stroke="none" />
    <path d="M16 9.5l5 5m0-5l-5 5" />
  {:else if name === 'share'}
    <path d="M12 15V4m0 0l-4 4m4-4l4 4" />
    <path d="M6 11v7.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V11" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  {:else if name === 'shuffle'}
    <path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.6-3.4M13 10.4c.9-1.8 2-3.4 3.5-3.4H20" />
    <path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6L6 18" />
  {:else if name === 'retry'}
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />
  {/if}
</svg>
