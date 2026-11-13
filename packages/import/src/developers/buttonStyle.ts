// The partners' buttons' sample style, which the section "Buttons" of the sites' pages for developers shows and uses
// (Hedge School's design 18, item 11). Both sites' accent is the same pale lavender (Cyanotype's design 33,
// "Consequences"), so the style is one, and each site gives only its class name.

/** The sample style under the class `className`, as `.hedge-school-button { … }`. */
export const buttonCss = (className: string): string => `.${className} {
  display: inline-flex; align-items: center; gap: 0.45em;
  padding: 0.35em 0.95em 0.35em 0.45em; border: 0; border-radius: 999px;
  background: #b8a6e8; color: #16181c; font: 600 15px/1.4 system-ui, sans-serif;
  text-decoration: none; cursor: pointer;
}
.${className}:hover { background: #c6b8ee; }
.${className} img { width: 1.5em; height: 1.5em; margin: 0; flex: none; }`;
