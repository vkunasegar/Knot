import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  KnotMotif,
  NoteChip,
  Panel,
  SaveStatus,
  StatusMessage,
  TextField,
  Tooltip,
} from "../shared/ui";
import "./DesignPreview.css";

interface Swatch {
  name: string;
  token: string;
  hex: string;
}

const COLOR_SWATCHES: Swatch[] = [
  { name: "Canvas", token: "--knot-color-canvas", hex: "#F7F5F0" },
  { name: "Surface", token: "--knot-color-surface", hex: "#FFFEFB" },
  { name: "Primary text", token: "--knot-color-text", hex: "#252525" },
  { name: "Secondary text", token: "--knot-color-text-secondary", hex: "#6B6964" },
  { name: "Muted accent", token: "--knot-color-text-muted", hex: "#777570" },
  { name: "Border", token: "--knot-color-border", hex: "#E6E2DB" },
  { name: "Signature thread", token: "--knot-color-thread", hex: "#C66B54" },
  { name: "Thread strong", token: "--knot-color-thread-strong", hex: "#A4503B" },
  { name: "Ink blue", token: "--knot-color-ink", hex: "#405B72" },
  { name: "Error", token: "--knot-color-error", hex: "#B42318" },
];

const TYPE_SAMPLES = [
  { label: "Display · 3rem", className: "preview-type--display", text: "Every thought is a thread." },
  { label: "3XL · 2.25rem", className: "preview-type--3xl", text: "Quiet tools for connected notes" },
  { label: "2XL · 1.75rem", className: "preview-type--2xl", text: "Section & dialog headings" },
  { label: "XL · 1.375rem", className: "preview-type--xl", text: "Panel titles & group headers" },
  { label: "Body · 1rem", className: "preview-type--md", text: "The writing body stays calm." },
  { label: "Small · 0.875rem", className: "preview-type--sm", text: "Controls and secondary metadata." },
  { label: "XS · 0.75rem", className: "preview-type--xs", text: "Timestamps, status pills, hints" },
];

const SPACING_STEPS = [4, 8, 12, 16, 24, 32, 48, 64] as const;

/**
 * Internal catalogue of the KNOT design system.
 *
 * Renders every token group and shared primitive on a single page so visual
 * consistency, keyboard focus, screen reader semantics, contrast and reduced
 * motion can be inspected together at 1600×1000 and 1440×900. All text shown
 * here is static specimen copy local to this module.
 */
