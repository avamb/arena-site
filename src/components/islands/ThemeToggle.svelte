<script lang="ts">
  /**
   * Theme switch (doc 33 §3.11): explicit choice → localStorage['aso-theme'] → data-theme on <html>.
   * The inline script in the layout applies the stored value before paint; this island only flips it.
   */
  import { onMount } from 'svelte';
  let { label }: { label: string } = $props();
  let dark = $state(false);

  function current(): boolean {
    const root = document.documentElement;
    const explicit = root.getAttribute('data-theme');
    return explicit === 'dark'; // light unless the visitor chose dark
  }

  onMount(() => { dark = current(); });

  function toggle() {
    const next = current() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    dark = next === 'dark';
    try { localStorage.setItem('aso-theme', next); } catch {}
    window.dispatchEvent(new CustomEvent('aso:theme', { detail: { theme: next, source: 'choice' } }));
  }
</script>

<button class="icon-btn" type="button" aria-label={label} aria-pressed={dark} onclick={toggle}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>
