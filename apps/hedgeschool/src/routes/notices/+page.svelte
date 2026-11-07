<script lang="ts">
  // The site's own terms, the engine's terms, then the licences of what the site ships of others' work (design 11): in
  // the engine, the libraries, ONNX Runtime Web and the font Fira Code in the pages, an icon, the sounds. The engine's
  // section, the libraries' and the icon's are the shared parts of packages/site, which Cyanotype's page shows too.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import EngineNotices from "@abstractclass/site/EngineNotices.svelte";
  import LibraryNotices from "@abstractclass/site/LibraryNotices.svelte";
  import ThumbUpNotice from "@abstractclass/site/ThumbUpNotice.svelte";

  // The works in the engine's modules, as the release's NOTICES.txt lists them.
  const IN_MODULE = [
    "KataGo (MIT), with its sha2.cpp from Aaron D. Gifford's SHA-2 (BSD-3-Clause)",
    "JSON for Modern C++ 3.8.0, by Niels Lohmann (MIT)",
    "Eigen 3.4.0 (MPL-2.0), unmodified, in the CPU module only",
    "the LLVM 19.1.5 runtime libraries: libc++, libc++abi and compiler-rt (Apache-2.0 WITH LLVM-exception)",
    "wasi-libc (Apache-2.0 WITH LLVM-exception, Apache-2.0 or MIT), with parts from musl (MIT) and cloudlibc (BSD-2-Clause)",
  ];
</script>

<PageMeta title="Notices · {SITE_NAME}" description="The licences of the works that Hedge School uses, and the terms of its engine." />

<main class={PROSE}>
  <h1>Notices</h1>

  <h2>{SITE_NAME}</h2>
  <p>{SITE_NAME}'s own code, text and design are {SITE_COPYRIGHT}. All rights reserved.</p>
  <p>The other works below are by others. Their licences cover those works only, not {SITE_NAME} or its engine.</p>

  <EngineNotices {lock} engine="HedgeFund" copyright={SITE_COPYRIGHT} works={IN_MODULE} />

  <LibraryNotices />

  <h2>An icon and the sounds</h2>
  <ul>
    <ThumbUpNotice />
    <li>The button sound of a move: "Select Button UI" by Emilianodleon
      (<a href="https://pixabay.com/sound-effects/film-special-effects-select-button-ui-395763/">Pixabay 395763</a>) and
      "Button Press" by DRAGON-STUDIO
      (<a href="https://pixabay.com/sound-effects/film-special-effects-button-press-382713/">Pixabay 382713</a>), under
      the <a href="https://pixabay.com/service/terms/">Pixabay Content License</a>.</li>
    <li>The pencil sound of a move: four strokes from "Pencil_lines" by tmkappelt
      (<a href="https://freesound.org/people/tmkappelt/sounds/85702/">Freesound 85702</a>), dedicated to the public
      domain (CC0).</li>
  </ul>
</main>

<SiteFooter />
