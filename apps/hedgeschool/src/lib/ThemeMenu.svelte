<script lang="ts">
  // The theme menu, at the right of the site's header (design 11): System, Light or Dark. Its button shows the choice:
  // a half-filled circle for the system's theme, a sun, or a moon.
  import { DropdownMenu } from "bits-ui";
  import { THEME_CHOICES, setTheme, theme, type ThemeChoice } from "#lib/theme.svelte.ts";

  // The sun's eight rays, from just outside its disc.
  const RAYS = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    return [12 + 6.5 * c, 12 + 6.5 * s, 12 + 9 * c, 12 + 9 * s];
  });
  const label = $derived(THEME_CHOICES.find(([c]) => c === theme.choice)?.[1] ?? "System");
</script>

{#snippet icon(choice: ThemeChoice)}
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round">
    {#if choice === "light"}
      <circle cx="12" cy="12" r="3.5" />
      {#each RAYS as [x1, y1, x2, y2], k (k)}<line {x1} {y1} {x2} {y2} />{/each}
    {:else if choice === "dark"}
      <!-- A crescent: the disc of radius 8 about (12, 12), less the disc of radius 7 about (17, 7). -->
      <path d="M19.9 13.4 A8 8 0 1 1 10.6 4.1 A7 7 0 0 0 19.9 13.4 Z" />
    {:else}
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4 A8 8 0 0 0 12 20 Z" fill="currentColor" stroke="none" />
    {/if}
  </svg>
{/snippet}

<DropdownMenu.Root>
  <DropdownMenu.Trigger class="flex p-1 bg-transparent border-transparent text-muted hover:text-ink data-[state=open]:text-ink"
                        aria-label="Theme: {label}" title="Theme: {label}">{@render icon(theme.choice)}</DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content align="end" sideOffset={4}
                          class="z-20 min-w-36 menu-box">
      <DropdownMenu.RadioGroup value={theme.choice} onValueChange={v => setTheme(v as ThemeChoice)}>
        {#each THEME_CHOICES as [choice, name] (choice)}
          <DropdownMenu.RadioItem class="flex items-center gap-2 menu-item" value={choice}>
            {#snippet children({ checked })}
              {@render icon(choice)}<span class="flex-1">{name}</span><span class={checked ? "text-accent" : "invisible"}>✓</span>
            {/snippet}
          </DropdownMenu.RadioItem>
        {/each}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
