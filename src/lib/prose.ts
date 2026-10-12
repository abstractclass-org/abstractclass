// The text style of the pages about the site (about, the notation, privacy, notices): headings, paragraphs, lists,
// code and tables inside one container, as Tailwind classes on the container (design 11).
export const PROSE = [
  "box-content max-w-[760px] mx-auto my-6 px-4",
  "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold",
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:font-bold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-3",
  "[&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mb-1 [&_code]:font-mono [&_code]:text-[0.92em]",
  "[&_pre]:mb-3 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:bg-panel [&_pre]:border [&_pre]:border-line [&_pre]:rounded",
  "[&_pre]:font-mono [&_pre]:text-sm [&_table]:mb-3 [&_table]:text-sm [&_th]:pr-4 [&_th]:text-left [&_td]:pr-4",
  "[&_td]:align-top [&_th]:pb-1",
].join(" ");
