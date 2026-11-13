<script lang="ts">
  // The privacy page's part on Ko-fi (Hedge School's design 22): what goes to Ko-fi, and when. Each site with Support
  // Us (SupportDialog.svelte) puts it in its privacy page.
  import { KOFI_PRIVACY } from "./kofi.ts";
</script>

<h2>Tips through Ko-fi</h2>
<p>Nothing goes to Ko-fi until you open Support Us. Its tip panel is Ko-fi's own page, so Ko-fi then receives your
  IP address and your browser's name, and can set its own cookies. What you enter in the panel goes to Ko-fi, under
  <a href={KOFI_PRIVACY}>Ko-fi's privacy policy</a>.</p>
