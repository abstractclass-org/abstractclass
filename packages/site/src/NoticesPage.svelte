<script lang="ts">
  // Each site's notices page (design 11), the same on every site: the site's own terms, the engine's terms and the
  // works of others in its modules, then what the pages ship of others' work (LibraryNotices.svelte: the libraries,
  // ONNX Runtime Web and the font Fira Code), and the icon. A site that ships sounds gives their items (`sounds`), and
  // the last section's title names them. Each site puts its own footer after the page.
  //
  // The engine release's terms (its LICENSE.txt: the engine's own code and the networks) and its notices (its
  // NOTICES.txt: the works compiled into the modules, with their licences' full texts) are shipped beside the modules,
  // and the engine's section links to both. Its first paragraph is the engine repository's wording (Enclosure's
  // games/enclosure/docs/design/21-release-terms.md), and the outputs paragraph is LICENSE.txt's section "The engine's
  // outputs", word for word (Hedge School's request 21). Enclosure's and Blueprints' releases have that section,
  // KataGo's copyright notice and the works in their modules in the same words (apps/hedgeschool/tests/notices.spec.ts
  // compares the page with the files that each site ships).
  import type { Snippet } from "svelte";
  import PageMeta from "./PageMeta.svelte";
  import LibraryNotices from "./LibraryNotices.svelte";
  import { PROSE } from "./prose.ts";

  interface Lock { repository: string; artifacts: { id: string; kind: string; file: string; dir?: string }[] }
  let { site, copyright, engine, lock, sounds }: {
    /** The site's name. */
    site: string;
    /** The holder's copyright of the site, the engine and its networks. */
    copyright: string;
    /** The engine's name, as the site shows it. */
    engine: string;
    /** The site's engine.lock.json: its release's terms and notices, and its repository. */
    lock: Lock;
    /** The list items of the sounds that the site ships, if any. */
    sounds?: Snippet;
  } = $props();

  /** The address of the lock's file of this kind, which the site serves beside the modules, by fetch-engine.mjs's rule.
   *  A lock with no such file stops the build: the site would ship the engine without its terms or its notices. */
  const shipped = (kind: "terms" | "notices") => {
    const a = lock.artifacts.find(x => x.kind === kind);
    if (!a) throw new Error(`engine.lock.json names no "${kind}" artifact: the site must ship the engine's ${kind}`);
    return `/engine/${a.dir ?? a.id}/${a.file}`;
  };

  // The works in the engine's modules, as each release's NOTICES.txt lists them. Eigen is in the modules that run the
  // network on the CPU: the engine's CPU module, the one-thread practice bot and the evaluator.
  const IN_MODULE = [
    "KataGo (MIT), with its sha2.cpp from Aaron D. Gifford's SHA-2 (BSD-3-Clause)",
    "JSON for Modern C++ 3.8.0, by Niels Lohmann (MIT)",
    "Eigen 3.4.0 (MPL-2.0), unmodified, only in the modules that run the network on the CPU",
    "the LLVM 19.1.5 runtime libraries: libc++, libc++abi and compiler-rt (Apache-2.0 WITH LLVM-exception)",
    "wasi-libc (Apache-2.0 WITH LLVM-exception, Apache-2.0 or MIT), with parts from musl (MIT) and cloudlibc (BSD-2-Clause)",
  ];
</script>

<PageMeta title="Notices · {site}" description="The licences of the works that {site} uses, and the terms of its engine." />

<main class={PROSE}>
  <h1>Notices</h1>

  <h2>{site}</h2>
  <p>{site}'s own code, text and design are {copyright}. All rights reserved.</p>
  <p>The other works below are by others. Their licences cover those works only, not {site} or its engine.</p>

  <h2>The engine</h2>
  <p>The engine, {engine}, and its networks: {copyright}, all rights reserved. The engine is built from a fork of
    <a href="https://github.com/lightvector/KataGo">KataGo</a>. KataGo's code is under the MIT licence, and the other
    works that the engine compiles in are under their own licences. Each engine release carries its terms
    (<a href={shipped("terms")}>LICENSE.txt</a>) and these licences (<a href={shipped("notices")}>NOTICES.txt</a>).</p>
  <p><strong>The engine's outputs.</strong> The engine's outputs are what these files produce: analyses, moves, scores,
    win chances, policies, ownership, and the review files that hold them. You may keep, share and publish the outputs
    as analysis, for example the review of a game. Players and the sites that the holder works with may do so too. You
    must not use the outputs to train, distil or tune another model, network or engine, unless you have written
    permission from the holder. To ask, open an issue in
    <a href="https://github.com/{lock.repository}">the repository</a>.</p>
  <p>KataGo's copyright notice, with the MIT licence's terms below:</p>
  <pre>Copyright 2025 David J Wu ("lightvector") and/or other authors of the content in this repository.
(See 'CONTRIBUTORS' file for a list of authors as well as other indirect contributors).</pre>
  <p>The engine's modules contain code from:</p>
  <ul>
    {#each IN_MODULE as work (work)}<li>{work}</li>{/each}
  </ul>

  <LibraryNotices />

  <h2>{sounds ? "An icon and the sounds" : "An icon"}</h2>
  <ul>
    <!-- The icon of the quality label Excellent: packages/analysis's model.ts, THUMB_UP. -->
    <li>The thumbs-up of the Excellent quality label: <a href="https://fonts.google.com/icons">Material Design Icons</a>' "thumb_up",
      by Google, under the <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache License 2.0</a>.</li>
    {@render sounds?.()}
  </ul>
</main>
