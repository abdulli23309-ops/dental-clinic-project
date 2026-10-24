#!/usr/bin/env node
/**
 * check-hardcoded.mjs
 *
 * Fails on clinic-specific hardcoded content in frontend source.
 * Patterns checked:
 *   - Phone numbers (e.g. (312) 555-0147)
 *   - "Marlow" (except allowed technical identifiers)
 *   - City names (Chicago, Lahore, etc.)
 *   - unsplash.com URLs
 *   - marlowdental.com
 *   - Hex colours outside theme tokens file
 *
 * Allowed technical identifiers (contain "Marlow" but are not clinic facts):
 *   marlow:session-present, marlow:auth:logout, marlow_theme_preference,
 *   marlow_cookie_consent, marlow_utm_params, X-Marlow-Key, @marlow.internal
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

const ALLOWED_MARLOW_IDENTIFIERS = [
  "marlow:session-present",
  "marlow:auth:logout",
  "marlow_theme_preference",
  "marlow_cookie_consent",
  "marlow_utm_params",
  "X-Marlow-Key",
  "@marlow.internal",
  "marlow_audit_logs_",
];

const CITY_NAMES = ["Chicago", "Lahore", "Karachi", "New York", "London", "Dubai"];

// Phone patterns: (312) 555-0147, 312-555-0147, +92 300 1234567, etc.
const PHONE_PATTERN = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

const UNSLASH_PATTERN = /unsplash\.com/;
const MARLOWDENTAL_COM_PATTERN = /marlowdental\.com/;

// Hex colour pattern (#RRGGBB or #RGB)
const HEX_COLOUR_PATTERN = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

// Load theme tokens file to get allowed hex colours
let allowedHexColours = new Set();
const themeTokensPath = path.join(SRC_DIR, "lib", "theme-tokens.ts");
if (fs.existsSync(themeTokensPath)) {
  const tokensContent = fs.readFileSync(themeTokensPath, "utf-8");
  const matches = tokensContent.match(HEX_COLOUR_PATTERN);
  if (matches) {
    for (const m of matches) {
      allowedHexColours.add(m.toLowerCase());
    }
  }
}

let failures = 0;
const files = [];

// Only check public-facing source directories
const PUBLIC_DIRS = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/accessibility",
  "src/app/privacy",
  "src/app/terms",
  "src/components/sections",
  "src/components/layout",
  "src/components/providers",
  "src/components/ui",
];

function normalizePath(p) {
  return p.split(path.sep).join("/");
}

function shouldCheck(filePath) {
  const relativePath = normalizePath(path.relative(ROOT, filePath));
  // Skip test directories
  if (relativePath.includes("/test/") || relativePath.includes("/__tests__/") || relativePath.includes("/__mocks__/")) return false;
  // Skip admin, reception, booking-wizard, doctor, dashboard (staff tools)
  if (
    relativePath.includes("/admin/") ||
    relativePath.includes("/reception/") ||
    relativePath.includes("/booking/") ||
    relativePath.includes("/doctor/") ||
    relativePath.includes("/dashboard/") ||
    relativePath.includes("shared-dashboard-layout") ||
    relativePath.includes("dashboard-header") ||
    relativePath.includes("dashboard-sidebar")
  )
    return false;
  // Skip lib (utility files)
  if (relativePath.startsWith("src/lib/")) return false;
  // Skip content (CMS copy - handled separately)
  if (relativePath.startsWith("src/content/")) return false;
  // Only check public-facing directories
  return PUBLIC_DIRS.some((d) => relativePath === d || relativePath.startsWith(d + "/"));
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (shouldCheck(fullPath)) {
        files.push(fullPath);
      }
    }
  }
}

walkDir(SRC_DIR);

for (const file of files) {
  const relativePath = path.relative(ROOT, file);
  let content;
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch {
    continue;
  }

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const lineNum = i + 1;

    // Skip pure comment lines (allowed per classification rule)
    const isCommentLine = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
    if (isCommentLine) continue;

    // Check phone patterns
    if (PHONE_PATTERN.test(line)) {
      // Skip if it's clearly a placeholder/example pattern
      if (!line.includes("e.g.") && !line.includes("placeholder") && !line.includes("example")) {
        console.error(`FAIL: ${relativePath}:${lineNum} - possible hardcoded phone number`);
        console.error(`  ${line.trim()}`);
        failures++;
      }
    }

    // Check "Marlow" (excluding allowed technical identifiers)
    if (/Marlow/.test(line)) {
      const isAllowed = ALLOWED_MARLOW_IDENTIFIERS.some((id) => line.includes(id));
      if (!isAllowed) {
        console.error(`FAIL: ${relativePath}:${lineNum} - hardcoded "Marlow" clinic name`);
        console.error(`  ${line.trim()}`);
        failures++;
      }
    }

    // Check city names
    for (const city of CITY_NAMES) {
      if (line.includes(city)) {
        console.error(`FAIL: ${relativePath}:${lineNum} - hardcoded city name "${city}"`);
        console.error(`  ${line.trim()}`);
        failures++;
      }
    }

    // Check unsplash.com
    if (UNSLASH_PATTERN.test(line)) {
      console.error(`FAIL: ${relativePath}:${lineNum} - hardcoded Unsplash URL`);
      console.error(`  ${line.trim()}`);
      failures++;
    }

    // Check marlowdental.com
    if (MARLOWDENTAL_COM_PATTERN.test(line)) {
      console.error(`FAIL: ${relativePath}:${lineNum} - hardcoded marlowdental.com URL`);
      console.error(`  ${line.trim()}`);
      failures++;
    }

    // Check hex colours outside theme tokens
    const hexMatches = line.match(HEX_COLOUR_PATTERN);
    if (hexMatches) {
      for (const hex of hexMatches) {
        const lower = hex.toLowerCase();
        if (!allowedHexColours.has(lower)) {
          // Allow hex colours in Tailwind class names or CSS variable references
          if (!line.includes("var(--") && !line.includes("bg-") && !line.includes("text-") && !line.includes("border-")) {
            console.error(`FAIL: ${relativePath}:${lineNum} - hex colour outside theme tokens: ${hex}`);
            console.error(`  ${line.trim()}`);
            failures++;
          }
        }
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} hardcoded content issue(s) found.`);
  process.exit(1);
} else {
  console.log("No hardcoded clinic content found. Check passed.");
  process.exit(0);
}