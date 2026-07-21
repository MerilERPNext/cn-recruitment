import { useEffect, useCallback } from "react";

type Placement = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

interface Options {
    placement?: Placement;
    align?: Align;
    offset?: number;
}


// this hook is used to position the floating element relative to the reference element,
// when the floating element should not be clipped by ascestor compoenet 
export function useFloatingPosition<T extends HTMLElement, U extends HTMLElement>(
    referenceRef: React.RefObject<T | null>,
    floatingRef: React.RefObject<U | null>,
    isOpen: boolean,
    options: Options = {}
) {
    const {
        placement = "bottom",
        align = "center",
        offset = 8,
    } = options;

    const updatePosition = useCallback(() => {
        const refEl = referenceRef?.current;
        const floatEl = floatingRef?.current;

        if (!refEl || !floatEl) return;

        const rect = refEl.getBoundingClientRect();
        const floatRect = floatEl.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // --- BASE PLACEMENT ---
        switch (placement) {
            case "top":
                top = rect.top - floatRect.height - offset;
                break;
            case "bottom":
                top = rect.bottom + offset;
                break;
            case "left":
                left = rect.left - floatRect.width - offset;
                break;
            case "right":
                left = rect.right + offset;
                break;
        }

        // --- CROSS AXIS ALIGNMENT ---
        if (placement === "top" || placement === "bottom") {
            switch (align) {
                case "start":
                    left = rect.left;
                    break;
                case "center":
                    left = rect.left + rect.width / 2 - floatRect.width / 2;
                    break;
                case "end":
                    left = rect.right - floatRect.width;
                    break;
            }
        } else {
            switch (align) {
                case "start":
                    top = rect.top;
                    break;
                case "center":
                    top = rect.top + rect.height / 2 - floatRect.height / 2;
                    break;
                case "end":
                    top = rect.bottom - floatRect.height;
                    break;
            }
        }

        floatEl.style.position = "fixed";
        floatEl.style.top = `${top}px`;
        floatEl.style.left = `${left}px`;
    }, [referenceRef, floatingRef, placement, align, offset]);

    useEffect(() => {
        let rafId: number;

        const run = () => {
            rafId = requestAnimationFrame(() => {
                updatePosition();
            });
        };

        run();

        window.addEventListener("scroll", run, true);
        window.addEventListener("resize", run);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", run, true);
            window.removeEventListener("resize", run);
        };
    }, [updatePosition]);

    useEffect(() => {
        if (!isOpen) return;

        const id = requestAnimationFrame(() => {
            updatePosition();
        });

        return () => cancelAnimationFrame(id);
    }, [isOpen, updatePosition]);

    return { updatePosition };
}