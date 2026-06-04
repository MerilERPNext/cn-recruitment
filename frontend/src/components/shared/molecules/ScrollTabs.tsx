import { useEffect, useRef, useState, ReactNode } from "react";
import Button from "../atoms/Button";

export interface ScrollTab {
    key: string;
    label: string;
}

interface ScrollTabsProps {
    tabs: ScrollTab[];
    renderSection: (tab: ScrollTab) => ReactNode;
    offsetClassName?: string;
    stickyTopClassName?: string;
}

export const ScrollTabs = ({
    tabs,
    renderSection,
    offsetClassName = "scroll-mt-28",
    stickyTopClassName = "top-12 md:top-14",
}: ScrollTabsProps) => {
    const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        if (!tabs.length) return;

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveTab(entry.target.id);
                    }
                });
            },
            { rootMargin: "-40% 0px -50% 0px" }
        );

        tabs.forEach(tab => {
            const el = sectionRefs.current[tab.key];
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [tabs]);

    const scrollToSection = (key: string) => {
        sectionRefs.current[key]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    return (
        <>
            {/* Tabs */}
            {tabs.length > 1 && (
                <div className={`sticky ${stickyTopClassName} bg-white z-10 px-0 md:px-6 pb-2`}>
                    <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide">
                        {tabs.map(tab => (
                            <Button
                                key={tab.key}
                                onClick={() => scrollToSection(tab.key)}
                                variant="subtle"
                                size="sm"
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold
                  ${activeTab === tab.key
                                        ? "bg-primary-50 text-header-active"
                                        : "text-header-inactive hover:text-header-active"
                                    }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Sections */}
            <div className="space-y-6 pb-6">
                {tabs.map(tab => (
                    <section
                        key={tab.key}
                        id={tab.key}
                        ref={el => {
                            sectionRefs.current[tab.key] = el;
                        }}
                        className={offsetClassName}
                    >
                        {renderSection(tab)}
                    </section>
                ))}
            </div>
        </>
    );
};
