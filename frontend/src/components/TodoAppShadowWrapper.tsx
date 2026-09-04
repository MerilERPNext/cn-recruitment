import { useEffect, useRef, useState } from "react";

/**
 * Shadow DOM wrapper for todo-app-atomic web component
 * Isolates the web component's styles from the host application
 * Dynamically loads the todo manager bundle before rendering
 *
 * Cache-busting strategy (post-deployment fix):
 *  - assets.json is fetched with a timestamp query param so the browser
 *    never serves a stale mapping to a deleted bundle hash.
 *  - CSS stylesheets injected into the shadow DOM carry the same version
 *    stamp to avoid mismatched styles after a deploy.
 *  - Before re-using an already-injected script tag, its `src` is compared
 *    against the freshly resolved bundle URL. If they differ (new deploy
 *    while the tab was open) the old tag is removed and the new bundle is
 *    loaded automatically.
 *
 * First-load CSS flash fix:
 *  - CSS <link> tags injected into the shadow root load asynchronously.
 *    Without waiting for them the web component renders with zero styles,
 *    producing the "broken / skeleton" appearance on cold cache.
 *  - We now wait for ALL 3 CSS onload events (Promise.all) before revealing
 *    the shadow host. While waiting we render a <TodoSkeleton> that matches
 *    the real page layout so the transition looks intentional.
 *  - A module-level `resolvedBundleUrl` survives React unmount / remount so
 *    navigating away and back skips the assets.json fetch entirely.
 *
 * Theme propagation (NOVA light / dark):
 *  - The recruitment app stamps data-theme="light"|"dark" on <html>.
 *  - Shadow DOM is isolated: CSS custom properties on :root / [data-theme]
 *    in the host document do NOT cross the shadow boundary.
 *  - We inject a <style> block into the shadow root that re-declares all NOVA
 *    tokens using :host / :host([data-theme="dark"]) selectors, which are the
 *    shadow-DOM equivalents of html / [data-theme] on the host.
 *  - A MutationObserver watches document.documentElement for data-theme
 *    attribute changes and stamps the same value on the shadow host element,
 *    so :host([data-theme="dark"]) fires correctly in real time.
 */

// ─── Module-level state (survives React unmount / remount) ───────────────────
// Remembers which bundle URL has already been injected so we never fetch
// assets.json or double-inject the script when the user tabs back.
let resolvedBundleUrl: string | null = null;

// ─── NOVA theme CSS injected into the shadow root ────────────────────────────
/**
 * Mirror of src/styles/theme.css, but scoped to :host / :host([data-theme])
 * so it works inside the shadow boundary.
 *
 * Also remaps the todo app's own shadcn/tailwind HSL variables (--background,
 * --foreground, --card, --border …) to NOVA-equivalent values so that any
 * Tailwind utility class the todo app uses picks up the right colour.
 *
 * Tailwind color-utility overrides for dark mode mirror the rules in theme.css
 * but are scoped with :host([data-theme="dark"]) instead of [data-theme="dark"].
 */
// ─── NOVA theme: CSS variable definitions ────────────────────────────────────
// Injected FIRST into shadow root (before todo app's link tags).
// Only contains :host variable blocks + the :host display/base rule.
// Order doesn't matter for CSS custom property definitions.
const NOVA_VARS_CSS = `
  /* ── Light (default) ──────────────────────────────────────────────────── */
  :host,
  :host([data-theme="light"]) {
    color-scheme: light;
    --surface:         255 255 255;
    --surface-raised:  255 255 255;
    --surface-sunken:  246 251 255;
    --app:             246 251 255;
    --sidebar:         255 255 255;
    --primary:         24 217 255;
    --primary-hover:   0 184 222;
    --brand-deep:      16 52 72;
    --on-primary:      16 52 72;
    --text-title:      11 23 36;
    --text-body1:      44 57 69;
    --text-body2:      109 126 138;
    --text-disabled:   152 176 192;
    --text-link:       10 147 176;
    --gray-10:  238 244 248;
    --gray-50:  228 237 243;
    --gray-100: 221 234 240;
    --gray-200: 203 220 230;
    --gray-300: 179 200 214;
    --gray-400: 152 176 192;
    --gray-500: 109 126 138;
    --gray-600: 90 107 119;
    --gray-700: 69 83 93;
    --gray-800: 44 57 69;
    --gray-900: 11 23 36;
    --border:        221 234 240;
    --border-strong: 203 220 230;
    --success: 22 179 100;
    --warning: 234 170 46;
    --error:   191 39 52;
    --info:    14 165 233;
    --ring:    24 217 255;
  }

  /* ── Dark ─────────────────────────────────────────────────────────────── */
  :host([data-theme="dark"]) {
    color-scheme: dark;
    --surface:         11 23 36;
    --surface-raised:  16 52 72;
    --surface-sunken:  4 11 18;
    --app:             4 11 18;
    --sidebar:         11 23 36;
    --primary:         24 217 255;
    --primary-hover:   106 228 255;
    --brand-deep:      16 52 72;
    --on-primary:      16 52 72;
    --text-title:      246 251 255;
    --text-body1:      216 228 236;
    --text-body2:      147 167 180;
    --text-disabled:   107 132 150;
    --text-link:       24 217 255;
    --gray-10:  14 30 44;
    --gray-50:  18 36 51;
    --gray-100: 23 51 67;
    --gray-200: 30 62 80;
    --gray-300: 42 80 101;
    --gray-400: 62 104 127;
    --gray-500: 107 132 150;
    --gray-600: 147 167 180;
    --gray-700: 182 198 209;
    --gray-800: 216 228 236;
    --gray-900: 246 251 255;
    --border:        30 58 77;
    --border-strong: 47 88 111;
    --success: 52 211 153;
    --warning: 251 191 36;
    --error:   248 113 113;
    --info:    56 189 248;
    --ring:    24 217 255;
  }

  /* ── Base display rule ────────────────────────────────────────────────── */
  :host {
    display: block;
    transition: background-color 180ms ease, color 180ms ease;
  }
`;

