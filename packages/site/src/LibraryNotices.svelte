<script lang="ts">
  // The libraries that the sites' pages ship (design 11), each MIT-licensed, with the licence's text: on each site's
  // notices page, inside its text style (prose.ts). Their copyright lines are their own (node_modules/*/LICENSE).
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
