<script lang="ts">
  // The site's own terms, the engine's terms, then the licences of what the site ships of others' work (design 11): in
  // the engine, the libraries in the pages, an icon, the sounds.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import LibraryNotices from "@abstractclass/site/LibraryNotices.svelte";

  // The engine release's terms (its LICENSE.txt: the engine's own code and the networks) and its notices (its
  // NOTICES.txt: the works compiled into the modules, with their licences' full texts), shipped beside the modules. The
  // engine's paragraph is the engine repository's wording (its games/enclosure/docs/design/21-release-terms.md), and
  // the outputs paragraph is LICENSE.txt's section "The engine's outputs", word for word (request 21).
  const shipped = (kind: string) => {
    const a = lock.artifacts.find(x => x.kind === kind);
    return a ? `/engine/${a.id}/${a.file}` : null;
  };
  const TERMS_URL = shipped("terms"), NOTICES_URL = shipped("notices");
  const REPOSITORY_URL = `https://github.com/${lock.repository}`;
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

  <h2>The engine</h2>
  <p>The engine, HedgeFund, and its networks: {SITE_COPYRIGHT}, all rights reserved. The engine is built from a fork of
    <a href="https://github.com/lightvector/KataGo">KataGo</a>. KataGo's code is under the MIT licence, and the other
    works that the engine compiles in are under their own licences. Each engine release carries its terms
    ({#if TERMS_URL}<a href={TERMS_URL}>LICENSE.txt</a>{:else}LICENSE.txt{/if}) and these licences
    ({#if NOTICES_URL}<a href={NOTICES_URL}>NOTICES.txt</a>{:else}NOTICES.txt{/if}).</p>
  <p><strong>The engine's outputs.</strong> The engine's outputs are what these files produce: analyses, moves, scores,
    win chances, policies, ownership, and the review files that hold them. You may keep, share and publish the outputs
    as analysis, for example the review of a game. Players and the sites that the holder works with may do so too. You
    must not use the outputs to train, distil or tune another model, network or engine, unless you have written
    permission from the holder. To ask, open an issue in <a href={REPOSITORY_URL}>the repository</a>.</p>
  <p>KataGo's copyright notice, with the MIT licence's terms below:</p>
  <pre>Copyright 2025 David J Wu ("lightvector") and/or other authors of the content in this repository.
(See 'CONTRIBUTORS' file for a list of authors as well as other indirect contributors).</pre>
  <p>The engine's modules contain code from:</p>
  <ul>
    {#each IN_MODULE as work (work)}<li>{work}</li>{/each}
  </ul>

  <LibraryNotices />

  <h2>An icon and the sounds</h2>
  <ul>
    <li>The thumbs-up of the Excellent label: <a href="https://fonts.google.com/icons">Material Design Icons</a>' "thumb_up",
      by Google, under the <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache License 2.0</a>.</li>
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
