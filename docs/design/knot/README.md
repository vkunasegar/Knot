# KNOT — Design contract and six screens

**North star:** “Every thought is a thread. Every connection creates meaning.”

This design contract is binding across Linux, Windows and macOS. Intended reference desktop window **1600×1000** (also **1440×900**).

## Visual tokens
- Canvas warm ivory `#F7F5F0`, surface `#FFFEFB`, primary text `#252525`, secondary `#777570`, border `#E6E2DB`, signature thread `#C66B54`, secondary ink `#405B72`.
- Small terracotta text must use a darker contrast-safe token, not the brand accent without verification.
- Headings: restrained editorial serif (e.g. Playfair Display); interface: clean sans (e.g. Inter), with license checks and fallbacks.
- Spacing scale 4/8/12/16/24/32/48/64; sidebar 208–224 px expanded / ~68 px rail; inspector 300–336 px.
- Thread paths must encode actual relationships or interaction state; no random network decoration or noisy editor canvas.
- **Navigation:** Home, All Notes, Threads (switch list/Weave), Collections, Favorites, Archive; Settings at bottom.
- **Search:** Ctrl/Cmd+K; **Focus** is an editor mode, not a separate nav entry.

## Screens / issue acceptance source
1. **Home:** greeting, immediate quick capture, pinned/recent notes, active threads, recently explored connections; no metrics dashboard.
2. **Editor:** title, breadcrumbs, rich text, autosave with honest status, optional connections inspector and one small thread marker. The writing body stays calm.
3. **The Weave:** purposeful curves, deterministic layout, select/pan/zoom, filters, meaningful clusters, inspector, keyboard-friendly list fallback.
4. **Collections:** minimal cards with content-derived knot signature; CRUD, sort/list/grid and visible note membership; deleting group does not delete its notes.
5. **Search:** modal palette and preview, notes/collections/threads/actions, arrow-key navigation, accessible focus and escape.
6. **Focus:** same live editor/document, unobstructed narrow column, exit restores panels and cursor; reduced motion.

## Interaction and accessibility contract
Hover = subtle stroke/translation; selected = semantic line-weight and clear outline; drag-to-connect = elastic preview with explicit target confirmation; archive = retract with undo. Respect OS reduced-motion; no interaction requires animation. Screen reader and keyboard must have ordinary list alternatives to spatial graph.

**Asset status:** The six high-fidelity PNG mockups and complete expanded screen documents were produced in a separate design package. This repository currently contains the core contract and actionable issue descriptions; the original full-resolution PNG assets still need a binary upload to `docs/design/knot/assets/` before they can be linked in GitHub issues. Do not substitute fabricated or unrelated mockup links.

The individual issue bodies are implementation-level feature specifications and test contracts. See [architecture](../../architecture/TECH-STACK.md) and [roadmap](../../PROJECT-ROADMAP.md).
