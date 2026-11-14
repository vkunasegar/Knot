import type { SVGProps } from "react";
import type { Destination } from "./routes";

export type ShellIconName = Destination | "back" | "forward" | "sidebar" | "context" | "search" | "focus" | "exit";

const paths: Record<ShellIconName, string> = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  notes: "M7 3h10l3 3v15H4V3h3m9 0v5h4M8 12h8M8 16h6",
  threads: "M4 5c14 0 1 14 15 14M4 19c14 0 1-14 15-14",
  collections: "M3 7h7l2 2h9v11H3ZM3 7V4h7l2 2h9v3",
  favorites: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  archive: "M4 8h16v13H4ZM3 3h18v5H3Zm6 9h6",
  settings: "m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 2-3-2-2 1-3-3-2-1-3ZM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  back: "m14 5-7 7 7 7", forward: "m10 5 7 7-7 7",
  sidebar: "M3 4h18v16H3ZM9 4v16m-3-9v2",
  context: "M3 4h18v16H3Zm12 0v16m3-9v2",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
  focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  exit: "M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5",
};

/** Decorative icons; their owning controls always supply accessible labels. */
export function ShellIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: ShellIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
