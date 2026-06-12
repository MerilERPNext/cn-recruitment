import React, { useEffect, useRef, useState } from "react";
import Button, { ButtonColor, ButtonVariant } from "./shared/atoms/Button";

export interface Tab {
  key: string;
  label: string;
  permissionKey?: string;
}

interface NavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: ButtonVariant
  bgColor?: ButtonColor
}

const NavigationTabs: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = "subtle",
  bgColor = "text",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const index = tabs.findIndex((t) => t.key === activeTab);
    const currentTab = tabRefs.current[index];
    if (currentTab && containerRef.current) {
      setUnderlineStyle({
        left: currentTab.offsetLeft,
        width: currentTab.offsetWidth,
      });
      currentTab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab, tabs]);

  return (
    <nav className="sticky top-0 z-10 min-w-0 bg-white px-3 sm:px-4">
      <div
        ref={containerRef}
        className="relative flex min-w-0 gap-2 overflow-x-auto hide-scrollbar sm:gap-4"
      >
        {tabs.map((tab, idx) => (
          <Button
            variant={variant}
            bgColor={bgColor}
            key={tab.key}
            size="md"
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            onClick={() => onTabChange(tab.key)}
            className={`hover:bg-transparent shrink-0 text-center px-2 py-3 outline-none focus:outline-none font-semibold transition-colors duration-200
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
