<script lang="ts">
  // The engine measure's page (run.svelte.ts): what the run takes, then Start, then each result as it comes, and at the
  // end the results block with "Copy results". A site's page gives its name, its game's part (MeasureSite, made in the
  // browser: the default pool reads the device's cores) and its own metadata (PageMeta, noindex): no page of the site
  // links to it. The address's `seconds` sets each pool size's time, for the browser test (the default is
  // PHASE_SECONDS).
  import { onMount } from "svelte";
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { EngineMeasure, type MeasureSite, type Step } from "./run.svelte.ts";
  import { GPU_LIMIT_SECONDS, PHASE_SECONDS, poolRate, rate, reviewMinutes, type GpuResult } from "./measure.ts";

  let { name, site }: { name: string; site: () => MeasureSite } = $props();
  let m = $state<EngineMeasure | null>(null);
  let copied = $state<"" | "copied" | "refused">("");
  let block = $state<HTMLTextAreaElement>();

  onMount(() => {
    const seconds = Number(new URLSearchParams(location.search).get("seconds"));
    const measure = new EngineMeasure(site(), seconds > 0 ? seconds : PHASE_SECONDS);
    m = measure;
    void measure.load();
    return () => measure.end();
  });

  async function copy() {
    const text = m?.text ?? "";
    try {
      await navigator.clipboard.writeText(text);
      copied = "copied";
    } catch {
      // The clipboard refused (no permission, or no Clipboard API): the text is selected for the person to copy.
      copied = "refused";
      block?.focus();
      block?.select();
    }
  }

  const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

  function gpuLine(g: GpuResult | null, step: Step | undefined): string {
    if (step?.state === "running") return "Measuring…";
    if (step?.state === "stopped") return "Stopped: the tab was hidden.";
    if (step?.state === "failed") return "Failed.";
    if (!g) return "Waiting.";
    switch (g.state) {
      case "none": return `Not run: ${g.reason}.`;
      case "failed": return `The GPU worker did not start: ${g.message}`;
      case "unfinished": return `The test did not end within ${GPU_LIMIT_SECONDS} s.`;
      case "done": return `${rate(g.gpu)} evaluations a second, against ${rate(g.cpu)} visits a second for one CPU worker ` +
        `(${(g.gpu / g.cpu).toPrecision(2)} times).`;
    }
  }

  const poolSteps = $derived(m?.steps.filter(s => s.workers !== null) ?? []);
  const gpuStep = $derived(m?.steps.find(s => s.workers === null));
  const finished = $derived(m?.status === "done" || m?.status === "paused");
</script>

<main class={PROSE}>
  <h1>Engine measure</h1>
  <p>This page measures {name}'s engine on this device. It measures how fast the review searches with each number
    of workers, from 1 to the device's logical cores, and how fast the GPU searches against one worker. It changes no
    setting and keeps nothing. At the end, it gives the results as text to copy.</p>

  {#if !m || m.status === "loading"}
    <p>Loading…</p>
  {:else if m.error}
    <p class="text-blunder" role="alert">The measure cannot run here: {m.error}.</p>
  {:else}
    {#if m.status === "ready"}
      <p data-testid="measure-estimate">The measure takes approximately <strong>{minutes(m.estimate)} minutes</strong>
        on this device ({m.device?.cores} logical cores).</p>
      <p>Before you start:</p>
      <ul>
        <li>Connect the device to a power supply.</li>
        <li>Close the apps that you do not use.</li>
        <li>On a phone, turn off the low-power mode.</li>
        <li>Keep this tab in front and keep the screen on until the measure is done. If you hide the tab, the measure
          that runs stops.</li>
      </ul>
      <p><button class="btn-primary" onclick={() => m?.start()}>Start</button></p>
    {/if}

    {#if m.status === "running"}
      {@const live = m.live}
      <p data-testid="measure-progress">
        <progress class="w-full" max={m.steps.length} value={m.done}></progress><br />
        Measure {Math.min(m.steps.length, m.done + 1)} of {m.steps.length}{#if live}: {live.step}, {live.note},
          {live.seconds.toFixed(0)} s{#if live.step !== "the GPU"}{" "}of {live.of} s, {live.searches} searches done{/if}{/if}.
        Keep this tab in front.
      </p>
    {/if}

    {#if m.status === "paused" && m.hiddenStop}
      <div role="alert" class="mb-3">
        <p>The tab was hidden, so the measure of {m.hiddenStop} stopped. The page did not keep its numbers.</p>
        <p>Keep this tab in front, then select "Run it again".</p>
        <p><button class="btn-primary" onclick={() => m?.start()}>Run it again</button></p>
      </div>
    {/if}

    <h2>The review's speed</h2>
    <p>The review's label stage, {m.site.review} ({m.site.visits} visits a position), on positions of {m.site.game}. Each
      number of workers searches for {m.phaseSeconds} s.</p>
    <table class="tabular-nums" data-testid="measure-pools">
      <thead><tr><th>Workers</th><th>Visits a second</th><th>Each worker</th><th>Searches</th><th>A review of the game</th></tr></thead>
      <tbody>
        {#each poolSteps as step (step.name)}
          {@const p = m.pools[step.workers! - 1]}
          <tr>
            <td>{step.workers}</td>
            {#if p}
              <td>{rate(poolRate(p))}</td><td>{rate(poolRate(p) / p.workers)}</td><td>{p.searches}</td>
              <td>{reviewMinutes(m.site.positions.length, m.site.visits, poolRate(p)).toFixed(1)} min</td>
            {:else}
              <td colspan="4" class="text-muted">{step.state === "running" ? "Measuring…" : step.state === "stopped"
                ? "Stopped: the tab was hidden." : step.state === "failed" ? "Failed." : "Waiting."}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>

    <h2>The GPU</h2>
    <p data-testid="measure-gpu">{gpuLine(m.gpu, gpuStep)}</p>

    {#if finished}
      <h2>The results</h2>
      {#if m.status === "done"}<p>The measure is done. Copy the results, then paste them into the chat.</p>{/if}
      <p><button class="btn-primary" onclick={copy}>Copy results</button>
        {#if copied === "copied"}<span role="status"> The results are copied.</span>{/if}</p>
      {#if copied === "refused"}
        <p role="alert">The browser did not let the page copy the results. The text below is selected. Press Ctrl+C, or
          touch and hold the text and select Copy.</p>
      {/if}
      <textarea bind:this={block} readonly rows="16" class="w-full p-2 font-mono text-xs bg-panel border border-line rounded"
                aria-label="The results" data-testid="measure-block">{m.text}</textarea>
    {/if}
  {/if}
</main>
