export interface DocPage {
  href: string;
  label: string;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const docsNav: DocSection[] = [
  {
    title: "Getting started",
    pages: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
    ],
  },
  {
    title: "Using it",
    pages: [
      { href: "/docs/theming", label: "Theming" },
      { href: "/docs/editor", label: "Editor API" },
      { href: "/docs/toolbar", label: "Toolbar primitives" },
    ],
  },
  {
    title: "Extending it",
    pages: [{ href: "/docs/plugins", label: "Plugins" }],
  },
  {
    title: "Reference",
    pages: [{ href: "/compare", label: "vs. Google Docs / Word" }],
  },
];

export const flatPages: DocPage[] = docsNav.flatMap((s) => s.pages);

export function getNeighbors(currentPath: string) {
  const normalised = currentPath.replace(/\/$/, "") || "/docs";
  const idx = flatPages.findIndex(
    (p) => p.href.replace(/\/$/, "") === normalised,
  );
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flatPages[idx - 1] : null,
    next: idx < flatPages.length - 1 ? flatPages[idx + 1] : null,
  };
}
