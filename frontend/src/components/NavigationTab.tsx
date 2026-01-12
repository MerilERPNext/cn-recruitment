import React, { useEffect, useRef, useState } from "react";
import Button from "./shared/atoms/Button";

export interface Tab {
  key: string;
  label: string;
}

interface NavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NavigationTabs: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const index = tabs.findIndex((t) => t.key === activeTab);
    const currentTab = tabRefs.current[index];
    if (currentTab && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = currentTab.getBoundingClientRect();
      const tabOffsetLeft = tabRect.left - containerRect.left;

      setUnderlineStyle({
        left: tabOffsetLeft + containerRef.current.scrollLeft,
        width: tabRect.width,
      });
      // Auto-focus and scroll into view
      currentTab.focus();
      currentTab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab, tabs]);

  return (
    <nav className="sticky top-0 z-10 bg-white px-4">
      <div
        ref={containerRef}
        className="relative flex overflow-x-auto hide-scrollbar gap-4"
      >
        {tabs.map((tab, idx) => (
          <Button
            variant="subtle"
            key={tab.key}
            size="md"
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 min-w-fit text-center w-fit px-2 py-3 outline-none focus:outline-none font-semibold  transition-colors duration-200
              ${activeTab === tab.key ? "text-primary-500" : "text-gray-600 "}`}
          >
            {tab.label}
          </Button>
        ))}
        <span
          className="absolute bottom-0 h-[3px] bg-primary-500 transition-all duration-300 rounded-tr-3xl rounded-tl-3xl"
          style={{
            transform: `translateX(${underlineStyle.left}px)`,
            width: underlineStyle.width,
          }}
        />
      </div>
    </nav>
  );
};

export default NavigationTabs;
