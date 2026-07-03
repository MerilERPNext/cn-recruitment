import React, { useState, useRef, useEffect } from "react";

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface DropdownMenuProps {
  items: MenuItem[];
  children: React.ReactNode | ((isOpen: boolean) => React.ReactNode);
  placement?:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "center-left"
    | "center-right";
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  children,
  placement = "bottom-right",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Tailwind classes for placement
  const positionClasses: Record<string, string> = {
    "bottom-right": "top-full mt-2 left-0",
    "bottom-left": "top-full mt-2 right-0",
    "top-right": "bottom-full mb-2 right-0",
    "top-left": "bottom-full mb-2 left-0",
    "center-left": "top-1/2 -translate-y-1/2 right-[calc(100%+10px)]",
    "center-right": "top-1/2 -translate-y-1/2 left-[calc(100%+10px)]",
  };

  // Support render function for children to access open state
  const renderChildren = typeof children === "function" ? children(open) : children;

  return (
    <div
      ref={menuRef}
      className="relative inline-block text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Custom Trigger */}
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {renderChildren}
      </div>

      {/* Menu */}
      {open && (
        <div
          className={`
            absolute min-w-[160px] w-max rounded-lg shadow-lg bg-white ring-1 ring-black/5 z-20
            ${positionClasses[placement]}
          `}
        >
          <ul className="py-1">
            {items.map((item, idx) => (
              <li key={idx}>
                <button
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full whitespace-nowrap px-4 py-2 text-sm hover:bg-primary/10 ${className || ""} ${item.className || ""}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