// ─── NOVA theme: dark-mode utility overrides ──────────────────────────────────
// Injected AFTER the todo app's link tags have loaded (Promise.all resolves).
// Being last in the shadow root's style order guarantees these rules beat any
// earlier rule at equal specificity, even when the todo app uses !important.
const NOVA_OVERRIDES_CSS = `
  /* ── Global base colours (applied via CSS inheritance) ───────────────── */
  :host {
    background-color: rgb(var(--app, 246 251 255));
    color: rgb(var(--text-title, 11 23 36));
  }
  :host([data-theme="dark"]) {
    background-color: rgb(var(--app));
    color: rgb(var(--text-title));
  }

  /* ── approval-table* semantic overrides (todo app's own class names) ─── */
  :host([data-theme="dark"]) .approval-table {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .approval-table-header {
    background-color: rgb(var(--gray-10)) !important;
    color: rgb(var(--text-body2)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .approval-table-row,
  :host([data-theme="dark"]) .approval-table-body tr,
  :host([data-theme="dark"]) .approval-table-body tr:nth-child(even),
  :host([data-theme="dark"]) .approval-table-body tr:nth-child(odd) {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
    transition: background-color 0.15s ease-in-out;
  }
  :host([data-theme="dark"]) .approval-table-row:hover,
  :host([data-theme="dark"]) .approval-table-body tr:hover,
  :host([data-theme="dark"]) .approval-table-body tr:nth-child(even):hover,
  :host([data-theme="dark"]) .approval-table-body tr:nth-child(odd):hover,
  :host([data-theme="dark"]) tbody tr:hover,
  :host([data-theme="dark"]) table tbody tr:hover,
  :host([data-theme="dark"]) [class*="hover:tw-bg-gray-50"]:hover {
    background-color: rgb(26 58 84) !important;
  }
  :host([data-theme="dark"]) .approval-table-row:hover td,
  :host([data-theme="dark"]) .approval-table-body tr:hover td,
  :host([data-theme="dark"]) tbody tr:hover td {
    background-color: transparent !important;
  }
  :host([data-theme="dark"]) .approval-table-cell {
    background-color: transparent !important;
    color: rgb(var(--text-body1)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .approval-table-empty {
    color: rgb(var(--text-body2)) !important;
  }

  /* ── Mobile task-card & approval-card semantic overrides ─────────────── */
  :host([data-theme="dark"]) .task-card,
  :host([data-theme="dark"]) .approval-card,
  :host([data-theme="dark"]) .task-card-overdue,
  :host([data-theme="dark"]) .task-card.task-card-overdue {
    background-color: rgb(var(--surface)) !important;
    border: 1px solid rgb(var(--border)) !important;
    border-left: 1px solid rgb(var(--border)) !important;
    color: rgb(var(--text-title)) !important;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.4) !important;
  }
  :host([data-theme="dark"]) .task-card:hover,
  :host([data-theme="dark"]) .approval-card:hover,
  :host([data-theme="dark"]) .task-card-overdue:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4) !important;
    background-color: rgb(var(--surface)) !important;
  }
  :host([data-theme="dark"]) .task-card-content,
  :host([data-theme="dark"]) .approval-card-content,
  :host([data-theme="dark"]) .task-card-header,
  :host([data-theme="dark"]) .approval-card-header {
    background-color: transparent !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .approval-card-title {
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .task-card-info,
  :host([data-theme="dark"]) .approval-card-info {
    color: rgb(var(--text-body1)) !important;
  }
  :host([data-theme="dark"]) .task-card-info .tw-text-gray-500,
  :host([data-theme="dark"]) .approval-card-info .tw-text-gray-500 {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) .task-card-info .tw-text-gray-800,
  :host([data-theme="dark"]) .approval-card-info .tw-text-gray-800,
  :host([data-theme="dark"]) .task-card-info .html-sandbox,
  :host([data-theme="dark"]) .approval-card-info .html-sandbox {
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .task-card-footer,
  :host([data-theme="dark"]) .approval-card-footer {
    background-color: rgb(var(--gray-10)) !important;
    border-top-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .task-category-badge {
    background-color: rgb(var(--surface-raised)) !important;
    color: rgb(var(--primary)) !important;
    border: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .task-card[style*="#eff6ff"],
  :host([data-theme="dark"]) .task-card[style*="background: rgb(239, 246, 255)"],
  :host([data-theme="dark"]) .task-card[style*="background-color: rgb(239, 246, 255)"] {
    background-color: rgb(14 42 60) !important;
  }
  :host([data-theme="dark"]) .task-priority-display {
    background-color: rgb(var(--surface-raised)) !important;
    border: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .task-assignee-name {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) .task-card-empty-state {
    color: rgb(var(--text-disabled)) !important;
  }
  :host([data-theme="dark"]) .category-sidebar-mobile {
    background-color: rgb(var(--sidebar)) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .category-sidebar-backdrop {
    background-color: rgba(0, 0, 0, 0.7) !important;
  }
  :host([data-theme="dark"]) div:has(> #mobile-select-all),
  :host([data-theme="dark"]) div:has(> input#mobile-select-all) {
    background-color: rgb(14 42 60) !important;
    border-bottom-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) label[for="mobile-select-all"] {
    color: rgb(var(--text-title)) !important;
  }

  /* ── category-sidebar semantic overrides ─────────────────────────────── */
  :host([data-theme="dark"]) .category-sidebar {
    background-color: rgb(var(--sidebar)) !important;
    border-color: rgb(var(--border)) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .category-sidebar-header {
    border-bottom-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .category-sidebar-header span[class*="tw-bg-blue-50"] {
    background-color: rgba(24, 217, 255, 0.15) !important;
    color: rgb(var(--primary)) !important;
    border-color: rgba(24, 217, 255, 0.3) !important;
  }
  :host([data-theme="light"]) .category-sidebar-header span[class*="tw-bg-blue-50"],
  :host([data-theme="light"]) .category-sidebar-header span[class*="tw-bg-blue"] {
    background-color: rgba(24, 217, 255, 0.22) !important;
    color: rgb(10 147 176) !important;
    border: 1px solid rgba(24, 217, 255, 0.45) !important;
  }
  :host([data-theme="dark"]) .category-item {
    border-bottom-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .category-item:not(.category-item-selected):hover {
    background-color: rgb(var(--gray-10)) !important;
  }
  :host([data-theme="dark"]) .category-item-label {
    color: rgb(var(--text-body1)) !important;
  }
  :host([data-theme="dark"]) .category-item-icon {
    color: rgb(var(--text-body2)) !important;
  }
  /* Category count badge (unselected: dark card matching theme) */
  :host([data-theme="dark"]) .category-item-count {
    background-color: rgb(var(--gray-50)) !important;
    color: rgb(var(--text-body1)) !important;
  }
  /* Category selected state (NOVA active styling) */
  :host([data-theme="dark"]) .category-item-selected {
    background-color: rgb(14 42 60) !important;
    border-left-color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) .category-item-selected .category-item-label,
  :host([data-theme="dark"]) .category-item-selected .category-item-icon {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) .category-item-selected .category-item-count {
    background-color: rgba(24, 217, 255, 0.18) !important;
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="light"]) .category-item-selected,
  :host([data-theme="light"]) .category-item[class*="tw-bg-blue-50"] {
    background-color: rgba(24, 217, 255, 0.12) !important;
    border-left-color: rgb(var(--primary)) !important;
  }
  :host([data-theme="light"]) .category-item-selected .category-item-label,
  :host([data-theme="light"]) .category-item-selected .category-item-icon,
  :host([data-theme="light"]) .category-item-selected svg {
    color: rgb(10 147 176) !important;
  }
  :host([data-theme="light"]) .category-item-selected .category-item-count {
    background-color: rgba(24, 217, 255, 0.28) !important;
    color: rgb(10 147 176) !important;
    font-weight: 600 !important;
  }
  :host([data-theme="dark"]) .category-sidebar-close-button {
    background-color: rgb(var(--surface-raised)) !important;
    border-color: rgb(var(--border)) !important;
    color: rgb(var(--text-title)) !important;
  }

  /* ── Sub-tabs (Pending / Completed) ─────────────────────────────────── */
  :host([data-theme="dark"]) [class~="tw-bg-gray-100"] {
    background-color: rgb(var(--gray-10)) !important;
  }
  :host([data-theme="dark"]) button[class*="tw-text-blue-600"] {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) button[class*="tw-bg-white"]:has(+ button),
  :host([data-theme="dark"]) button[class*="tw-bg-white"]:last-child {
    background-color: rgb(var(--surface-raised)) !important;
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="light"]) button[class*="tw-text-blue-600"] {
    color: rgb(10 147 176) !important;
    font-weight: 600 !important;
  }
  :host([data-theme="light"]) button[class*="tw-bg-white"]:has(+ button),
  :host([data-theme="light"]) button[class*="tw-bg-white"]:last-child {
    color: rgb(10 147 176) !important;
  }

  /* ── My Todo / Team Todo TriStateToggle ──────────────────────────────── */
  :host div[style*="border-bottom: 3px solid"],
  :host div[style*="borderBottom: 3px solid"],
  :host div[style*="3px solid rgb(37, 99, 235)"],
  :host div[style*="#2563eb"] {
    border-bottom-color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) button[style*="color: rgb(37, 99, 235)"],
  :host([data-theme="dark"]) button[style*="color: #2563eb"] {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="light"]) button[style*="color: rgb(37, 99, 235)"],
  :host([data-theme="light"]) button[style*="color: #2563eb"] {
    color: rgb(10 147 176) !important;
    font-weight: 600 !important;
  }
  :host button[style*="color: rgb(114, 124, 143)"],
  :host button[style*="color: #727C8F"] {
    color: rgb(var(--text-body2)) !important;
  }

  /* ── Act button & SmartActions ───────────────────────────────────────── */
  :host button[data-action="act"],
  :host button[data-action="act"] *,
  :host([data-theme="dark"]) button[data-action="act"],
  :host([data-theme="dark"]) button[data-action="act"] *,
  :host([data-theme="light"]) button[data-action="act"],
  :host([data-theme="light"]) button[data-action="act"] *,
  :host button[style*="background-color: rgb(37, 99, 235)"],
  :host button[style*="background-color: rgb(37, 99, 235)"] *,
  :host button[style*="backgroundColor: rgb(37, 99, 235)"],
  :host button[style*="backgroundColor: rgb(37, 99, 235)"] *,
  :host button[style*="#2563eb"],
  :host button[style*="#2563eb"] *,
  :host button[class*="tw-bg-blue-600"],
  :host button[class*="tw-bg-blue-600"] *,
  :host button[class*="tw-bg-blue-500"],
  :host button[class*="tw-bg-blue-500"] *,
  :host a[class*="tw-bg-blue-600"],
  :host a[class*="tw-bg-blue-600"] * {
    background-color: rgb(var(--primary)) !important;
    color: #0b1724 !important;
    -webkit-text-fill-color: #0b1724 !important;
    font-weight: 700 !important;
    border: none !important;
  }
  :host button[data-action="act"]:hover,
  :host button[data-action="act"]:hover *,
  :host([data-theme="dark"]) button[data-action="act"]:hover,
  :host([data-theme="dark"]) button[data-action="act"]:hover *,
  :host([data-theme="light"]) button[data-action="act"]:hover,
  :host([data-theme="light"]) button[data-action="act"]:hover *,
  :host button[style*="#2563eb"]:hover,
  :host button[style*="#2563eb"]:hover *,
  :host button[class*="tw-bg-blue-600"]:hover,
  :host button[class*="tw-bg-blue-600"]:hover *,
  :host button[class*="tw-bg-blue-500"]:hover,
  :host button[class*="tw-bg-blue-500"]:hover *,
  :host a[class*="tw-bg-blue-600"]:hover,
  :host a[class*="tw-bg-blue-600"]:hover * {
    background-color: rgb(var(--primary-hover, 0 184 222)) !important;
    color: #0b1724 !important;
    -webkit-text-fill-color: #0b1724 !important;
  }
  :host([data-theme="dark"]) .smart-actions .tw-bg-gray-200 {
    background-color: rgb(var(--surface-raised)) !important;
    border: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .smart-actions .tw-bg-gray-300 {
    background-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .smart-actions button[data-action="delegation"] {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="light"]) .smart-actions button[data-action="delegation"] {
    color: rgb(10 147 176) !important;
  }
  :host([data-theme="light"]) a[class*="tw-text-blue-600"],
  :host([data-theme="light"]) a[class*="tw-text-blue-500"],
  :host([data-theme="light"]) button[class*="tw-text-blue-600"],
  :host([data-theme="light"]) button[class*="tw-text-blue-500"],
  :host([data-theme="light"]) svg[class*="tw-text-blue-600"],
  :host([data-theme="light"]) svg[class*="tw-text-blue-500"] {
    color: rgb(10 147 176) !important;
  }
  :host([data-theme="dark"]) button[data-action*="approve" i],
  :host([data-theme="dark"]) button[data-action*="accept" i] {
    background-color: rgba(52, 211, 153, 0.15) !important;
    color: rgb(52, 211, 153) !important;
    border: 1px solid rgba(52, 211, 153, 0.35) !important;
  }
  :host([data-theme="dark"]) button[data-action*="reject" i],
  :host([data-theme="dark"]) button[data-action*="revoke" i] {
    background-color: rgba(248, 113, 113, 0.15) !important;
    color: rgb(248, 113, 113) !important;
    border: 1px solid rgba(248, 113, 113, 0.35) !important;
  }
  :host([data-theme="dark"]) button[data-action="retrigger"] {
    background-color: rgba(168, 85, 247, 0.15) !important;
    color: rgb(192 132 252) !important;
    border: 1px solid rgba(168, 85, 247, 0.35) !important;
  }

  /* ── Status badges & completed state in table ───────────────────────── */
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-green-50"],
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-green-700"],
  :host([data-theme="dark"]) span[class*="tw-bg-green-50"][class*="tw-text-green-700"],
  :host([data-theme="dark"]) [class*="tw-bg-green-50"][class*="tw-text-green-700"],
  :host([data-theme="dark"]) [class*="tw-border-green-200"][class*="tw-text-green-700"] {
    background-color: rgba(16, 185, 129, 0.22) !important;
    color: #34d399 !important;
    -webkit-text-fill-color: #34d399 !important;
    border: 1px solid rgba(52, 211, 153, 0.5) !important;
    border-color: rgba(52, 211, 153, 0.5) !important;
    font-weight: 600 !important;
  }
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-green-50"] svg,
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-green-700"] svg,
  :host([data-theme="dark"]) [class*="tw-bg-green-50"][class*="tw-text-green-700"] svg {
    color: #34d399 !important;
    stroke: #34d399 !important;
  }

  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-red-50"],
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-red-700"],
  :host([data-theme="dark"]) span[class*="tw-bg-red-50"][class*="tw-text-red-700"],
  :host([data-theme="dark"]) [class*="tw-bg-red-50"][class*="tw-text-red-700"],
  :host([data-theme="dark"]) [class*="tw-border-red-200"][class*="tw-text-red-700"] {
    background-color: rgba(239, 68, 68, 0.22) !important;
    color: #f87171 !important;
    -webkit-text-fill-color: #f87171 !important;
    border: 1px solid rgba(248, 113, 113, 0.5) !important;
    border-color: rgba(248, 113, 113, 0.5) !important;
    font-weight: 600 !important;
  }
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-red-50"] svg,
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-red-700"] svg,
  :host([data-theme="dark"]) [class*="tw-bg-red-50"][class*="tw-text-red-700"] svg {
    color: #f87171 !important;
    stroke: #f87171 !important;
  }

  /* Detail drawer completed badges (green-500 / red-500) */
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-green-500"],
  :host([data-theme="dark"]) span[class*="tw-bg-green-500"] {
    background-color: #059669 !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    font-weight: 600 !important;
    border: none !important;
  }
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-red-500"],
  :host([data-theme="dark"]) span[class*="tw-bg-red-500"] {
    background-color: #dc2626 !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    font-weight: 600 !important;
    border: none !important;
  }

  /* ── Search bar ──────────────────────────────────────────────────────── */
  /* SearchBar uses tw-bg-[#f9fafb] (arbitrary Tailwind value) which cannot
     be matched by [class~=...] selectors. Target the wrapper + input directly. */
  :host([data-theme="dark"]) .tw-rounded-xl.tw-border {
    background-color: rgb(var(--gray-10)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) input[type="text"],
  :host([data-theme="dark"]) input[type="search"],
  :host([data-theme="dark"]) input[type="email"],
  :host([data-theme="dark"]) input[type="number"],
  :host([data-theme="dark"]) input[type="date"],
  :host([data-theme="dark"]) input:not([type]),
  :host([data-theme="dark"]) input.tw-bg-transparent,
  :host([data-theme="dark"]) input[class*="tw-bg-transparent"] {
    background-color: transparent !important;
    background: transparent !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) select {
    background-color: rgb(var(--surface-raised)) !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) textarea {
    background-color: rgb(var(--surface-raised)) !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
  }

  /* ── Pagination bar ──────────────────────────────────────────────────── */
  :host([data-theme="dark"]) .ui-pagination,
  :host([data-theme="dark"]) .ui-task-table-pagination,
  :host([data-theme="dark"]) .ui-task-card-pagination {
    background-color: rgb(var(--surface)) !important;
    border-color: rgb(var(--border)) !important;
  }
  /* Active page number card -> primary Nova Cyan */
  :host .ui-pagination-page--active,
  :host .ui-pagination-page[class*="tw-bg-blue-600"],
  :host [class*="ui-pagination"] [class*="tw-bg-blue-600"] {
    background-color: rgb(var(--primary)) !important;
    color: rgb(var(--on-primary, 16 52 72)) !important;
    font-weight: 700 !important;
    border: none !important;
    box-shadow: 0 0 10px rgba(24, 217, 255, 0.3) !important;
  }
  :host([data-theme="dark"]) .ui-pagination-page:not(.ui-pagination-page--active) {
    color: rgb(var(--text-body2)) !important;
    background-color: transparent !important;
  }
  :host([data-theme="dark"]) .ui-pagination-page:not(.ui-pagination-page--active):hover {
    background-color: rgb(var(--gray-50)) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .ui-pagination-ellipsis {
    color: rgb(var(--text-disabled)) !important;
  }
  :host([data-theme="dark"]) .ui-pagination-prev,
  :host([data-theme="dark"]) .ui-pagination-next {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) .ui-pagination-prev:hover:not(:disabled),
  :host([data-theme="dark"]) .ui-pagination-next:hover:not(:disabled) {
    background-color: rgb(var(--gray-50)) !important;
    color: rgb(var(--text-title)) !important;
  }

  /* ── TaskDetailCard / detail panel ───────────────────────────────────── */
  /* The panel root is tw-bg-white tw-w-full tw-h-full — already covered by
     tw-bg-white override. Add explicit selector for robustness. */
  :host([data-theme="dark"]) .tw-w-full.tw-h-full.tw-flex.tw-flex-col {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
  }
  /* Section header bars inside detail panel */
  :host([data-theme="dark"]) .tw-p-4.tw-bg-white,
  :host([data-theme="dark"]) .tw-p-4 {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
  }
  /* Inline-styled inputs in detail panel (border set via style prop) */
  :host([data-theme="dark"]) input:not(.tw-bg-transparent):not([class*="tw-bg-transparent"]):not([class*="tw-cursor-text"]),
  :host([data-theme="dark"]) .tw-border.tw-rounded:not([class*="tw-min-h-"]):not([class*="tw-cursor-text"]):not([class*="tw-relative"]),
  :host([data-theme="dark"]) .tw-border.tw-rounded-lg:not([class*="tw-min-h-"]):not([class*="tw-cursor-text"]),
  :host([data-theme="dark"]) .tw-border.tw-rounded-md:not([class*="tw-min-h-"]):not([class*="tw-cursor-text"]) {
    background-color: rgb(var(--surface-raised)) !important;
    border-color: rgb(var(--border)) !important;
    color: rgb(var(--text-title)) !important;
  }
  /* Label text in form sections */
  :host([data-theme="dark"]) label,
  :host([data-theme="dark"]) [class~="tw-text-sm"][class~="tw-font-medium"] {
    color: rgb(var(--text-body2)) !important;
  }
  /* Section dividers */
  :host([data-theme="dark"]) hr,
  :host([data-theme="dark"]) [class~="tw-border-t"],
  :host([data-theme="dark"]) [class~="tw-border-b"] {
    border-color: rgb(var(--border)) !important;
  }
  /* Collapsible section row (REFERENCE FIELDS, DESCRIPTION etc.) */
  :host([data-theme="dark"]) [class~="tw-cursor-pointer"][class~="tw-border-b"] {
    background-color: rgb(var(--gray-10)) !important;
    border-color: rgb(var(--border)) !important;
    color: rgb(var(--text-body1)) !important;
  }


  :host([data-theme="dark"]) table {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) thead tr {
    background-color: rgb(var(--gray-10)) !important;
  }
  :host([data-theme="dark"]) tbody tr {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) tbody tr:hover {
    background-color: rgb(26 58 84) !important;
  }
  :host([data-theme="dark"]) th,
  :host([data-theme="dark"]) td {
    color: rgb(var(--text-body1)) !important;
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) thead th {
    color: rgb(var(--text-body2)) !important;
  }

  /* ── placeholder colour ──────────────────────────────────────────────── */
  :host([data-theme="dark"]) ::placeholder {
    color: rgb(var(--text-disabled));
    opacity: 1;
  }

  /* ── Focus ring → Nova Cyan ──────────────────────────────────────────── */
  :host *:focus-visible { outline-color: rgb(var(--ring)); }

  /* ── Text colour overrides (tw- prefixed + un-prefixed) ──────────────── */
  :host([data-theme="dark"]) .text-white:not([data-action="act"]):not([style*="#2563eb"]),
  :host([data-theme="dark"]) [class~="tw-text-white"]:not([data-action="act"]):not([style*="#2563eb"]):not([style*="37, 99, 235"])   { color: rgb(246 251 255) !important; }
  :host([data-theme="dark"]) [class~="text-black"],
  :host([data-theme="dark"]) [class~="tw-text-black"]   { color: rgb(var(--text-title)) !important; }
  :host([data-theme="dark"]) .text-gray-900, :host([data-theme="dark"]) [class~="tw-text-gray-900"] { color: rgb(var(--gray-900)) !important; }
  :host([data-theme="dark"]) .text-gray-800, :host([data-theme="dark"]) [class~="tw-text-gray-800"] { color: rgb(var(--gray-800)) !important; }
  :host([data-theme="dark"]) .text-gray-700, :host([data-theme="dark"]) [class~="tw-text-gray-700"] { color: rgb(var(--gray-700)) !important; }
  :host([data-theme="dark"]) .text-gray-600, :host([data-theme="dark"]) [class~="tw-text-gray-600"] { color: rgb(var(--gray-600)) !important; }
  :host([data-theme="dark"]) .text-gray-500, :host([data-theme="dark"]) [class~="tw-text-gray-500"] { color: rgb(var(--gray-500)) !important; }
  :host([data-theme="dark"]) .text-gray-400, :host([data-theme="dark"]) [class~="tw-text-gray-400"] { color: rgb(var(--gray-400)) !important; }
  :host([data-theme="dark"]) .text-gray-300, :host([data-theme="dark"]) [class~="tw-text-gray-300"] { color: rgb(var(--gray-300)) !important; }
  :host([data-theme="dark"]) .text-slate-900, :host([data-theme="dark"]) [class~="tw-text-slate-900"],
  :host([data-theme="dark"]) .text-slate-800, :host([data-theme="dark"]) [class~="tw-text-slate-800"] { color: rgb(246 251 255) !important; }
  :host([data-theme="dark"]) .text-slate-700, :host([data-theme="dark"]) [class~="tw-text-slate-700"],
  :host([data-theme="dark"]) .text-slate-600, :host([data-theme="dark"]) [class~="tw-text-slate-600"] { color: rgb(216 228 236) !important; }
  :host([data-theme="dark"]) .text-slate-500, :host([data-theme="dark"]) [class~="tw-text-slate-500"],
  :host([data-theme="dark"]) .text-slate-400, :host([data-theme="dark"]) [class~="tw-text-slate-400"] { color: rgb(147 167 180) !important; }

  /* ── Background colour overrides (tw- prefixed + un-prefixed) ────────── */
  :host([data-theme="dark"]) [class~="bg-white"],
  :host([data-theme="dark"]) [class~="tw-bg-white"]    { background-color: rgb(var(--surface)) !important; }
  :host([data-theme="dark"]) [class~="bg-gray-50"],
  :host([data-theme="dark"]) [class~="tw-bg-gray-50"]  { background-color: rgb(var(--gray-10)) !important; }
  :host([data-theme="dark"]) [class~="bg-gray-100"],
  :host([data-theme="dark"]) [class~="tw-bg-gray-100"] { background-color: rgb(var(--gray-50)) !important; }
  :host([data-theme="dark"]) [class~="bg-gray-200"],
  :host([data-theme="dark"]) [class~="tw-bg-gray-200"] { background-color: rgb(var(--gray-100)) !important; }
  :host([data-theme="dark"]) [class~="bg-gray-300"],
  :host([data-theme="dark"]) [class~="tw-bg-gray-300"] { background-color: rgb(var(--gray-200)) !important; }
  :host([data-theme="dark"]) [class~="bg-blue-50"],   :host([data-theme="dark"]) [class~="tw-bg-blue-50"],
  :host([data-theme="dark"]) [class~="bg-blue-100"],  :host([data-theme="dark"]) [class~="tw-bg-blue-100"],
  :host([data-theme="dark"]) [class~="bg-sky-50"],    :host([data-theme="dark"]) [class~="tw-bg-sky-50"],
  :host([data-theme="dark"]) [class~="bg-cyan-50"],   :host([data-theme="dark"]) [class~="tw-bg-cyan-50"] { background-color: rgb(14 42 60) !important; }
  :host([data-theme="dark"]) [class~="bg-green-50"]:not([class*="tw-text-green-700"]),   :host([data-theme="dark"]) [class~="tw-bg-green-50"]:not([class*="tw-text-green-700"]):not(.smart-actions span),
  :host([data-theme="dark"]) [class~="bg-green-100"],  :host([data-theme="dark"]) [class~="tw-bg-green-100"],
  :host([data-theme="dark"]) [class~="bg-emerald-50"], :host([data-theme="dark"]) [class~="tw-bg-emerald-50"] { background-color: rgb(13 51 36) !important; }
  :host([data-theme="dark"]) [class~="bg-red-50"]:not([class*="tw-text-red-700"]),   :host([data-theme="dark"]) [class~="tw-bg-red-50"]:not([class*="tw-text-red-700"]):not(.smart-actions span),
  :host([data-theme="dark"]) [class~="bg-red-100"],  :host([data-theme="dark"]) [class~="tw-bg-red-100"],
  :host([data-theme="dark"]) [class~="bg-rose-50"],  :host([data-theme="dark"]) [class~="tw-bg-rose-50"] { background-color: rgb(59 20 24) !important; }
  :host([data-theme="dark"]) [class~="bg-amber-50"],  :host([data-theme="dark"]) [class~="tw-bg-amber-50"],
  :host([data-theme="dark"]) [class~="bg-amber-100"], :host([data-theme="dark"]) [class~="tw-bg-amber-100"],
  :host([data-theme="dark"]) [class~="bg-yellow-50"], :host([data-theme="dark"]) [class~="tw-bg-yellow-50"],
  :host([data-theme="dark"]) [class~="bg-yellow-100"],:host([data-theme="dark"]) [class~="tw-bg-yellow-100"] { background-color: rgb(58 43 12) !important; }
  :host([data-theme="dark"]) [class~="bg-orange-50"],  :host([data-theme="dark"]) [class~="tw-bg-orange-50"],
  :host([data-theme="dark"]) [class~="bg-orange-100"], :host([data-theme="dark"]) [class~="tw-bg-orange-100"] { background-color: rgb(66 34 10) !important; }
  :host([data-theme="dark"]) [class~="bg-purple-50"], :host([data-theme="dark"]) [class~="tw-bg-purple-50"],
  :host([data-theme="dark"]) [class~="bg-violet-50"], :host([data-theme="dark"]) [class~="tw-bg-violet-50"] { background-color: rgb(42 30 66) !important; }

  /* ── Border colour overrides (tw- prefixed + un-prefixed) ────────────── */
  :host([data-theme="dark"]) [class~="border-gray-50"],   :host([data-theme="dark"]) [class~="tw-border-gray-50"],
  :host([data-theme="dark"]) [class~="border-gray-100"],  :host([data-theme="dark"]) [class~="tw-border-gray-100"],
  :host([data-theme="dark"]) [class~="border-gray-200"],  :host([data-theme="dark"]) [class~="tw-border-gray-200"],
  :host([data-theme="dark"]) [class~="border-gray-300"],  :host([data-theme="dark"]) [class~="tw-border-gray-300"],
  :host([data-theme="dark"]) [class~="border-gray-400"],  :host([data-theme="dark"]) [class~="tw-border-gray-400"],
  :host([data-theme="dark"]) [class~="border-slate-100"], :host([data-theme="dark"]) [class~="tw-border-slate-100"],
  :host([data-theme="dark"]) [class~="border-slate-200"], :host([data-theme="dark"]) [class~="tw-border-slate-200"],
  :host([data-theme="dark"]) [class~="border-blue-100"],  :host([data-theme="dark"]) [class~="tw-border-blue-100"],
  :host([data-theme="dark"]) [class~="border-blue-200"],  :host([data-theme="dark"]) [class~="tw-border-blue-200"],
  :host([data-theme="dark"]) [class~="border-black"],     :host([data-theme="dark"]) [class~="tw-border-black"] { border-color: rgb(var(--border)) !important; }

  /* ── Shadow overrides ────────────────────────────────────────────────── */
  :host([data-theme="dark"]) .shadow,    :host([data-theme="dark"]) [class~="tw-shadow"],
  :host([data-theme="dark"]) .shadow-sm, :host([data-theme="dark"]) [class~="tw-shadow-sm"],
  :host([data-theme="dark"]) .shadow-md, :host([data-theme="dark"]) [class~="tw-shadow-md"],
  :host([data-theme="dark"]) .shadow-lg, :host([data-theme="dark"]) [class~="tw-shadow-lg"],
  :host([data-theme="dark"]) .shadow-xl, :host([data-theme="dark"]) [class~="tw-shadow-xl"] {
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.5);
    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  }

  /* ── fill-white ──────────────────────────────────────────────────────── */
  :host([data-theme="dark"]) .fill-white,
  :host([data-theme="dark"]) [class~="tw-fill-white"] { fill: rgb(246 251 255) !important; }

  /* ── Dropdowns and Menus (e.g. UnifiedSortingDropdown) ──────────────── */
  :host([data-theme="dark"]) [role="menu"] {
    background-color: rgb(var(--gray-10)) !important;
    border: 1px solid rgb(var(--border)) !important;
    border-radius: 8px !important;
    box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.7) !important;
  }
  :host([data-theme="dark"]) [role="menuitem"],
  :host([data-theme="dark"]) button[role="menuitem"] {
    color: rgb(var(--text-body1)) !important;
    background-color: transparent !important;
  }
  :host([data-theme="dark"]) [role="menuitem"] svg,
  :host([data-theme="dark"]) button[role="menuitem"] svg {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) [role="menuitem"]:hover,
  :host([data-theme="dark"]) button[role="menuitem"]:hover {
    background-color: rgb(26 58 84) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) [role="menuitem"]:hover svg,
  :host([data-theme="dark"]) button[role="menuitem"]:hover svg {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) [role="menuitem"][aria-selected="true"],
  :host([data-theme="dark"]) button[role="menuitem"][aria-selected="true"],
  :host([data-theme="dark"]) [role="menuitem"][style*="#eff6ff"],
  :host([data-theme="dark"]) button[role="menuitem"][style*="#eff6ff"],
  :host([data-theme="dark"]) [role="menuitem"][style*="rgb(239, 246, 255)"],
  :host([data-theme="dark"]) button[role="menuitem"][style*="rgb(239, 246, 255)"],
  :host([data-theme="dark"]) [role="menuitem"][class*="tw-bg-blue-50"],
  :host([data-theme="dark"]) button[role="menuitem"][class*="tw-bg-blue-50"] {
    background-color: rgba(0, 209, 193, 0.15) !important;
    color: rgb(var(--primary)) !important;
    font-weight: 500 !important;
  }
  :host([data-theme="dark"]) [role="menuitem"][aria-selected="true"] svg,
  :host([data-theme="dark"]) button[role="menuitem"][aria-selected="true"] svg,
  :host([data-theme="dark"]) [role="menuitem"][style*="#eff6ff"] svg,
  :host([data-theme="dark"]) button[role="menuitem"][style*="#eff6ff"] svg,
  :host([data-theme="dark"]) [role="menuitem"][style*="rgb(239, 246, 255)"] svg,
  :host([data-theme="dark"]) button[role="menuitem"][style*="rgb(239, 246, 255)"] svg,
  :host([data-theme="dark"]) [role="menuitem"][class*="tw-bg-blue-50"] svg,
  :host([data-theme="dark"]) button[role="menuitem"][class*="tw-bg-blue-50"] svg {
    color: rgb(var(--primary)) !important;
  }

  /* ── Mobile Sort Modal (CustomModal) ─────────────────────────────────── */
  :host([data-theme="dark"]) [class*="1050"] > div:not(.tw-flex-col),
  :host([data-theme="dark"]) .tw-z-\\[1050\\] > div:not(.tw-flex-col) {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
    border: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) [class*="1050"] [class*="tw-border-"],
  :host([data-theme="dark"]) .tw-z-\\[1050\\] .tw-border-\\[\\#E3E3E3\\] {
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) [class*="1050"] h2,
  :host([data-theme="dark"]) .tw-z-\\[1050\\] h2 {
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) [class*="1050"] button svg,
  :host([data-theme="dark"]) .tw-z-\\[1050\\] button svg {
    color: rgb(var(--text-body2)) !important;
  }

  /* ── FilterSidebar Drawer ─────────────────────────────────────────────── */
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 {
    background-color: rgb(var(--surface)) !important;
    color: rgb(var(--text-title)) !important;
    border-left: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 > div:first-child,
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-border-b {
    border-bottom-color: rgb(var(--border)) !important;
    background-color: rgb(var(--surface)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 h2 {
    color: rgb(var(--text-title)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 button[aria-label="Close filters"] {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 button[aria-label="Close filters"]:hover {
    color: rgb(var(--text-title)) !important;
    background-color: rgb(var(--gray-50)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 hr {
    border-color: rgb(var(--border)) !important;
  }
  /* Section Header Icons (Tabler icons in section headers) */
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-text-blue-500 {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-text-gray-500 {
    color: rgb(var(--text-body2)) !important;
  }

  /* Due Date Checkbox Options */
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-text-blue-600 {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-bg-blue-500 {
    background-color: rgb(var(--primary)) !important;
    border-color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-border-gray-300 {
    border-color: rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-text-gray-600 {
    color: rgb(var(--text-body1)) !important;
  }

  /* Date inputs in FilterSidebar */
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 input[readOnly] {
    background-color: rgb(var(--gray-10)) !important;
    color: rgb(var(--text-title)) !important;
    border-color: rgb(var(--border)) !important;
  }

  /* FilterSidebar Footer */
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-border-t {
    border-top-color: rgb(var(--border)) !important;
    background-color: rgb(var(--surface)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-border-t button:first-child {
    background-color: rgb(var(--gray-50)) !important;
    color: rgb(var(--text-body1)) !important;
    border: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .tw-fixed.tw-top-0.tw-right-0 .tw-border-t button:first-child:hover {
    background-color: rgb(26 58 84) !important;
    color: rgb(var(--text-title)) !important;
  }
  :host .tw-fixed.tw-top-0.tw-right-0 .tw-border-t button:last-child {
    background-color: rgb(var(--primary)) !important;
    color: rgb(var(--on-primary, 16 52 72)) !important;
    font-weight: 600 !important;
    border: none !important;
  }
  :host .tw-fixed.tw-top-0.tw-right-0 .tw-border-t button:last-child:hover {
    background-color: rgb(var(--primary-hover, 0 184 222)) !important;
  }

  /* ── CustomMultiSelect & CustomSingleSelect (FilterSidebar & Forms) ──── */
  /* Main Input Box Container */
  :host([data-theme="dark"]) [class*="tw-cursor-text"],
  :host([data-theme="dark"]) [class*="tw-min-h-"],
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"],
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\],
  :host([data-theme="dark"]) div.tw-cursor-text,
  :host([data-theme="dark"]) div[class*="tw-cursor-text"],
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"],
  :host([data-theme="dark"]) div[style*="background-color: #F9FAFB"],
  :host([data-theme="dark"]) div[style*="background-color: #f9fafb"],
  :host([data-theme="dark"]) div[style*="backgroundColor: #F9FAFB"],
  :host([data-theme="dark"]) div[style*="backgroundColor: #f9fafb"],
  :host([data-theme="dark"]) div[style*="#F9FAFB"],
  :host([data-theme="dark"]) div[style*="#f9fafb"],
  :host([data-theme="dark"]) div[style*="249, 250, 251"] {
    background-color: rgb(var(--gray-10)) !important;
    background: rgb(var(--gray-10)) !important;
    border: 1px solid rgb(var(--border)) !important;
    color: rgb(var(--text-title)) !important;
  }
  /* Transparent Input field inside select container */
  :host([data-theme="dark"]) [class*="tw-cursor-text"] input,
  :host([data-theme="dark"]) [class*="tw-min-h-"] input,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] input,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] input,
  :host([data-theme="dark"]) div.tw-cursor-text input,
  :host([data-theme="dark"]) div[class*="tw-cursor-text"] input,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] input,
  :host([data-theme="dark"]) div[style*="#F9FAFB"] input,
  :host([data-theme="dark"]) div[style*="#f9fafb"] input,
  :host([data-theme="dark"]) div[style*="249, 250, 251"] input,
  :host([data-theme="dark"]) input.tw-bg-transparent,
  :host([data-theme="dark"]) input[class*="tw-bg-transparent"] {
    background-color: transparent !important;
    background: transparent !important;
    color: rgb(var(--text-title)) !important;
    box-shadow: none !important;
    outline: none !important;
    border: none !important;
  }
  :host([data-theme="dark"]) [class*="tw-cursor-text"] input::placeholder,
  :host([data-theme="dark"]) [class*="tw-min-h-"] input::placeholder,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] input::placeholder,
  :host([data-theme="dark"]) div.tw-cursor-text input::placeholder,
  :host([data-theme="dark"]) input.tw-bg-transparent::placeholder,
  :host([data-theme="dark"]) input::placeholder {
    color: rgb(var(--text-disabled)) !important;
    opacity: 1 !important;
  }

  /* Selected Tag Pills (e.g. Delegated to me, Company tags, etc.) */
  :host([data-theme="dark"]) [class*="tw-cursor-text"] .tw-bg-blue-100,
  :host([data-theme="dark"]) [class*="tw-min-h-"] .tw-bg-blue-100,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100,
  :host([data-theme="dark"]) div.tw-cursor-text .tw-bg-blue-100,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] .tw-bg-blue-100,
  :host([data-theme="dark"]) div[style*="#F9FAFB"] .tw-bg-blue-100,
  :host([data-theme="dark"]) div[style*="249, 250, 251"] .tw-bg-blue-100 {
    background-color: rgba(24, 217, 255, 0.15) !important;
    color: rgb(var(--primary)) !important;
    border: 1px solid rgba(24, 217, 255, 0.35) !important;
  }
  /* Avatar circle inside tag */
  :host([data-theme="dark"]) [class*="tw-cursor-text"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) [class*="tw-min-h-"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) div.tw-cursor-text .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="dark"]) div[style*="#F9FAFB"] .tw-bg-blue-100 .tw-bg-blue-500 {
    background-color: rgb(var(--primary)) !important;
    color: rgb(var(--on-primary, 16 52 72)) !important;
    font-weight: 600 !important;
  }
  /* Tag remove button (x) */
  :host([data-theme="dark"]) [class*="tw-cursor-text"] .tw-bg-blue-100 button,
  :host([data-theme="dark"]) [class*="tw-min-h-"] .tw-bg-blue-100 button,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100 button,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100 button,
  :host([data-theme="dark"]) div.tw-cursor-text .tw-bg-blue-100 button,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] .tw-bg-blue-100 button,
  :host([data-theme="dark"]) div[style*="#F9FAFB"] .tw-bg-blue-100 button {
    color: rgb(var(--primary)) !important;
  }
  :host([data-theme="dark"]) [class*="tw-cursor-text"] .tw-bg-blue-100 button:hover,
  :host([data-theme="dark"]) [class*="tw-min-h-"] .tw-bg-blue-100 button:hover,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100 button:hover,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100 button:hover,
  :host([data-theme="dark"]) div.tw-cursor-text .tw-bg-blue-100 button:hover,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] .tw-bg-blue-100 button:hover {
    color: rgb(var(--primary-hover, 106 228 255)) !important;
  }
  /* Clear button inside input */
  :host([data-theme="dark"]) [class*="tw-cursor-text"] button.tw-text-gray-400,
  :host([data-theme="dark"]) [class*="tw-min-h-"] button.tw-text-gray-400,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] button.tw-text-gray-400,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] button.tw-text-gray-400,
  :host([data-theme="dark"]) div.tw-cursor-text button.tw-text-gray-400,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] button.tw-text-gray-400,
  :host([data-theme="dark"]) div[style*="#F9FAFB"] button.tw-text-gray-400 {
    color: rgb(var(--text-body2)) !important;
  }
  :host([data-theme="dark"]) [class*="tw-cursor-text"] button.tw-text-gray-400:hover,
  :host([data-theme="dark"]) [class*="tw-min-h-"] button.tw-text-gray-400:hover,
  :host([data-theme="dark"]) [class*="tw-min-h-[42px]"] button.tw-text-gray-400:hover,
  :host([data-theme="dark"]) .tw-min-h-\\[42px\\] button.tw-text-gray-400:hover,
  :host([data-theme="dark"]) div.tw-cursor-text button.tw-text-gray-400:hover,
  :host([data-theme="dark"]) div[style*="background-color: rgb(249, 250, 251)"] button.tw-text-gray-400:hover {
    color: rgb(var(--text-title)) !important;
  }

  /* Light mode selected tag pills */
  :host([data-theme="light"]) [class*="tw-cursor-text"] .tw-bg-blue-100,
  :host([data-theme="light"]) [class*="tw-min-h-"] .tw-bg-blue-100,
  :host([data-theme="light"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100,
  :host([data-theme="light"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100,
  :host([data-theme="light"]) div.tw-cursor-text .tw-bg-blue-100 {
    background-color: rgba(24, 217, 255, 0.2) !important;
    color: rgb(10 147 176) !important;
    border: 1px solid rgba(24, 217, 255, 0.45) !important;
  }
  :host([data-theme="light"]) [class*="tw-cursor-text"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="light"]) [class*="tw-min-h-"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="light"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="light"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100 .tw-bg-blue-500,
  :host([data-theme="light"]) div.tw-cursor-text .tw-bg-blue-100 .tw-bg-blue-500 {
    background-color: rgb(var(--primary)) !important;
    color: rgb(var(--on-primary, 16 52 72)) !important;
    font-weight: 600 !important;
  }
  :host([data-theme="light"]) [class*="tw-cursor-text"] .tw-bg-blue-100 button,
  :host([data-theme="light"]) [class*="tw-min-h-"] .tw-bg-blue-100 button,
  :host([data-theme="light"]) [class*="tw-min-h-[42px]"] .tw-bg-blue-100 button,
  :host([data-theme="light"]) .tw-min-h-\\[42px\\] .tw-bg-blue-100 button,
  :host([data-theme="light"]) div.tw-cursor-text .tw-bg-blue-100 button {
    color: rgb(10 147 176) !important;
  }

  /* Dropdown Options Container (Search Employee, Company, Location etc.) */
  :host([data-theme="dark"]) .tw-max-h-60.tw-overflow-y-auto,
  :host([data-theme="dark"]) div[style*="background-color: rgb(255, 255, 255)"].tw-absolute,
  :host([data-theme="dark"]) div[style*="background-color: #FFFFFF"].tw-absolute,
  :host([data-theme="dark"]) div[style*="backgroundColor: #FFFFFF"].tw-absolute,
  :host([data-theme="dark"]) div[style*="background-color: #ffffff"].tw-absolute,
  :host([data-theme="dark"]) div[style*="#FFFFFF"].tw-absolute,
  :host([data-theme="dark"]) div[style*="#ffffff"].tw-absolute,
  :host([data-theme="dark"]) div[style*="255, 255, 255"].tw-absolute {
    background-color: rgb(var(--gray-10)) !important;
    background: rgb(var(--gray-10)) !important;
    border: 1px solid rgb(var(--border)) !important;
    border-radius: 8px !important;
    box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.7) !important;
  }

  /* Dropdown Option Items */
  :host([data-theme="dark"]) .tw-max-h-60 div[class*="tw-cursor-pointer"],
  :host([data-theme="dark"]) div[style*="background-color: rgb(255, 255, 255)"].tw-absolute div[class*="tw-cursor-pointer"],
  :host([data-theme="dark"]) div[style*="background-color: #FFFFFF"].tw-absolute div[class*="tw-cursor-pointer"] {
    background-color: transparent !important;
    color: rgb(var(--text-body1)) !important;
    border-bottom: 1px solid rgb(var(--border)) !important;
  }
  :host([data-theme="dark"]) .tw-max-h-60 div[class*="tw-cursor-pointer"]:hover,
  :host([data-theme="dark"]) div[style*="background-color: rgb(255, 255, 255)"].tw-absolute div[class*="tw-cursor-pointer"]:hover,
  :host([data-theme="dark"]) div[style*="background-color: #FFFFFF"].tw-absolute div[class*="tw-cursor-pointer"]:hover {
    background-color: rgb(26 58 84) !important;
    color: rgb(var(--text-title)) !important;
  }
  /* Avatar Circle inside dropdown options */
  :host .tw-max-h-60 div[class*="tw-cursor-pointer"] .tw-bg-blue-500,
  :host div[style*="background-color: rgb(255, 255, 255)"].tw-absolute div[class*="tw-cursor-pointer"] .tw-bg-blue-500,
  :host div[style*="background-color: #FFFFFF"].tw-absolute div[class*="tw-cursor-pointer"] .tw-bg-blue-500 {
    background-color: rgb(var(--primary)) !important;
    color: rgb(var(--on-primary, 16 52 72)) !important;
    font-weight: 600 !important;
  }

  /* Completed Task Badges priority override at end of stylesheet */
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-green-50"],
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-green-700"],
  :host([data-theme="dark"]) span[class*="tw-bg-green-50"][class*="tw-text-green-700"] {
    background-color: rgba(16, 185, 129, 0.22) !important;
    color: #34d399 !important;
    -webkit-text-fill-color: #34d399 !important;
    border: 1px solid rgba(52, 211, 153, 0.5) !important;
  }
  :host([data-theme="dark"]) .smart-actions span[class*="tw-bg-red-50"],
  :host([data-theme="dark"]) .smart-actions span[class*="tw-text-red-700"],
  :host([data-theme="dark"]) span[class*="tw-bg-red-50"][class*="tw-text-red-700"] {
    background-color: rgba(239, 68, 68, 0.22) !important;
    color: #f87171 !important;
    -webkit-text-fill-color: #f87171 !important;
    border: 1px solid rgba(248, 113, 113, 0.5) !important;
  }
`;

