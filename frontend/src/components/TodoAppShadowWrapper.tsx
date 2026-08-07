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
 */
const TodoAppShadowWrapper = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load (or hot-swap) the todo manager bundle script
    useEffect(() => {
        let cancelled = false;

        // A timestamp version stamp used for cache-busting on every mount.
        // assets.json is tiny (~1 KB) so the extra network hit is negligible.
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
                    throw new Error("cn_todo_manager.bundle.js key missing from assets.json");
                }

                const existingScript = document.querySelector<HTMLScriptElement>(
                    "script[data-todo-bundle]"
                );

                // Fix 3: If a script tag already exists but points to a stale bundle
                // (i.e. the page was open during a deployment), remove it and reload
                // with the new bundle URL.
                if (existingScript) {
                    // Strip query params from both sides before comparing so that
                    // two fetches within the same session don't double-load.
                    const existingSrc = existingScript.src.split("?")[0];
                    const newSrc = newBundleUrl.split("?")[0];

                    if (existingSrc === newSrc) {
                        // Same bundle → already loaded, nothing to do
                        setIsScriptLoaded(true);
                        return;
                    }

                    // Different bundle → stale script from before deploy; replace it
                    console.warn(
                        "[TodoApp] Detected stale bundle tag after deployment – reloading bundle:",
                        { old: existingSrc, new: newSrc }
                    );
                    existingScript.remove();
                }

                // Fix 1: Load new bundle. The bundle URL from assets.json already
                // carries a content hash in its filename (Vite default), so adding
                // ?v= here is optional but kept for safety.
                const script = document.createElement("script");
                script.type = "module";
                script.src = newBundleUrl;
                script.setAttribute("data-todo-bundle", "true");
                script.onload = () => {
                    if (!cancelled) setIsScriptLoaded(true);
                };
                script.onerror = () => {
                    if (!cancelled) {
                        console.error("[TodoApp] Failed to load todo bundle:", newBundleUrl);
                        setLoadError(
                            "Failed to load the Todo module. Please refresh the page."
                        );
                    }
                };
                document.body.appendChild(script);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error("[TodoApp] Failed to resolve todo manager bundle:", error);
                    setLoadError(
                        "Could not load Todo configuration. Please refresh the page."
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Attach shadow DOM and render web component once script is loaded
    useEffect(() => {
        if (!isScriptLoaded) return;

        const container = containerRef.current;
        if (!container || container.shadowRoot) return;

        const shadowRoot = container.attachShadow({ mode: "open" });

        // Fix 2: Cache-bust CSS hrefs so stale styles are never served after a deploy.
        // Using the same timestamp strategy keeps it simple and reliable.
        const version = Date.now();
        const stylesheets = [
            `/assets/cn_todo_manager/todoapp/react-vendor.css?v=${version}`,
            `/assets/cn_todo_manager/todoapp/task-modal.css?v=${version}`,
            `/assets/cn_todo_manager/todoapp/index.css?v=${version}`,
        ];

        stylesheets.forEach((href) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.crossOrigin = "anonymous";
            link.href = href;
            shadowRoot.appendChild(link);
        });

        // Create and append the web component
        const todoApp = document.createElement("todo-app-atomic");
        todoApp.setAttribute("mode", "widget");
        shadowRoot.appendChild(todoApp);

        return () => {
            shadowRoot.innerHTML = "";
        };
    }, [isScriptLoaded]);

    // Error state – shown when bundle or assets.json fails to load
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
        <div
            ref={containerRef}
            className="todo-shadow-container"
            style={{ width: "100%", height: "100%", display: "block" }}
        />
    );
};

export default TodoAppShadowWrapper;