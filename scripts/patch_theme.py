#!/usr/bin/env python3
"""Validate and prepare the AlMakhdhi LuCI theme overlay before ImageBuilder."""
from pathlib import Path
import argparse
import shutil
import sys

REQUIRED = [
    "usr/share/ucode/luci/template/themes/bootstrap/header.ut",
    "usr/share/ucode/luci/template/themes/bootstrap/footer.ut",
    "www/luci-static/resources/menu-bootstrap.js",
    "www/luci-static/almakhdhi/cascade.css",
    "www/luci-static/almakhdhi/logo.png",
    "usr/share/luci/menu.d/luci-app-almakhdhi.json",
    "www/luci-static/resources/view/almakhdhi/quicksetup.js",
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="files", help="ImageBuilder FILES overlay root")
    parser.add_argument("--logo", default="assets/logo-original.png", help="Source logo")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    missing = [p for p in REQUIRED if not (root / p).is_file()]
    if missing:
        print("ERROR: missing required theme overlay files:", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)
        return 1

    header = root / REQUIRED[0]
    content = header.read_text(encoding="utf-8")
    if 'name="viewport"' not in content or 'luci-static/almakhdhi/cascade.css' not in content:
        print("ERROR: header.ut is missing responsive viewport or custom stylesheet link", file=sys.stderr)
        return 1

    # Ensure the custom logo used by the page is present in the overlay.
    logo_target = root / "www/luci-static/almakhdhi/logo.png"
    logo_source = Path(args.logo)
    if logo_source.is_file() and logo_source.resolve() != logo_target.resolve():
        logo_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(logo_source, logo_target)

    print("AlMakhdhi theme overlay validation passed.")
    for item in REQUIRED:
        print(f"  OK {item}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
