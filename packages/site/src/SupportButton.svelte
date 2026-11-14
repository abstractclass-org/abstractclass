<script lang="ts">
  // "Support Us" in the header (Hedge School's design 22), for tips through Ko-fi: in the accent's colour of each theme,
  // as the site's other main buttons, with a heart. It opens the site's SupportDialog. Below 640 pixels it hides, and
  // the site's menu holds it (SiteMenu.svelte).
  import Icon from "./Icon.svelte";

  let { onclick }: { onclick: () => void } = $props();
</script>

<button type="button" class="btn-primary max-sm:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm
                             font-semibold hover:brightness-110" {onclick}><Icon name="heart" />Support Us</button>
