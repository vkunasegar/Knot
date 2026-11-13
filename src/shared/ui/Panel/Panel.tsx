import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../cx";
import "./Panel.css";

export type PanelElevation = 0 | 1 | 2;

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Heading rendered at the top of the panel and linked via `aria-labelledby`. */
  title: string;
  /** Optional subtitle shown below the heading. */
  subtitle?: string;
  /** Optional controls placed at the trailing edge of the header. */
  actions?: ReactNode;
  /** Heading level used for the title. Defaults to `h2`. */
  headingLevel?: "h2" | "h3" | "h4";
  /** Shadow depth from the elevation token scale. Defaults to `1`. */
  elevation?: PanelElevation;
}

/**
 * Framed surface container for inspector sections, cards and grouped controls.
 *
 * Renders a `<section>` labelled by its own heading, so landmark navigation
 * can jump between panels and screen readers announce the panel's name.
 */
export function Panel({
  title,
  subtitle,
  actions,
  headingLevel: Heading = "h2",
  elevation = 1,
  className,
  children,
  ...sectionProps
}: PanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cx("knot-panel", `knot-panel--elevation-${elevation}`, className)}
      {...sectionProps}
    >
      <header className="knot-panel__header">
        <div className="knot-panel__titles">
          <Heading id={headingId} className="knot-panel__title">
            {title}
          </Heading>
          {subtitle && <p className="knot-panel__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="knot-panel__actions">{actions}</div>}
      </header>
      <div className="knot-panel__body">{children}</div>
    </section>
  );
}
