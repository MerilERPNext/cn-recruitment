import { FC, ReactNode, useEffect, useRef, useState } from "react";

interface ContextualPopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

const ContextualPopup: FC<ContextualPopupProps> = ({
  isOpen,
  onClose,
  children,
  triggerRef,
  className = "",
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current && popupRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;

      // Adjust if popup would go off-screen horizontally
      if (left + popupRect.width > viewport.width) {
        left = triggerRect.right - popupRect.width;
      }

      // Adjust if popup would go off-screen vertically
      if (top + popupRect.height > viewport.height) {
        top = triggerRect.top - popupRect.height - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[150px] ${className}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {children}
    </div>
  );
};

export default ContextualPopup;
