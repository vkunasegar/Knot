import type { SVGProps } from "react";

/**
 * Small inline interface icons used by the shared components.
 *
 * Icons are always decorative here: every component that shows one also shows
 * a text label, so the SVGs are hidden from assistive technology and never
 * receive focus. They draw with `currentColor` to inherit the text color.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

/** Shared SVG attributes: 16×16 grid, stroked, hidden from the accessibility tree. */
function iconProps(props: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

/** Check mark for successful or completed states. */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/** Circled exclamation mark for errors and warnings. */
export function AlertIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.75" />
      <path d="M8 11.25h.01" />
    </svg>
  );
}

/** Circled "i" for neutral information. */
export function InfoIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.5v3.75" />
      <path d="M8 4.75h.01" />
    </svg>
  );
}

/** Cross used by close buttons. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** Folded page used to mark note references. */
export function NoteIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 2.75h5.25L12 5.5v7.75H4z" />
      <path d="M9 2.75V5.75h3" />
    </svg>
  );
}

/** Open circle used while an operation is in progress. */
export function PendingIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8" cy="8" r="5.5" strokeDasharray="3 2.5" />
    </svg>
  );
}
