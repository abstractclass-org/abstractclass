<script lang="ts">
  // A logo option's drawing at a size (logoOptions.ts): its light form on the light theme and its dark form on the
  // dark one, as the collie's two forms (design 12). Pictures, so that each drawing stays as it is in a favicon.
  import { dataUrl, drawing, type LogoOption } from "./logoOptions.ts";

  let { option, size = 28 }: { option: LogoOption; size?: number } = $props();
</script>

<img src={dataUrl(drawing(option, size, "light"))} width={size} height={size} alt="" class="flex-none dark:hidden" />
<img src={dataUrl(drawing(option, size, "dark"))} width={size} height={size} alt="" class="flex-none hidden dark:block" />
