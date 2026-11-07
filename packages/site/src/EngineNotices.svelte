<script lang="ts">
  // The engine's section of each site's notices page (design 11), inside its text style (prose.ts): the engine's terms,
  // then the works of others that its modules contain. The engine release's terms (its LICENSE.txt: the engine's own
  // code and the networks) and its notices (its NOTICES.txt: the works compiled into the modules, with their licences'
  // full texts) are shipped beside the modules, and the section links to both. The engine's paragraph is the engine
  // repository's wording (Enclosure's games/enclosure/docs/design/21-release-terms.md), and the outputs paragraph is
  // LICENSE.txt's section "The engine's outputs", word for word (Hedge School's request 21). Both games' releases have
  // that section and KataGo's copyright notice in the same words (apps/hedgeschool/tests/notices.spec.ts compares
  // them with the files that each site ships).

  interface Lock { repository: string; artifacts: { id: string; kind: string; file: string }[] }
  let { lock, engine, copyright, works }: {
    /** The site's engine.lock.json: its release's terms and notices, and its repository. */
    lock: Lock;
    /** The engine's name, as the site shows it. */
    engine: string;
    /** The holder's copyright of the engine and its networks. */
    copyright: string;
    /** The works that the release's NOTICES.txt lists, one line each, in its order. */
    works: string[];
  } = $props();

  const shipped = (kind: string) => {
    const a = lock.artifacts.find(x => x.kind === kind);
    return a ? `/engine/${a.id}/${a.file}` : null;
  };
  const termsUrl = $derived(shipped("terms")), noticesUrl = $derived(shipped("notices"));
  const repositoryUrl = $derived(`https://github.com/${lock.repository}`);
</script>

<h2>The engine</h2>
<p>The engine, {engine}, and its networks: {copyright}, all rights reserved. The engine is built from a fork of
  <a href="https://github.com/lightvector/KataGo">KataGo</a>. KataGo's code is under the MIT licence, and the other
  works that the engine compiles in are under their own licences. Each engine release carries its terms
  ({#if termsUrl}<a href={termsUrl}>LICENSE.txt</a>{:else}LICENSE.txt{/if}) and these licences
  ({#if noticesUrl}<a href={noticesUrl}>NOTICES.txt</a>{:else}NOTICES.txt{/if}).</p>
<p><strong>The engine's outputs.</strong> The engine's outputs are what these files produce: analyses, moves, scores,
  win chances, policies, ownership, and the review files that hold them. You may keep, share and publish the outputs
  as analysis, for example the review of a game. Players and the sites that the holder works with may do so too. You
  must not use the outputs to train, distil or tune another model, network or engine, unless you have written
  permission from the holder. To ask, open an issue in <a href={repositoryUrl}>the repository</a>.</p>
<p>KataGo's copyright notice, with the MIT licence's terms below:</p>
<pre>Copyright 2025 David J Wu ("lightvector") and/or other authors of the content in this repository.
(See 'CONTRIBUTORS' file for a list of authors as well as other indirect contributors).</pre>
<p>The engine's modules contain code from:</p>
<ul>
  {#each works as work (work)}<li>{work}</li>{/each}
</ul>