// ─── Skeleton loader ─────────────────────────────────────────────────────────
/**
 * Layout-matching skeleton shown while shadow-DOM CSS loads on first visit.
 * Uses only inline styles — no external CSS dependency.
 * Adapts shimmer colours to the current host document theme.
 */
const TodoSkeleton = () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const shimmerBase = isDark ? "#0f1e2d" : "#f0f0f0";
  const shimmerHigh = isDark ? "#1a3347" : "#e4e4e4";
  const bgColor = isDark ? "#040b12" : "#fff";
  const borderColor = isDark ? "#1e3a4d" : "#e5e7eb";
  const headerBg = isDark ? "#0b1724" : "#f3f4f6";
  const rowAlt = isDark ? "#0b1724" : "#fafafa";
  const rowBase = isDark ? "#040b12" : "#fff";

  return (
    <>
      {/* Shimmer keyframe — injected once into the host document head */}
      <style>{`
                @keyframes _todo-shimmer {
                    0%   { background-position: -600px 0; }
                    100% { background-position:  600px 0; }
                }
                ._todo-sh {
                    background: linear-gradient(90deg, ${shimmerBase} 25%, ${shimmerHigh} 37%, ${shimmerBase} 63%);
                    background-size: 1200px 100%;
                    animation: _todo-shimmer 1.4s ease infinite;
                    border-radius: 4px;
                }
            `}</style>

      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bgColor,
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          className="_todo-sh"
          style={{ height: 56, borderRadius: 0, flexShrink: 0 }}
        />

        {/* Breadcrumb row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 24px 8px",
            flexShrink: 0,
          }}
        >
          <div className="_todo-sh" style={{ width: 90, height: 13 }} />
          <span style={{ color: borderColor, fontSize: 14 }}>/</span>
          <div className="_todo-sh" style={{ width: 130, height: 13 }} />
          <div style={{ flex: 1 }} />
          {/* "My Todo" pill */}
          <div
            className="_todo-sh"
            style={{ width: 80, height: 28, borderRadius: 14 }}
          />
        </div>

        {/* Main layout: sidebar + content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            padding: "4px 24px 24px",
            gap: 0,
          }}
        >
          {/* ── Left sidebar ─────────────────────────────────────────── */}
          <div
            style={{
              width: 216,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingRight: 16,
              paddingTop: 6,
            }}
          >
            {/* Total tasks pill */}
            <div
              className="_todo-sh"
              style={{ height: 36, borderRadius: 8, marginBottom: 4 }}
            />
            {/* Category rows */}
            {[
              { w: 100, active: true },
              { w: 120, active: false },
              { w: 80, active: false },
              { w: 95, active: false },
            ].map(({ w, active }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: active
                    ? isDark
                      ? "rgb(14 42 60)"
                      : "#eff6ff"
                    : "transparent",
                }}
              >
                <div className="_todo-sh" style={{ width: w, height: 13 }} />
                <div
                  className="_todo-sh"
                  style={{ width: 24, height: 24, borderRadius: 12 }}
                />
              </div>
            ))}
          </div>

          {/* ── Content area ─────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Toolbar: tabs + search + action icons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                border: `1px solid ${borderColor}`,
                borderRadius: "8px 8px 0 0",
                backgroundColor: bgColor,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  background: headerBg,
                  padding: 4,
                  borderRadius: 8,
                }}
              >
                <div
                  className="_todo-sh"
                  style={{ width: 80, height: 30, borderRadius: 6 }}
                />
                <div
                  className="_todo-sh"
                  style={{
                    width: 90,
                    height: 30,
                    borderRadius: 6,
                    opacity: 0.5,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  className="_todo-sh"
                  style={{ width: 240, height: 32, borderRadius: 6 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 34, height: 32, borderRadius: 6 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 34, height: 32, borderRadius: 6 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 34, height: 32, borderRadius: 6 }}
                />
              </div>
            </div>

            {/* Table header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "10px 16px",
                borderLeft: `1px solid ${borderColor}`,
                borderRight: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                background: headerBg,
              }}
            >
              <div
                className="_todo-sh"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              />
              {[110, 80, 80, 200, 40, 90, 40, 60].map((w, i) => (
                <div
                  key={i}
                  className="_todo-sh"
                  style={{ width: w, height: 12, flexShrink: 0 }}
                />
              ))}
            </div>

            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "13px 16px",
                  borderLeft: `1px solid ${borderColor}`,
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                  background: i % 2 === 0 ? rowBase : rowAlt,
                }}
              >
                <div
                  className="_todo-sh"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 100 + (i % 3) * 18, height: 13 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 80, height: 13, flexShrink: 0 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 80, height: 13, flexShrink: 0 }}
                />
                <div className="_todo-sh" style={{ flex: 1, height: 13 }} />
                <div
                  className="_todo-sh"
                  style={{ width: 28, height: 13, flexShrink: 0 }}
                />
                <div
                  className="_todo-sh"
                  style={{ width: 70, height: 13, flexShrink: 0 }}
                />
                <div
                  className="_todo-sh"
                  style={{
                    width: 28,
                    height: 20,
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <div
                    className="_todo-sh"
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                  <div
                    className="_todo-sh"
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                border: `1px solid ${borderColor}`,
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                background: bgColor,
              }}
            >
              {[28, 28, 28].map((w, i) => (
                <div
                  key={i}
                  className="_todo-sh"
                  style={{ width: w, height: w, borderRadius: 6 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main wrapper ─────────────────────────────────────────────────────────────
const TodoAppShadowWrapper = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isCssReady, setIsCssReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load (or hot-swap) the todo manager bundle script.
  useEffect(() => {
    let cancelled = false;

    if (resolvedBundleUrl) {
      setIsScriptLoaded(true);
      return;
    }

    const version = Date.now();
    fetch(`/assets/assets.json?v=${version}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`assets.json fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;

        const newBundleUrl: string = data["cn_todo_manager.bundle.js"];
        if (!newBundleUrl) {
          throw new Error(
            "cn_todo_manager.bundle.js key missing from assets.json",
          );
        }

        const existingScript = document.querySelector<HTMLScriptElement>(
          "script[data-todo-bundle]",
        );

        if (existingScript) {
          const existingSrc = existingScript.src.split("?")[0];
          const newSrc = newBundleUrl.split("?")[0];

          if (existingSrc === newSrc) {
            resolvedBundleUrl = newBundleUrl;
            setIsScriptLoaded(true);
            return;
          }

          existingScript.remove();
          resolvedBundleUrl = null;
        }

        const script = document.createElement("script");
        script.type = "module";
        script.src = newBundleUrl;
        script.setAttribute("data-todo-bundle", "true");
        script.onload = () => {
          if (!cancelled) {
            resolvedBundleUrl = newBundleUrl;
            setIsScriptLoaded(true);
          }
        };
        script.onerror = () => {
          if (!cancelled) {
            console.error(
              "[TodoApp] Failed to load todo bundle:",
              newBundleUrl,
            );
            setLoadError(
              "Failed to load the Todo module. Please refresh the page.",
            );
          }
        };
        document.body.appendChild(script);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(
            "[TodoApp] Failed to resolve todo manager bundle:",
            error,
          );
          setLoadError(
            "Could not load Todo configuration. Please refresh the page.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Attach shadow DOM and render web component once script is loaded.
  //
  // CSS-flash fix: inject all stylesheets and wait for every onload event
  // (via Promise.all) before setting isCssReady=true. The skeleton is shown
  // in place of the container until all CSS has arrived.
  //
  // Theme propagation: inject NOVA token CSS into the shadow root using
  // :host / :host([data-theme]) selectors, then start a MutationObserver
  // that keeps the shadow host's data-theme in sync with the host <html>.
  useEffect(() => {
    if (!isScriptLoaded) return;

    const container = containerRef.current;
    if (!container) return;

    if (container.shadowRoot) {
      // Re-sync theme in case it changed while unmounted
      const currentTheme = document.documentElement.dataset.theme ?? "light";
      container.dataset.theme = currentTheme;
      if (currentTheme === "dark") container.classList.add("dark");
      else container.classList.remove("dark");
      setIsCssReady(true);
      return;
    }

    const shadowRoot = container.attachShadow({ mode: "open" });

    // ── Theme vars: inject FIRST (defines CSS custom properties) ─────────
    // CSS variable definitions don't depend on cascade order — they only
    // need to be defined on the :host element, which we do here. The actual
    // dark-mode OVERRIDES (NOVA_OVERRIDES_CSS) are injected after the todo
    // app's link stylesheets have loaded, so they land last in the cascade.
    const themeVarsStyle = document.createElement("style");
    themeVarsStyle.setAttribute("data-todo-vars", "true");
    themeVarsStyle.textContent = NOVA_VARS_CSS;
    shadowRoot.appendChild(themeVarsStyle);

    // Helper: sync both data-theme and .dark class on the shadow host so that:
    //  - :host([data-theme="dark"]) selectors in NOVA_THEME_CSS fire
    //  - .dark class activates the todo app's own darkMode:["class"] Tailwind CSS
    const applyTheme = (el: HTMLElement, theme: string) => {
      el.dataset.theme = theme;
      if (theme === "dark") {
        el.classList.add("dark");
      } else {
        el.classList.remove("dark");
      }
    };

    const currentTheme = document.documentElement.dataset.theme ?? "light";
    applyTheme(container, currentTheme);

    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          const nextTheme = document.documentElement.dataset.theme ?? "light";
          applyTheme(container, nextTheme);
        }
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // ── CSS stylesheets ────────────────────────────────────────────────
    const version = Date.now();
    const stylesheets = [
      `/assets/cn_todo_manager/todoapp/react-vendor.css?v=${version}`,
      `/assets/cn_todo_manager/todoapp/task-modal.css?v=${version}`,
      `/assets/cn_todo_manager/todoapp/index.css?v=${version}`,
    ];

    const cssPromises = stylesheets.map(
      (href) =>
        new Promise<void>((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.crossOrigin = "anonymous";
          link.href = href;
          link.onload = () => resolve();
          link.onerror = () => {
            console.warn("[TodoApp] CSS failed to load:", href);
            resolve();
          };
          shadowRoot.appendChild(link);
        }),
    );

    Promise.all(cssPromises).then(() => {
      // ── Theme overrides: injected LAST so they definitively win the cascade ──
      // The todo app's bundled CSS (loaded via the links above) may set its
      // own bg/color rules. By appending our override <style> AFTER those
      // links have resolved, we are the final stylesheet in the shadow root
      // and our !important rules will always win.
      const themeOverridesStyle = document.createElement("style");
      themeOverridesStyle.setAttribute("data-todo-overrides", "true");
      themeOverridesStyle.textContent = NOVA_OVERRIDES_CSS;
      shadowRoot.appendChild(themeOverridesStyle);

      setIsCssReady(true);
    });

    const todoApp = document.createElement("todo-app-atomic");
    todoApp.setAttribute("mode", "widget");
    shadowRoot.appendChild(todoApp);

    return () => {
      themeObserver.disconnect();
      shadowRoot.innerHTML = "";
      setIsCssReady(false);
    };
  }, [isScriptLoaded]);

  // ── Portal dark-mode styles ──────────────────────────────────────────────
  // TaskModalLayout renders via ReactDOM.createPortal into document.body,
  // which is OUTSIDE the shadow DOM. Shadow-scoped CSS cannot reach it.
  // We inject a <style> into document.head and keep it in sync with the
  // host document's data-theme attribute.
  useEffect(() => {
    const PORTAL_DARK_CSS = `
            /* ── Todo portal dark-mode overrides ── */
            /* ── Modal & Drawer Panels ── */
            /* Centered modal cards (CreateTodoModal, DelegationModal, ConfirmationModal) */
            html[data-theme="dark"] body > div[style*="position: fixed"] > div[style*="max-width"],
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div,
            html[data-theme="dark"] body > div[class*="tw-fixed"] > div[class*="tw-max-w"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] > div[class*="tw-bg-white"] {
                background-color: rgb(11 23 36) !important;
                color: rgb(246 251 255) !important;
                border: 1px solid rgb(30 58 77) !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
            }

            /* Right-side drawer panel (TaskModalLayout) */
            html[data-theme="dark"] body > div[style*="position: fixed"] > div > div:last-child {
                background: rgb(11 23 36) !important;
                color: rgb(246 251 255) !important;
                box-shadow: -2px 0 20px rgba(0,0,0,0.5) !important;
            }

            /* Left-side translucent backdrop with blur (TaskModalLayout) */
            html[data-theme="dark"] body > div[style*="position: fixed"] > div > div:first-child,
            html[data-theme="dark"] body > div[style*="z-index: 1030"] > div > div:first-child,
            html[data-theme="dark"] body > div[style*="position: fixed"] > div > div[style*="backdropFilter"],
            html[data-theme="dark"] body > div[style*="position: fixed"] > div > div[style*="backdrop-filter"] {
                background: rgba(0, 0, 0, 0.4) !important;
                background-color: rgba(0, 0, 0, 0.4) !important;
                backdrop-filter: blur(4px) !important;
                -webkit-backdrop-filter: blur(4px) !important;
                border: none !important;
            }

            /* Modal portal root overlay transparency */
            html[data-theme="dark"] body > div[style*="z-index: 1030"],
            html[data-theme="dark"] body > div[style*="z-index: 1030"] > div {
                background: transparent !important;
                background-color: transparent !important;
            }

            /* Header bar inside drawer panel or modal */
            html[data-theme="dark"] body > div[style*="position: fixed"] > div > div:last-child > div:first-child,
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:first-child,
            html[data-theme="dark"] body > div[class*="tw-fixed"] > div[class*="tw-max-w"] > div:first-child,
            html[data-theme="dark"] body > div[class*="tw-fixed"] > div > div:first-child {
                border-bottom-color: rgb(30 58 77) !important;
                background: rgb(11 23 36) !important;
            }

            /* Modal Header titles and icons */
            html[data-theme="dark"] body > div[style*="position: fixed"] h2,
            html[data-theme="dark"] body > div[class*="tw-fixed"] h2 {
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] h2 svg,
            html[data-theme="dark"] body > div[style*="position: fixed"] div > svg[style*="#2563eb"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div > svg[style*="rgb(37, 99, 235)"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] h2 svg {
                color: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button svg,
            html[data-theme="dark"] body > div[class*="tw-fixed"] button svg {
                color: rgb(147 167 180) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button:hover svg,
            html[data-theme="dark"] body > div[class*="tw-fixed"] button:hover svg {
                color: rgb(246 251 255) !important;
            }

            /* Modal content area */
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:nth-child(2),
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:nth-child(2) {
                background-color: rgb(11 23 36) !important;
                color: rgb(246 251 255) !important;
            }

            /* Modal Footer */
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:last-child,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:last-child,
            html[data-theme="dark"] body > div[class*="tw-fixed"] > div > div:last-child {
                background-color: rgb(11 23 36) !important;
                border-top: 1px solid rgb(30 58 77) !important;
            }

            /* Modal Footer Secondary / Cancel Buttons */
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:last-child button:first-child,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:last-child button:first-child,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="background-color: white"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="background-color: rgb(255, 255, 255)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="background: white"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="backgroundColor: white"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="#ffffff"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] button[class*="tw-bg-white"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] button[class*="tw-border-gray-300"] {
                background-color: rgb(18 36 51) !important;
                color: rgb(216 228 236) !important;
                border: 1px solid rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:last-child button:first-child:hover,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:last-child button:first-child:hover,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="background-color: white"]:hover,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="backgroundColor: white"]:hover,
            html[data-theme="dark"] body > div[class*="tw-fixed"] button[class*="tw-bg-white"]:hover {
                background-color: rgb(26 58 84) !important;
                color: rgb(246 251 255) !important;
            }

            /* Modal Footer Primary / Create Buttons */
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:last-child button:last-child,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:last-child button:last-child {
                background-color: rgb(24 217 255) !important;
                color: rgb(16 52 72) !important;
                font-weight: 600 !important;
                border: none !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"][style*="align-items: center"] > div > div:last-child button:last-child:hover,
            html[data-theme="dark"] body > div[style*="z-index: 3020"] > div > div:last-child button:last-child:hover {
                background-color: rgb(106 228 255) !important;
            }

            /* Modal Labels */
            html[data-theme="dark"] body > div[style*="position: fixed"] label,
            html[data-theme="dark"] body > div[class*="tw-fixed"] label {
                color: rgb(216 228 236) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] label svg,
            html[data-theme="dark"] body > div[class*="tw-fixed"] label svg {
                color: rgb(147 167 180) !important;
            }

            /* Dropdown Popovers (Todo Type, Allocated To, custom selects) */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] {
                background-color: rgb(14 30 44) !important;
                border: 1px solid rgb(30 58 77) !important;
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.7) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"] input,
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] input {
                background-color: rgb(11 23 36) !important;
                border: none !important;
                border-bottom: 1px solid rgb(30 58 77) !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"] div[style*="overflow-y: auto"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] div[style*="overflow-y: auto"] {
                background-color: rgb(14 30 44) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"] div[style*="cursor: pointer"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] div[style*="cursor: pointer"] {
                background-color: rgb(14 30 44) !important;
                color: rgb(216 228 236) !important;
                border-bottom: 1px solid rgb(23 51 67) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"] div[style*="cursor: pointer"]:hover,
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] div[style*="cursor: pointer"]:hover {
                background-color: rgb(26 58 84) !important;
                color: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="position: absolute"] div[style*="text-align: center"],
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="position: absolute"] div[style*="text-align: center"] {
                background-color: rgb(14 30 44) !important;
                color: rgb(147 167 180) !important;
            }

            /* Quill Rich Text Editor */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="overflow: hidden"]:has(.ql-container),
            html[data-theme="dark"] body > div[class*="tw-fixed"] div[style*="overflow: hidden"]:has(.ql-container) {
                border-color: rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-toolbar.ql-snow,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-toolbar.ql-snow {
                background-color: rgb(14 30 44) !important;
                border: none !important;
                border-bottom: 1px solid rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-container.ql-snow,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-container.ql-snow {
                background-color: rgb(16 52 72) !important;
                border: none !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-editor,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-editor {
                color: rgb(246 251 255) !important;
                min-height: 80px;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-editor.ql-blank::before,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-editor.ql-blank::before {
                color: rgb(107 132 150) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-stroke,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-stroke {
                stroke: rgb(182 198 209) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-fill,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-fill {
                fill: rgb(182 198 209) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow button:hover .ql-stroke,
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow button.ql-active .ql-stroke,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow button:hover .ql-stroke,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow button.ql-active .ql-stroke {
                stroke: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow button:hover .ql-fill,
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow button.ql-active .ql-fill,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow button:hover .ql-fill,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow button.ql-active .ql-fill {
                fill: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-picker,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-picker {
                color: rgb(182 198 209) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-picker-label,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-picker-label {
                color: rgb(182 198 209) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-picker-options,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-picker-options {
                background-color: rgb(14 30 44) !important;
                border: 1px solid rgb(30 58 77) !important;
                color: rgb(216 228 236) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .ql-snow .ql-picker-item:hover,
            html[data-theme="dark"] body > div[class*="tw-fixed"] .ql-snow .ql-picker-item:hover {
                color: rgb(24 217 255) !important;
            }

            /* CustomPopper DatePicker & Dropdown Menu */
            html[data-theme="dark"] body > div[style*="z-index: 9999"],
            html[data-theme="dark"] body > div.tw-z-50 {
                background-color: rgb(14 30 44) !important;
                border: 1px solid rgb(30 58 77) !important;
                border-radius: 8px !important;
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.7) !important;
                overflow: hidden !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [role="menu"],
            html[data-theme="dark"] body > div.tw-z-50 [role="menu"] {
                background-color: rgb(14 30 44) !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [role="menuitem"],
            html[data-theme="dark"] body > div.tw-z-50 [role="menuitem"],
            html[data-theme="dark"] body > div[style*="z-index: 9999"] button,
            html[data-theme="dark"] body > div.tw-z-50 button {
                color: rgb(216 228 236) !important;
                background-color: transparent !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [role="menuitem"] svg,
            html[data-theme="dark"] body > div.tw-z-50 [role="menuitem"] svg,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] button svg,
            html[data-theme="dark"] body > div.tw-z-50 button svg {
                color: rgb(147 167 180) !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [role="menuitem"]:hover,
            html[data-theme="dark"] body > div.tw-z-50 [role="menuitem"]:hover,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] button:hover,
            html[data-theme="dark"] body > div.tw-z-50 button:hover {
                background-color: rgb(26 58 84) !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [role="menuitem"]:hover svg,
            html[data-theme="dark"] body > div.tw-z-50 [role="menuitem"]:hover svg,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] button:hover svg,
            html[data-theme="dark"] body > div.tw-z-50 button:hover svg {
                color: rgb(24 217 255) !important;
            }
            /* Selected option (e.g. Modified) */
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [aria-selected="true"],
            html[data-theme="dark"] body > div.tw-z-50 [aria-selected="true"],
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [style*="#eff6ff"],
            html[data-theme="dark"] body > div.tw-z-50 [style*="#eff6ff"],
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [style*="rgb(239, 246, 255)"],
            html[data-theme="dark"] body > div.tw-z-50 [style*="rgb(239, 246, 255)"],
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [class*="tw-bg-blue-50"],
            html[data-theme="dark"] body > div.tw-z-50 [class*="tw-bg-blue-50"] {
                background-color: rgba(24, 217, 255, 0.15) !important;
                color: rgb(24 217 255) !important;
                font-weight: 500 !important;
            }
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [aria-selected="true"] svg,
            html[data-theme="dark"] body > div.tw-z-50 [aria-selected="true"] svg,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [style*="#eff6ff"] svg,
            html[data-theme="dark"] body > div.tw-z-50 [style*="#eff6ff"] svg,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [style*="rgb(239, 246, 255)"] svg,
            html[data-theme="dark"] body > div.tw-z-50 [style*="rgb(239, 246, 255)"] svg,
            html[data-theme="dark"] body > div[style*="z-index: 9999"] [class*="tw-bg-blue-50"] svg,
            html[data-theme="dark"] body > div.tw-z-50 [class*="tw-bg-blue-50"] svg {
                color: rgb(24 217 255) !important;
            }

            /* CustomMultiSelect & CustomSingleSelect inside portals */
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-cursor-text"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-min-h-"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-min-h-[42px]"],
            html[data-theme="dark"] body > div[style*="position: fixed"] .tw-min-h-\\[42px\\],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(249, 250, 251)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: #F9FAFB"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#F9FAFB"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#f9fafb"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="249, 250, 251"],
            html[data-theme="dark"] div[class*="tw-fixed"] [class*="tw-cursor-text"],
            html[data-theme="dark"] div[class*="tw-fixed"] [class*="tw-min-h-"],
            html[data-theme="dark"] div[class*="tw-fixed"] div[style*="#F9FAFB"] {
                background-color: rgb(16 52 72) !important;
                background: rgb(16 52 72) !important;
                border: 1px solid rgb(30 58 77) !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-cursor-text"] input,
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-min-h-"] input,
            html[data-theme="dark"] body > div[style*="position: fixed"] .tw-min-h-\\[42px\\] input,
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#F9FAFB"] input,
            html[data-theme="dark"] body > div[style*="position: fixed"] input.tw-bg-transparent,
            html[data-theme="dark"] div[class*="tw-fixed"] [class*="tw-cursor-text"] input,
            html[data-theme="dark"] div[class*="tw-fixed"] input.tw-bg-transparent {
                background-color: transparent !important;
                background: transparent !important;
                color: rgb(246 251 255) !important;
                box-shadow: none !important;
                outline: none !important;
                border: none !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-cursor-text"] input::placeholder,
            html[data-theme="dark"] body > div[style*="position: fixed"] input.tw-bg-transparent::placeholder,
            html[data-theme="dark"] div[class*="tw-fixed"] input.tw-bg-transparent::placeholder {
                color: rgb(107 132 150) !important;
                opacity: 1 !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .tw-max-h-60.tw-overflow-y-auto,
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(255, 255, 255)"].tw-absolute,
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: #FFFFFF"].tw-absolute {
                background-color: rgb(14 30 44) !important;
                border: 1px solid rgb(30 58 77) !important;
                box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.7) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .tw-max-h-60 div[class*="tw-cursor-pointer"] {
                background-color: transparent !important;
                color: rgb(216 228 236) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .tw-max-h-60 div[class*="tw-cursor-pointer"]:hover {
                background-color: rgb(26 58 84) !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] .react-datepicker {
                background-color: rgb(14 30 44) !important;
                border: none !important;
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] .react-datepicker__header {
                background-color: rgb(11 23 36) !important;
                border-bottom: 1px solid rgb(30 58 77) !important;
            }
            html[data-theme="dark"] .react-datepicker__current-month {
                color: rgb(246 251 255) !important;
            }
            html[data-theme="dark"] .react-datepicker__day-name {
                color: rgb(147 167 180) !important;
            }
            html[data-theme="dark"] .react-datepicker__day {
                color: rgb(216 228 236) !important;
            }
            html[data-theme="dark"] .react-datepicker__day:hover {
                background-color: rgb(26 58 84) !important;
                color: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] .react-datepicker__day--selected,
            html[data-theme="dark"] .react-datepicker__day--keyboard-selected {
                background-color: rgb(24 217 255) !important;
                color: rgb(16 52 72) !important;
                font-weight: 600 !important;
            }
            html[data-theme="dark"] .react-datepicker__navigation-icon::before {
                border-color: rgb(147 167 180) !important;
            }
            html[data-theme="dark"] .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
                border-color: rgb(24 217 255) !important;
            }

            /* General tw- Tailwind class overrides for portal content */
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-white"] {
                background-color: rgb(11 23 36) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-gray-50"] {
                background-color: rgb(14 30 44) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-gray-100"] {
                background-color: rgb(18 36 51) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-900"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-800"] { color: rgb(246 251 255) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-700"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-600"] { color: rgb(216 228 236) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-500"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-text-gray-400"] { color: rgb(147 167 180) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-border-gray-200"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-border-gray-300"] { border-color: rgb(30 58 77) !important; }
            /* Form inputs */
            html[data-theme="dark"] body > div[style*="position: fixed"] input,
            html[data-theme="dark"] body > div[style*="position: fixed"] select,
            html[data-theme="dark"] body > div[style*="position: fixed"] textarea {
                background-color: rgb(16 52 72) !important;
                color: rgb(246 251 255) !important;
                border-color: rgb(30 58 77) !important;
            }
            /* Section collapsible rows (REFERENCE FIELDS, DESCRIPTION etc.) */
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-cursor-pointer"][class~="tw-border-b"] {
                background-color: rgb(14 30 44) !important;
                border-color: rgb(30 58 77) !important;
                color: rgb(216 228 236) !important;
            }
            /* Status / tag pills */
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-blue-50"] { background-color: rgb(14 42 60) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-green-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-emerald-50"] { background-color: rgb(13 51 36) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-red-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-rose-50"] { background-color: rgb(59 20 24) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-amber-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-yellow-50"] { background-color: rgb(58 43 12) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-orange-50"] { background-color: rgb(66 34 10) !important; }
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-purple-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-violet-50"] { background-color: rgb(42 30 66) !important; }

            /* ── Action Buttons in portal (Act, Send, Approve, Reject, Delegation) ── */
            button[data-action="act"],
            button[data-action="act"] *,
            html[data-theme="dark"] body button[data-action="act"],
            html[data-theme="dark"] body button[data-action="act"] *,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="act"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="act"] *,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="#2563eb"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="#2563eb"] *,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="rgb(37, 99, 235)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="rgb(37, 99, 235)"] * {
                background-color: rgb(24 217 255) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
                font-weight: 700 !important;
                border: none !important;
            }
            button[data-action="act"]:hover,
            button[data-action="act"]:hover *,
            html[data-theme="dark"] body button[data-action="act"]:hover,
            html[data-theme="dark"] body button[data-action="act"]:hover *,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="act"]:hover,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="act"]:hover *,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="#2563eb"]:hover,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[style*="#2563eb"]:hover * {
                background-color: rgb(106 228 255) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
            }
            /* Send comment button */
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"] * {
                background-color: rgb(24 217 255) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
                font-weight: 700 !important;
                border: none !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"]:hover,
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"]:hover * {
                background-color: rgb(106 228 255) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
            }
            /* Action pills: Approve, Reject, Delegation, Retrigger */
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="delegation"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-blue-100"] {
                background-color: rgba(24, 217, 255, 0.15) !important;
                color: rgb(24 217 255) !important;
                border: 1px solid rgba(24, 217, 255, 0.35) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action*="approve" i],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-green-100"] {
                background-color: rgba(52, 211, 153, 0.15) !important;
                color: rgb(52, 211, 153) !important;
                border: 1px solid rgba(52, 211, 153, 0.35) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action*="reject" i],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-red-100"] {
                background-color: rgba(248, 113, 113, 0.15) !important;
                color: rgb(248, 113, 113) !important;
                border: 1px solid rgba(248, 113, 113, 0.35) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] button[data-action="retrigger"],
            html[data-theme="dark"] body > div[style*="position: fixed"] button[class*="tw-bg-purple-100"] {
                background-color: rgba(168, 85, 247, 0.15) !important;
                color: rgb(192 132 252) !important;
                border: 1px solid rgba(168, 85, 247, 0.35) !important;
            }

            /* Completed task badges in portal drawer */
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-green-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-text-green-700"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[class*="tw-bg-green-50"][class*="tw-text-green-700"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-bg-green-50"][class*="tw-text-green-700"] {
                background-color: rgba(16, 185, 129, 0.22) !important;
                color: #34d399 !important;
                -webkit-text-fill-color: #34d399 !important;
                border: 1px solid rgba(52, 211, 153, 0.5) !important;
                font-weight: 600 !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-green-50"] svg,
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-bg-green-50"][class*="tw-text-green-700"] svg {
                color: #34d399 !important;
                stroke: #34d399 !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-red-50"],
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-text-red-700"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[class*="tw-bg-red-50"][class*="tw-text-red-700"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-bg-red-50"][class*="tw-text-red-700"] {
                background-color: rgba(239, 68, 68, 0.22) !important;
                color: #f87171 !important;
                -webkit-text-fill-color: #f87171 !important;
                border: 1px solid rgba(248, 113, 113, 0.5) !important;
                font-weight: 600 !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-red-50"] svg,
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-bg-red-50"][class*="tw-text-red-700"] svg {
                color: #f87171 !important;
                stroke: #f87171 !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-green-500"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[class*="tw-bg-green-500"] {
                background-color: #059669 !important;
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
                font-weight: 600 !important;
                border: none !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] .smart-actions span[class*="tw-bg-red-500"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[class*="tw-bg-red-500"] {
                background-color: #dc2626 !important;
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
                font-weight: 600 !important;
                border: none !important;
            }

            /* ── Header Badges & Dropdown Pills (Detail Card) ── */
            /* Status dropdown pill (e.g. In Progress) */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(219, 234, 254)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#dbeafe"] {
                background-color: rgba(24, 217, 255, 0.15) !important;
                color: rgb(24 217 255) !important;
                border-color: rgba(24, 217, 255, 0.35) !important;
            }
            /* Due date pill: overdue */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#fee2e2"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(254, 226, 226)"] {
                background-color: rgba(248, 113, 113, 0.18) !important;
                color: rgb(248 113 113) !important;
                border-color: rgba(248, 113, 113, 0.35) !important;
            }
            /* Due date pill: due today / due tomorrow / warning */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#fed7aa"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#fef3c7"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(254, 243, 199)"] {
                background-color: rgba(251, 191, 36, 0.18) !important;
                color: rgb(251 191 36) !important;
                border-color: rgba(251, 191, 36, 0.35) !important;
            }
            /* Due date pill: normal / no date */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#f9fafb"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(249, 250, 251)"] {
                background-color: rgb(16 52 72) !important;
                color: rgb(147 167 180) !important;
                border-color: rgb(30 58 77) !important;
            }
            /* Category dropdown pill */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#f3e8ff"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(243, 232, 255)"] {
                background-color: rgba(168, 85, 247, 0.18) !important;
                color: rgb(192 132 252) !important;
                border-color: rgba(168, 85, 247, 0.35) !important;
            }
            /* Assignee dropdown pill */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="#eff6ff"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(239, 246, 255)"] {
                background-color: rgba(24, 217, 255, 0.15) !important;
                color: rgb(24 217 255) !important;
                border-color: rgba(24, 217, 255, 0.35) !important;
            }

            /* ── Leave Balance Section in Task Details ── */
            /* Current Balance card */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: rgb(239, 246, 255)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="background-color: #eff6ff"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-bg-blue-50"] {
                background-color: rgb(16 52 72) !important;
                border-color: rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] span[style*="color: #1d4ed8"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[style*="color: rgb(29, 78, 216)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] [class*="tw-text-blue-700"] {
                color: rgb(24 217 255) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] span[style*="color: #3b82f6"] {
                color: rgb(147 167 180) !important;
            }
            /* Leave balance table */
            html[data-theme="dark"] body > div[style*="position: fixed"] div[style*="border: 1px solid #e5e7eb"] {
                border-color: rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] table thead tr,
            html[data-theme="dark"] body > div[style*="position: fixed"] table th {
                background-color: rgb(14 30 44) !important;
                color: rgb(147 167 180) !important;
                border-bottom-color: rgb(30 58 77) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] table tbody tr {
                border-bottom-color: rgb(30 58 77) !important;
                transition: background-color 0.15s ease-in-out;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] table tbody tr:hover {
                background-color: rgb(26 58 84) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] table tbody td {
                color: rgb(216 228 236) !important;
            }
            html[data-theme="dark"] body > div[style*="position: fixed"] table tbody tr[style*="#eff6ff99"] {
                background-color: rgba(24, 217, 255, 0.08) !important;
            }
            /* Applied badge in leave table */
            html[data-theme="dark"] body > div[style*="position: fixed"] span[style*="background-color: rgb(219, 234, 254)"],
            html[data-theme="dark"] body > div[style*="position: fixed"] span[style*="#dbeafe"] {
                background-color: rgba(24, 217, 255, 0.18) !important;
                color: rgb(24 217 255) !important;
            }

            /* ::placeholder */
            html[data-theme="dark"] body > div[style*="position: fixed"] ::placeholder { color: rgb(107 132 150); opacity: 1; }
            /* Close button */
            html[data-theme="dark"] body > div[style*="position: fixed"] [class~="tw-bg-transparent"]:hover {
                background-color: rgb(23 51 67) !important;
            }
        `;

    const PORTAL_LIGHT_CSS = `
            button[data-action="act"],
            button[data-action="act"] *,
            body button[data-action="act"],
            body button[data-action="act"] *,
            body > div[style*="position: fixed"] button[data-action="act"],
            body > div[style*="position: fixed"] button[data-action="act"] *,
            body > div[style*="position: fixed"] button[style*="background-color: rgb(37, 99, 235)"],
            body > div[style*="position: fixed"] button[style*="background-color: rgb(37, 99, 235)"] *,
            body > div[style*="position: fixed"] button[style*="#2563eb"],
            body > div[style*="position: fixed"] button[style*="#2563eb"] *,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"],
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"] *,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-500"],
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-500"] * {
                background-color: rgb(24 217 255) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
                font-weight: 700 !important;
                border: none !important;
            }
            button[data-action="act"]:hover,
            button[data-action="act"]:hover *,
            body button[data-action="act"]:hover,
            body button[data-action="act"]:hover *,
            body > div[style*="position: fixed"] button[data-action="act"]:hover,
            body > div[style*="position: fixed"] button[data-action="act"]:hover *,
            body > div[style*="position: fixed"] button[style*="#2563eb"]:hover,
            body > div[style*="position: fixed"] button[style*="#2563eb"]:hover *,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"]:hover,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-600"]:hover *,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-500"]:hover,
            body > div[style*="position: fixed"] button[class*="tw-bg-blue-500"]:hover * {
                background-color: rgb(0 184 222) !important;
                color: #0b1724 !important;
                -webkit-text-fill-color: #0b1724 !important;
            }
        `;

    const portalStyle = document.createElement("style");
    portalStyle.setAttribute("data-todo-portal-dark", "true");
    document.head.appendChild(portalStyle);

    const updatePortalStyle = (theme: string) => {
      portalStyle.textContent =
        theme === "dark" ? PORTAL_DARK_CSS : PORTAL_LIGHT_CSS;
    };

    // Set initial state
    updatePortalStyle(document.documentElement.dataset.theme ?? "light");

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      updatePortalStyle(document.documentElement.dataset.theme ?? "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      portalStyle.remove();
    };
  }, []);

  if (loadError) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
          color: "#6b7280",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ margin: 0 }}>{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!isCssReady && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <TodoSkeleton />
        </div>
      )}

      <div
        ref={containerRef}
        className="todo-shadow-container"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          opacity: isCssReady ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: isCssReady ? "auto" : "none",
        }}
      />
    </div>
  );
};

export default TodoAppShadowWrapper;
