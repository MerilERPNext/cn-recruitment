import { useEffect, useRef, useState } from "react";

/**
 * Shadow DOM wrapper for todo-app-atomic web component
 * Isolates the web component's styles from the host application
 * Dynamically loads the todo manager bundle before rendering
 */
const TodoAppShadowWrapper = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    // Load the todo manager bundle script
    useEffect(() => {
        // Check if script is already loaded
        if (document.querySelector('script[data-todo-bundle]')) {
            setIsScriptLoaded(true);
            return;
        }

        fetch("/assets/assets.json")
            .then((response) => response.json())
            .then((data) => {
                const script = document.createElement("script");
                script.type = "module";
                script.src = data["cn_todo_manager.bundle.js"];
                script.setAttribute("data-todo-bundle", "true");
                script.onload = () => setIsScriptLoaded(true);
                document.body.appendChild(script);
            })
            .catch((error) => {
                console.error("Failed to load todo manager bundle:", error);
            });
    }, []);

    // Attach shadow DOM and render web component once script is loaded
    useEffect(() => {
        if (!isScriptLoaded) return;

        const container = containerRef.current;
        if (!container || container.shadowRoot) return;

        const shadowRoot = container.attachShadow({ mode: "open" });

        // Add stylesheets to shadow DOM for proper styling isolation
        const stylesheets = [
            "/assets/cn_todo_manager/todoapp/react-vendor.css",
            "/assets/cn_todo_manager/todoapp/task-modal.css",
            "/assets/cn_todo_manager/todoapp/index.css",
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

    return <div ref={containerRef} className="todo-shadow-container" />;
};

export default TodoAppShadowWrapper;