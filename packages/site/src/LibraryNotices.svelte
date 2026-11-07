<script lang="ts">
  // The works of others that the sites' pages ship (design 11), on each site's notices page (NoticesPage.svelte),
  // inside its text style (prose.ts): the libraries, ONNX Runtime Web and the font. The libraries are under the MIT
  // licence. The page gives the copyright line of each library, as its node_modules/*/LICENSE has it, and then the
  // licence's text. The font Fira Code (site.css) is under the SIL Open Font License 1.1. That licence asks that each
  // copy of the font carries its copyright line and the licence. The page gives both word for word from the package's
  // LICENSE file (apps/hedgeschool/tests/notices.spec.ts compares them).
  // The libraries are the packages whose code the sites' JavaScript holds. A build with source maps lists them
  // (`node ../../node_modules/vite/bin/vite.js build --sourcemap` in a site's folder: the packages under node_modules
  // in the maps' `sources`). Floating UI's are @floating-ui/core, dom and utils. esm-env leaves only constants. Tailwind
  // CSS is in the style sheet, and ONNX Runtime Web has its own section below.
  const MIT = [
    ["Svelte", "https://github.com/sveltejs/svelte", "Copyright (c) 2016-2025 Svelte Contributors"],
    ["clsx", "https://github.com/lukeed/clsx", "Copyright (c) Luke Edwards"],
    ["SvelteKit", "https://github.com/sveltejs/kit", "Copyright (c) 2020 SvelteKit contributors"],
    ["devalue", "https://github.com/sveltejs/devalue",
      "Copyright (c) 2018-19 these people (https://github.com/rich-harris/devalue/graphs/contributors)"],
    ["Bits UI", "https://github.com/huntabyte/bits-ui", "Copyright (c) 2023 Hunter Johnston"],
    ["Runed", "https://github.com/svecosystem/runed", "Copyright (c) 2024 Hunter Johnston"],
    ["svelte-toolbelt", "https://github.com/svecosystem/svelte-toolbelt", "Copyright (c) 2024 Hunter Johnston"],
    ["style-to-object", "https://github.com/remarkablemark/style-to-object", 'Copyright (c) 2017 Menglin "Mark" Xu'],
    ["inline-style-parser", "https://github.com/remarkablemark/inline-style-parser", "Copyright (c) 2012 TJ Holowaychuk"],
    ["Floating UI", "https://github.com/floating-ui/floating-ui", "Copyright (c) 2021-present Floating UI contributors"],
    ["tabbable", "https://github.com/focus-trap/tabbable", "Copyright (c) 2015 David Clark"],
    ["esm-env", "https://github.com/benmccann/esm-env", "Copyright 2022 Benjamin McCann"],
    ["Tailwind CSS", "https://github.com/tailwindlabs/tailwindcss", "Copyright (c) Tailwind Labs, Inc."],
  ];
  // ONNX Runtime Web, for the engine on the GPU (packages/engine's gpuWorker.ts and the files ort-<version> that
  // fetch-engine.mjs ships beside the engine). Its npm package has no LICENSE file. The copyright line is the banner of
  // its files (dist/ort.webgpu.min.mjs), and the licence is MIT, as its package.json and the repository's LICENSE give.
  // Its WebAssembly module also contains the works that the repository's ThirdPartyNotices.txt lists. The version is
  // the package's (notices.spec.ts compares both with node_modules/onnxruntime-web).
  const ORT_VERSION = "1.30.0";
  const ORT_COPYRIGHT = "Copyright (c) Microsoft Corporation. All rights reserved.";
</script>

<h2>The pages</h2>
<p>These libraries are under the MIT licence, with their own copyright lines:</p>
<ul>
  {#each MIT as [name, href, copyright] (name)}<li><a {href}>{name}</a>: {copyright}.</li>{/each}
</ul>

<h2>The engine on the GPU</h2>
<p>
  On the GPU, the engine runs its network with <a href="https://github.com/microsoft/onnxruntime">ONNX Runtime Web</a>
  {ORT_VERSION}, under the MIT licence:
</p>
<p>{ORT_COPYRIGHT}</p>
<p>
  Its WebAssembly module also contains works of others, under their own licences. ONNX Runtime's
  <a href="https://github.com/microsoft/onnxruntime/blob/v{ORT_VERSION}/ThirdPartyNotices.txt">ThirdPartyNotices.txt</a>
  lists them.
</p>

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

<h2>The font</h2>
<p>
  The sites' monospaced font is <a href="https://github.com/tonsky/FiraCode">Fira Code</a>, under the SIL Open Font
  License, Version 1.1:
</p>
<p>Copyright 2014-2020 The Fira Code Project Authors (https://github.com/tonsky/FiraCode)</p>

<h2>The SIL Open Font License, of the font above</h2>
<pre class="whitespace-pre-wrap">SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.</pre>
