<script lang="ts">
  // The site's own terms, the engine's terms, then the licences of what the site ships of others' work (design 11): in
  // the engine, the libraries in the pages, an icon, the sounds.
  import { PROSE } from "#lib/prose.ts";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json";

  // The engine release's terms (its LICENSE.txt: the engine's own code and the networks) and its notices (its
  // NOTICES.txt: the works compiled into the modules, with their licences' full texts), shipped beside the modules. The
  // engine's paragraph is the engine repository's wording (its v2/docs/design/21-release-terms.md).
  const shipped = (kind: string) => {
    const a = lock.artifacts.find(x => x.kind === kind);
    return a ? `/engine/${a.id}/${a.file}` : null;
  };
  const TERMS_URL = shipped("terms"), NOTICES_URL = shipped("notices");
  const IN_MODULE = [
    "KataGo (MIT), with its sha2.cpp from Aaron D. Gifford's SHA-2 (BSD-3-Clause)",
    "JSON for Modern C++ 3.8.0, by Niels Lohmann (MIT)",
    "Eigen 3.4.0 (MPL-2.0), unmodified, in the CPU module only",
    "the LLVM 19.1.5 runtime libraries: libc++, libc++abi and compiler-rt (Apache-2.0 WITH LLVM-exception)",
    "wasi-libc (Apache-2.0 WITH LLVM-exception, Apache-2.0 or MIT), with parts from musl (MIT) and cloudlibc (BSD-2-Clause)",
  ];

  // The libraries in the pages, each MIT-licensed. Their copyright lines are their own (node_modules/*/LICENSE).
  const MIT = [
    ["Svelte", "https://github.com/sveltejs/svelte", "Copyright (c) 2016-2025 Svelte Contributors"],
    ["SvelteKit", "https://github.com/sveltejs/kit", "Copyright (c) 2020 SvelteKit contributors"],
    ["Bits UI", "https://github.com/huntabyte/bits-ui", "Copyright (c) 2023 Hunter Johnston"],
    ["Runed", "https://github.com/svecosystem/runed", "Copyright (c) 2024 Hunter Johnston"],
    ["svelte-toolbelt", "https://github.com/svecosystem/svelte-toolbelt", "Copyright (c) 2024 Hunter Johnston"],
    ["Floating UI", "https://github.com/floating-ui/floating-ui", "Copyright (c) 2021-present Floating UI contributors"],
    ["tabbable", "https://github.com/focus-trap/tabbable", "Copyright (c) 2015 David Clark"],
    ["esm-env", "https://github.com/benmccann/esm-env", "Copyright 2022 Benjamin McCann"],
    ["Tailwind CSS", "https://github.com/tailwindlabs/tailwindcss", "Copyright (c) Tailwind Labs, Inc."],
  ];
</script>

<svelte:head><title>Notices · {SITE_NAME}</title></svelte:head>

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
  <p>KataGo's copyright notice, with the MIT licence's terms below:</p>
  <pre>Copyright 2025 David J Wu ("lightvector") and/or other authors of the content in this repository.
(See 'CONTRIBUTORS' file for a list of authors as well as other indirect contributors).</pre>
  <p>The engine's modules contain code from:</p>
  <ul>
    {#each IN_MODULE as work (work)}<li>{work}</li>{/each}
  </ul>

  <h2>The pages</h2>
  <p>These libraries are under the MIT licence, with their own copyright lines:</p>
  <ul>
    {#each MIT as [name, href, copyright] (name)}<li><a {href}>{name}</a>: {copyright}.</li>{/each}
  </ul>

  <h2>The MIT licence, of the works above</h2>
  <pre class="whitespace-pre-wrap">Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</pre>

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
