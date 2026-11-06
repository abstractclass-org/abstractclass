<script lang="ts">
  // The logo lab (abscls-8tl1.44): the options for Cyanotype's logo (lib/brand/logoOptions.ts), for the owner to choose
  // one. For each option: its drawings at their sizes on both pages, the site's real header with the logo before the
  // name (frames of /lab/logos/frame, at a phone's 360 pixels and at full width, in both themes), the favicon at 16, 32
  // and 48 pixels on a browser tab's colours, the 180-pixel iOS icon, and the link preview picture (lib/brand/card.ts).
  // The site's other pages show no option.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { card } from "#lib/brand/card.ts";
  import { dataUrl, LOGO_OPTIONS, type LogoOption } from "#lib/brand/logoOptions.ts";
  import { SITE_NAME } from "#lib/site.ts";

  const THEMES = ["light", "dark"] as const;
  /** The page's colours of each theme (packages/site/src/site.css): the panel, which the header has, and the text. */
  const PAGE = { light: { bg: "#ffffff", text: "#24252a" }, dark: { bg: "#26282c", text: "#e4e4e6" } };
  /** Chrome's tab strip in each theme: the strip, the open tab and its title. */
  const TABS = [
    { name: "Light", strip: "#dee1e6", tab: "#ffffff", text: "#3c4043" },
    { name: "Dark", strip: "#202124", tab: "#35363a", text: "#e8eaed" },
  ];
  /** The home screen's wallpaper under the iOS icon: light and dark. */
  const WALLPAPERS = ["#c8d3e0", "#1c1f26"];

  const forms = (o: LogoOption) => [16, 28, 48, 96].map(size => ({ size, form: size < 48 ? o.small : o.large }));

  /** Draws a drawing on a canvas of its own pixels, as a browser draws a favicon of that size. The page shows the
   *  canvas enlarged, each pixel a square. */
  const pixels = (doc: string) => (canvas: HTMLCanvasElement) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl(doc);
  };
</script>

<PageMeta title="Logo lab · {SITE_NAME}" noindex />

<main class="max-w-6xl mx-auto px-4 py-6 space-y-12">
  <div class="space-y-2">
    <h1 class="text-2xl font-bold">Logo options</h1>
    <p class="max-w-3xl">
      Four options for {SITE_NAME}'s logo, each a different idea. Each one is shown in the site's header, as the favicon
      on a browser's tab, as the iOS home screen's icon and on the link preview picture. The site's accent is still
      Hedge School's lavender. The site's other pages do not show these options.
    </p>
    <nav class="flex flex-wrap gap-4">
      {#each LOGO_OPTIONS as o, i (o.id)}<a href="#{o.id}">{i + 1}. {o.name}</a>{/each}
    </nav>
  </div>

  {#each LOGO_OPTIONS as o, i (o.id)}
    <section id={o.id} class="space-y-5 border-t border-line pt-6">
      <div>
        <h2 class="text-xl font-bold">{i + 1}. {o.name}</h2>
        <p class="text-muted">{o.idea}</p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">The drawings</h3>
        <p class="text-sm text-muted">The simple drawing below 48 pixels, the full one from 48 pixels up.</p>
        <div class="flex flex-wrap gap-3">
          {#each THEMES as t (t)}
            <div class="flex items-end gap-5 rounded-md border border-line px-4 py-3" style:background={PAGE[t].bg}
                 style:color={PAGE[t].text}>
              {#each forms(o) as f (f.size)}
                <figure class="flex flex-col items-center gap-1">
                  <img src={dataUrl(f.form[t])} width={f.size} height={f.size} alt="" />
                  <figcaption class="text-xs opacity-70">{f.size}</figcaption>
                </figure>
              {/each}
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">The header</h3>
        <p class="text-sm text-muted">The site's header with the logo before its name: at 360 pixels, then at full width.</p>
        <div class="overflow-x-auto">
          <div class="flex gap-3 w-max">
            {#each THEMES as t (t)}
              <iframe title="{o.name}: the header at 360 pixels, {t} theme" src="/lab/logos/frame?logo={o.id}&theme={t}"
                      width="360" height="108" class="border border-line rounded-md"></iframe>
            {/each}
          </div>
        </div>
        {#each THEMES as t (t)}
          <iframe title="{o.name}: the header at full width, {t} theme" src="/lab/logos/frame?logo={o.id}&theme={t}"
                  height="108" class="block w-full border border-line rounded-md"></iframe>
        {/each}
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">The favicon</h3>
        <p class="text-sm text-muted">
          On Chrome's tab at 16 pixels, then at 32 and 48 pixels. The last picture is the 16-pixel icon enlarged, so
          that each of its pixels shows.
        </p>
        <div class="flex flex-wrap gap-3">
          {#each TABS as tab (tab.name)}
            <div class="rounded-md px-3 pt-2 pb-3" style:background={tab.strip}>
              <div class="flex items-center gap-2 w-56 rounded-t-lg px-3 py-2 text-xs" style:background={tab.tab}
                   style:color={tab.text}>
                <img src={dataUrl(o.favicon)} width="16" height="16" alt="" />
                <span>{SITE_NAME}</span><span class="ml-auto">×</span>
              </div>
              <div class="flex items-end gap-4 px-3 py-3" style:background={tab.tab}>
                <img src={dataUrl(o.favicon)} width="32" height="32" alt="" />
                <img src={dataUrl(o.favicon)} width="48" height="48" alt="" />
                <canvas width="16" height="16" class="size-16 [image-rendering:pixelated]" {@attach pixels(o.favicon)}
                        aria-label="The 16-pixel favicon, enlarged"></canvas>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">The iOS icon</h3>
        <p class="text-sm text-muted">
          The file, a full square of 180 pixels. Then as iOS shows it, with its corners rounded, on a light and a dark
          home screen.
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <img src={dataUrl(o.touch)} width="180" height="180" alt="" class="border border-line" />
          {#each WALLPAPERS as wall (wall)}
            <div class="flex items-center gap-4 rounded-xl p-5" style:background={wall}>
              <img src={dataUrl(o.touch)} width="120" height="120" alt="" class="rounded-[27px]" />
              <img src={dataUrl(o.touch)} width="60" height="60" alt="" class="rounded-[13px]" />
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">The link preview picture</h3>
        <p class="text-sm text-muted">1,200 × 630 pixels, as Hedge School's, shown here at half its size.</p>
        <img src={dataUrl(card(o))} width="1200" height="630" alt="The link preview picture with {o.name}"
             class="w-full max-w-150 h-auto rounded-md border border-line" />
      </div>

      {#if o.brief}
        <div class="space-y-2">
          <h3 class="font-semibold">The brief for an image generator</h3>
          <p class="max-w-3xl text-sm">
            This drawing is a simple one, by hand. Hedge School's collie was traced from drawings made with an image
            generator. A finished {o.name.replace(/^The /, "").toLowerCase()} would be made the same way, to this brief:
          </p>
          <blockquote class="max-w-3xl border-l-4 border-line pl-4 text-sm">{o.brief}</blockquote>
        </div>
      {/if}
    </section>
  {/each}
</main>
