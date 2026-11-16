#!/bin/sh
# KNOT pnpm agent bridge v1
# Installed by install-agent-host-bridge.mjs; the original pnpm stays separate.
knot_project_root=@KNOT_PROJECT_ROOT@
knot_original_pnpm=@KNOT_ORIGINAL_PNPM@
knot_flatpak_marker=@KNOT_FLATPAK_MARKER@

if [ -f "$knot_flatpak_marker" ]; then
  knot_working_directory=$(pwd -P) || exit 1
  case "$knot_working_directory/" in
    "$knot_project_root/"*)
      if ! command -v flatpak-spawn >/dev/null 2>&1; then
        printf '%s\n' 'KNOT: flatpak-spawn is unavailable. Use a host terminal for pnpm.' >&2
        exit 127
      fi
      # A host login shell supplies host tools, never the sandbox PATH. Positional
      # arguments preserve spaces/metacharacters without constructing shell code.
      # watch-bus also stops the host command when this Flatpak connection closes.
      exec flatpak-spawn --host --watch-bus --directory="$knot_working_directory" \
        sh -lc 'knot_pnpm=$1; shift; exec "$knot_pnpm" "$@"' \
        knot-pnpm-host "$knot_original_pnpm" "$@"
      ;;
  esac
fi

# Native terminals and other projects retain the original pnpm behavior.
exec "$knot_original_pnpm" "$@"
