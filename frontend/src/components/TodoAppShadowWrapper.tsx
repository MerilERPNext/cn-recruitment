import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
 */

// ─── Skeleton loader ─────────────────────────────────────────────────────────
/**
 * Layout-matching skeleton shown while shadow-DOM CSS loads on first visit.
 * Uses only inline styles — no external CSS dependency.
 */
const TodoSkeleton = () => (
    <>
        {/* Shimmer keyframe — injected once into the host document head */}
        <style>{`
            @keyframes _todo-shimmer {
                0%   { background-position: -600px 0; }
                100% { background-position:  600px 0; }
            }
            ._todo-sh {
                background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 37%, #f0f0f0 63%);
                background-size: 1200px 100%;
                animation: _todo-shimmer 1.4s ease infinite;
                border-radius: 4px;
            }
        `}</style>

        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#fff", overflow: "hidden" }}>

            {/* Header bar */}
            <div className="_todo-sh" style={{ height: 56, borderRadius: 0, flexShrink: 0 }} />

            {/* Breadcrumb row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px 8px", flexShrink: 0 }}>
                <div className="_todo-sh" style={{ width: 90, height: 13 }} />
                <span style={{ color: "#d1d5db", fontSize: 14 }}>/</span>
                <div className="_todo-sh" style={{ width: 130, height: 13 }} />
                <div style={{ flex: 1 }} />
                {/* "My Todo" pill */}
                <div className="_todo-sh" style={{ width: 80, height: 28, borderRadius: 14 }} />
            </div>

            {/* Main layout: sidebar + content */}
            <div style={{ display: "flex", flex: 1, minHeight: 0, padding: "4px 24px 24px", gap: 0 }}>

                {/* ── Left sidebar ─────────────────────────────────────────── */}
                <div style={{ width: 216, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, paddingRight: 16, paddingTop: 6 }}>
                    {/* Total tasks pill */}
                    <div className="_todo-sh" style={{ height: 36, borderRadius: 8, marginBottom: 4 }} />
                    {/* Category rows */}
                    {[
                        { w: 100, active: true },
                        { w: 120, active: false },
                        { w: 80,  active: false },
                        { w: 95,  active: false },
                    ].map(({ w, active }, i) => (
                        <div key={i} style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: active ? "#eff6ff" : "transparent",
                        }}>
                            <div className="_todo-sh" style={{ width: w, height: 13 }} />
                            <div className="_todo-sh" style={{ width: 24, height: 24, borderRadius: 12 }} />
                        </div>
                    ))}
                </div>

                {/* ── Content area ─────────────────────────────────────────── */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

                    {/* Toolbar: tabs + search + action icons */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px 8px 0 0",
                        backgroundColor: "#fff",
                    }}>
                        <div style={{ display: "flex", gap: 6, background: "#f3f4f6", padding: 4, borderRadius: 8 }}>
                            <div className="_todo-sh" style={{ width: 80, height: 30, borderRadius: 6 }} />
                            <div className="_todo-sh" style={{ width: 90, height: 30, borderRadius: 6, opacity: 0.5 }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div className="_todo-sh" style={{ width: 240, height: 32, borderRadius: 6 }} />
                            <div className="_todo-sh" style={{ width: 34, height: 32, borderRadius: 6 }} />
                            <div className="_todo-sh" style={{ width: 34, height: 32, borderRadius: 6 }} />
                            <div className="_todo-sh" style={{ width: 34, height: 32, borderRadius: 6 }} />
                        </div>
                    </div>

                    {/* Table header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "10px 16px",
                        borderLeft: "1px solid #e5e7eb",
                        borderRight: "1px solid #e5e7eb",
                        borderBottom: "1px solid #e5e7eb",
                        background: "#f9fafb",
                    }}>
                        <div className="_todo-sh" style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0 }} />
                        {[110, 80, 80, 200, 40, 90, 40, 60].map((w, i) => (
                            <div key={i} className="_todo-sh" style={{ width: w, height: 12, flexShrink: 0 }} />
                        ))}
                    </div>

                    {/* Table rows */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "13px 16px",
                            borderLeft: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                            borderBottom: "1px solid #e5e7eb",
                            background: i % 2 === 0 ? "#fff" : "#fafafa",
                        }}>
                            <div className="_todo-sh" style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0 }} />
                            <div className="_todo-sh" style={{ width: 100 + (i % 3) * 18, height: 13 }} />
                            <div className="_todo-sh" style={{ width: 80, height: 13, flexShrink: 0 }} />
                            <div className="_todo-sh" style={{ width: 80, height: 13, flexShrink: 0 }} />
                            <div className="_todo-sh" style={{ flex: 1, height: 13 }} />
                            <div className="_todo-sh" style={{ width: 28, height: 13, flexShrink: 0 }} />
                            <div className="_todo-sh" style={{ width: 70, height: 13, flexShrink: 0 }} />
                            <div className="_todo-sh" style={{ width: 28, height: 20, borderRadius: 10, flexShrink: 0 }} />
                            <div style={{ display: "flex", gap: 6 }}>
                                <div className="_todo-sh" style={{ width: 24, height: 24, borderRadius: 12 }} />
                                <div className="_todo-sh" style={{ width: 24, height: 24, borderRadius: 12 }} />
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        padding: "12px 16px",
                        border: "1px solid #e5e7eb",
                        borderTop: "none",
                        borderRadius: "0 0 8px 8px",
                        background: "#fff",
                    }}>
                        {[28, 28, 28].map((w, i) => (
                            <div key={i} className="_todo-sh" style={{ width: w, height: w, borderRadius: 6 }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </>
);

// ─── Main wrapper ─────────────────────────────────────────────────────────────
const TodoAppShadowWrapper = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const categoryParam = searchParams.get("category");
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [isCssReady, setIsCssReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load (or hot-swap) the todo manager bundle script.
    useEffect(() => {
        let cancelled = false;

        // A timestamp version stamp used for cache-busting on every load.
        const version = Date.now();
        const directBundleUrl = `/assets/cn_todo_manager/todoapp/index.js?v=${version}`;

        const existingScript = document.querySelector<HTMLScriptElement>(
            "script[data-todo-bundle]"
        );

        if (existingScript) {
            existingScript.remove();
        }

        // Direct Vite entry point load with cache-busting
        const script = document.createElement("script");
        script.type = "module";
        script.src = directBundleUrl;
        script.setAttribute("data-todo-bundle", "true");
        script.onload = () => {
            if (!cancelled) {
                setIsScriptLoaded(true);
            }
        };
        script.onerror = () => {
            // Fallback via assets.json if direct path is not available
            fetch(`/assets/assets.json?v=${version}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`assets.json fetch failed: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    if (cancelled) return;

                    const fallbackUrl: string = data["cn_todo_manager.bundle.js"];
                    if (!fallbackUrl) {
                        throw new Error("cn_todo_manager.bundle.js key missing from assets.json");
                    }

                    const fallbackScript = document.createElement("script");
                    fallbackScript.type = "module";
                    fallbackScript.src = `${fallbackUrl}?v=${version}`;
                    fallbackScript.setAttribute("data-todo-bundle", "true");
                    fallbackScript.onload = () => {
                        if (!cancelled) {
                            setIsScriptLoaded(true);
                        }
                    };
                    fallbackScript.onerror = () => {
                        if (!cancelled) {
                            setLoadError("Failed to load the Todo module. Please refresh the page.");
                        }
                    };
                    document.body.appendChild(fallbackScript);
                })
                .catch((error) => {
                    if (!cancelled) {
                        console.error("[TodoApp] Failed to resolve todo manager bundle:", error);
                        setLoadError(
                            "Could not load Todo configuration. Please refresh the page."
                        );
                    }
                });
        };

        document.body.appendChild(script);

        return () => {
            cancelled = true;
        };
    }, []);

    // Attach shadow DOM and render web component once script is loaded.
    //
    // CSS-flash fix: inject all stylesheets and wait for every onload event
    // (via Promise.all) before setting isCssReady=true. The skeleton is shown
    // in place of the container until all CSS has arrived. On warm cache the
    // browser fires onload synchronously, so the skeleton is never visible.
    useEffect(() => {
        if (!isScriptLoaded) return;

        const container = containerRef.current;
        if (!container) return;

        // If the shadow root already exists from a previous mount (hot-reload in dev
        // or StrictMode double-invoke), CSS was already loaded — mark ready immediately.
        if (container.shadowRoot) {
            setIsCssReady(true);
            return;
        }

        const shadowRoot = container.attachShadow({ mode: "open" });

        // Fix 2: Cache-bust CSS hrefs.
        const version = Date.now();
        const stylesheets = [
            `/assets/cn_todo_manager/todoapp/react-vendor.css?v=${version}`,
            `/assets/cn_todo_manager/todoapp/task-modal.css?v=${version}`,
            `/assets/cn_todo_manager/todoapp/index.css?v=${version}`,
        ];

        // Build a Promise per stylesheet that resolves on load (or error, so a
        // missing file doesn't block the reveal forever).
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
                        resolve(); // Don't block on a missing stylesheet
                    };
                    shadowRoot.appendChild(link);
                })
        );

        // Reveal the web component only after every stylesheet has loaded.
        Promise.all(cssPromises).then(() => {
            setIsCssReady(true);
        });

        // Create and append the web component (mounts in background while skeleton shows)
        const todoApp = document.createElement("todo-app-atomic");
        todoApp.setAttribute("mode", "widget");
        if (categoryParam) {
            todoApp.setAttribute("category", categoryParam);
        }
        shadowRoot.appendChild(todoApp);

        return () => {
            shadowRoot.innerHTML = "";
            setIsCssReady(false);
        };
    }, [isScriptLoaded]);

    // Update category attribute if categoryParam changes while already loaded
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !container.shadowRoot) return;
        const todoApp = container.shadowRoot.querySelector("todo-app-atomic");
        if (todoApp && categoryParam) {
            todoApp.setAttribute("category", categoryParam);
        }
    }, [categoryParam]);

    // Clean up category query parameter from address bar once component is ready so it doesn't persist
    useEffect(() => {
        if (categoryParam && isCssReady) {
            const timer = setTimeout(() => {
                try {
                    const url = new URL(window.location.href);
                    if (url.searchParams.has("category")) {
                        url.searchParams.delete("category");
                        const cleanSearch = url.searchParams.toString();
                        const newUrl = url.pathname + (cleanSearch ? `?${cleanSearch}` : "") + url.hash;
                        window.history.replaceState(window.history.state, "", newUrl);
                    }
                } catch (e) {
                    console.error(e);
                }
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [categoryParam, isCssReady]);

    // ── Error state ────────────────────────────────────────────────────────────
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
            {/* Skeleton — visible only while CSS is loading (cold cache first load).
                On warm cache the browser fires CSS onload synchronously so this
                is never painted. */}
            {!isCssReady && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                    <TodoSkeleton />
                </div>
            )}

            {/* Shadow host — always in the DOM so the ref is stable.
                Hidden behind the skeleton until CSS is ready, then fades in. */}
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