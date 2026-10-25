<script lang="ts">
  // The site's menu on a narrow screen (design 22), at the left of the header, as Lichess's on a phone: the header's
  // links, which a narrow header cannot hold in one row. The tabs, then the pages about the site. Each entry is a link,
  // so that the router opens it and a middle click opens a new tab. The page shown is marked, as in the header. On a
  // phone, "Support Us" too, which the header has no room for: it opens Ko-fi's tip panel (SupportDialog).
  import { DropdownMenu } from "bits-ui";
  import { page } from "$app/state";
  import Icon from "@abstractclass/site/Icon.svelte";

  type Link = { href: string; label: string; wide?: boolean };
  let { tabs, about, support }: { tabs: Link[]; about: Link[]; support: () => void } = $props();
  const here = (href: string) => page.url.pathname.startsWith(href);
</script>

{#snippet entry(link: Link)}
  <!-- The link is the item itself (Bits UI's child snippet), so it takes the item's classes. -->
  <DropdownMenu.Item>
    {#snippet child({ props })}
      <a {...props} href={link.href} aria-current={here(link.href) ? "page" : undefined}
         class={["menu-item block no-underline", link.wide && "max-sm:hidden", here(link.href) ? "text-ink font-semibold" : "text-muted"]}>{link.label}</a>
    {/snippet}
  </DropdownMenu.Item>
{/snippet}

<DropdownMenu.Root>
  <DropdownMenu.Trigger class="flex p-1 bg-transparent border-transparent text-muted hover:text-ink data-[state=open]:text-ink"
                        aria-label="Menu" title="Menu"><Icon name="menu" /></DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content align="start" sideOffset={4} class="z-20 min-w-44 menu-box">
      {#each tabs as link (link.href)}{@render entry(link)}{/each}
      <DropdownMenu.Separator class="my-1 h-px bg-line" />
      {#each about as link (link.href)}{@render entry(link)}{/each}
      <DropdownMenu.Separator class="my-1 h-px bg-line sm:hidden" />
      <DropdownMenu.Item class="menu-item sm:hidden flex items-center gap-1.5 text-accent" onSelect={support}><Icon name="heart" />Support Us</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