export function DesignPreview() {
  const [moreContrast, setMoreContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string>("note-1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [titleValue, setTitleValue] = useState("Local-first architecture");

  // Mirror the preview toggles onto <html> so the CSS token overrides apply
  // across the whole document, including native modal dialogs in the top layer.
  useEffect(() => {
    const root = document.documentElement;
    if (moreContrast) {
      root.setAttribute("data-knot-contrast", "more");
    } else {
      root.removeAttribute("data-knot-contrast");
    }
  }, [moreContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) {
      root.setAttribute("data-knot-motion", "reduce");
    } else {
      root.removeAttribute("data-knot-motion");
    }
  }, [reduceMotion]);

  return (
    <div className="design-preview">
      <header className="design-preview__header">
        <div className="design-preview__brand">
          <KnotMotif variant="mark" />
          <div>
            <p className="design-preview__eyebrow">Internal design system preview</p>
            <h1 className="design-preview__title">KNOT Visual Foundation</h1>
          </div>
        </div>
        <div className="design-preview__toggles" role="group" aria-label="Preview environment modes">
          <Button
            variant={moreContrast ? "primary" : "secondary"}
            size="sm"
            aria-pressed={moreContrast}
            onClick={() => setMoreContrast((current) => !current)}
          >
            More contrast
          </Button>
          <Button
            variant={reduceMotion ? "primary" : "secondary"}
            size="sm"
            aria-pressed={reduceMotion}
            onClick={() => setReduceMotion((current) => !current)}
          >
            Reduce motion
          </Button>
        </div>
      </header>

      <main className="design-preview__grid">
        {/* ---- 1. Color tokens -------------------------------------------- */}
        <Panel
          title="Color tokens"
          subtitle="Warm ivory, terracotta thread, ink-blue focus"
        >
          <ul className="preview-swatches">
            {COLOR_SWATCHES.map((swatch) => (
              <li key={swatch.token} className="preview-swatch">
                <span
                  className="preview-swatch__color"
                  style={{ background: `var(${swatch.token})` }}
                  aria-hidden="true"
                />
                <span className="preview-swatch__name">{swatch.name}</span>
                <code className="preview-swatch__code">{swatch.hex}</code>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- 2. Typography ---------------------------------------------- */}
        <Panel title="Typography scale" subtitle="Playfair Display headings · Inter interface">
          <ul className="preview-type-list">
            {TYPE_SAMPLES.map((sample) => (
              <li key={sample.label} className="preview-type-item">
                <span className="preview-type-meta">{sample.label}</span>
                <p className={sample.className}>{sample.text}</p>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- 3. Spacing & motif ----------------------------------------- */}
        <Panel
          title="Spacing, radii & thread motif"
          subtitle="4–64 px scale and standalone decorative SVG"
        >
          <div className="preview-spacing">
            {SPACING_STEPS.map((step) => (
              <div key={step} className="preview-spacing__row">
                <code className="preview-spacing__label">{step}px</code>
                <span
                  className="preview-spacing__bar"
                  style={{ width: `var(--knot-space-${step})` }}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
          <div className="preview-motif-box">
            <KnotMotif variant="flourish" />
            <p className="preview-caption">
              Single continuous asymmetric thread (`aria-hidden`, never placed between notes).
            </p>
          </div>
        </Panel>

        {/* ---- 4. Buttons, tooltips, chips & dialog ----------------------- */}
        <Panel
          title="Buttons & tooltips"
          subtitle="Hover lifts subtly; focus shows an ink-blue double ring"
        >
          <div className="preview-row">
            <Button variant="primary">Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="quiet">Quiet action</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
          <div className="preview-row">
            <Tooltip content="Open search palette (Ctrl+K)">
              <Button variant="secondary" size="sm">
                Search shortcut
              </Button>
            </Tooltip>
            <Tooltip content="Enter distraction-free editor (Esc exits)">
              <Button variant="quiet" size="sm">
                Focus mode hint
              </Button>
            </Tooltip>
          </div>
        </Panel>

        <Panel
          title="Note chips & modal dialog"
          subtitle="No decorative thread tails; selection uses border + tint"
        >
          <div className="preview-row" role="group" aria-label="Interactive note chips">
            <NoteChip
              title="On tactile software"
              meta="Thread · 1"
              selected={selectedChip === "note-1"}
              onSelect={() => setSelectedChip("note-1")}
            />
            <NoteChip
              title="SQLite migration policy"
              meta="Thread · 2"
              selected={selectedChip === "note-2"}
              onSelect={() => setSelectedChip("note-2")}
            />
            <NoteChip title="Read-only reference" meta="Collection" />
          </div>
          <div className="preview-row">
            <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
              Open confirmation dialog
            </Button>
          </div>
        </Panel>

        {/* ---- 5. Text fields --------------------------------------------- */}
        <Panel title="Text fields" subtitle="Explicit labels, helper hints and icon-backed errors">
          <TextField
            label="Note title"
            value={titleValue}
            onChange={(event) => setTitleValue(event.target.value)}
            hint="Titles are indexed for instant offline search."
          />
          <TextField
            label="Collection name"
            defaultValue=""
            placeholder="e.g. Field observations"
            error="Enter a collection name before saving."
          />
          <TextField label="Storage location" defaultValue="~/.local/share/com.knot.desktop" disabled />
        </Panel>

        {/* ---- 6. Status components --------------------------------------- */}
        <Panel
          title="Save status & messages"
          subtitle="Saved is shown only after a durable write; errors use role=alert"
          className="design-preview__status-panel"
        >
          <div className="preview-row">
            <SaveStatus state="idle" />
            <SaveStatus state="saving" />
            <SaveStatus state="saved" />
            <SaveStatus state="error" detail="Disk full" />
          </div>
          <div className="preview-status-grid">
            <StatusMessage tone="info" title="No connections on this note yet">
              Link two notes when a real relationship exists.
            </StatusMessage>
            <StatusMessage
              tone="success"
              title="Note moved to archive"
              action={
                <Button variant="secondary" size="sm">
                  Undo
                </Button>
              }
            />
            <StatusMessage tone="warning" title="Backup is older than 7 days" />
            <StatusMessage
              tone="error"
              title="Could not write note to disk"
              action={
                <Button variant="secondary" size="sm">
                  Retry
                </Button>
              }
            />
          </div>
        </Panel>
      </main>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete collection?"
        description="Deleting a collection removes the grouping only. None of its notes are deleted."
        footer={
          <>
            <Button variant="quiet" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Delete collection
            </Button>
          </>
        }
      >
        <p className="preview-dialog-copy">
          The 3 notes in “Field observations” will remain available in All Notes and in their threads.
        </p>
      </Dialog>
    </div>
  );
}
