#!/usr/bin/env python3
"""
Documentation Link and Reference Checker.
Scans docs/*.md files for markdown links and relative file paths,
verifying that target files exist on disk.
"""

import os
import re
import sys
from pathlib import Path

def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    docs_dir = repo_root / "docs"
    
    if not docs_dir.exists():
        print(f"ERROR: docs dir not found at {docs_dir}")
        sys.exit(1)

    total_checked = 0
    broken_links = []

    md_files = list(docs_dir.glob("**/*.md"))
    print(f"Scanning {len(md_files)} documentation files in {docs_dir}...")

    for md_file in md_files:
        content = md_file.read_text(encoding="utf-8", errors="ignore")
        
        # 1. Standard markdown links: [text](target)
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        for label, url in links:
            url_clean = url.strip()
            if url_clean.startswith(("http://", "https://", "mailto:", "tel:", "#")):
                continue
            # Strip anchors
            target = url_clean.split("#")[0].split("?")[0]
            if not target:
                continue
            
            total_checked += 1
            # Check relative to doc file, relative to repo root, or relative to docs dir
            candidates = [
                md_file.parent / target,
                repo_root / target,
                docs_dir / target,
            ]
            if not any(c.exists() for c in candidates):
                broken_links.append((str(md_file.relative_to(repo_root)), label, url_clean))

        # 2. Backtick doc file references: `docs/...`
        doc_refs = re.findall(r'`(docs/[a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)`', content)
        for ref in doc_refs:
            ref_path = ref.split("#")[0]
            total_checked += 1
            if not (repo_root / ref_path).exists():
                broken_links.append((str(md_file.relative_to(repo_root)), "ref", ref))

    print(f"Total links and doc references checked: {total_checked}")
    if broken_links:
        print(f"FAIL: Found {len(broken_links)} broken references:")
        for doc, label, target in broken_links:
            print(f"  - In {doc}: [{label}] -> {target}")
        sys.exit(1)
    else:
        print("PASS: All documentation links and file references are valid.")
        sys.exit(0)

if __name__ == "__main__":
    main()
