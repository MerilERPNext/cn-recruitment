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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const computePosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const padding = 12;

      const popupWidth = popupRef.current?.offsetWidth || 280;
      const popupHeight = popupRef.current?.offsetHeight || 200;

      // Vertical position (prefer below trigger)
      let top = triggerRect.bottom + 6;
      if (top + popupHeight > viewport.height - padding) {
        const flippedTop = triggerRect.top - popupHeight - 6;
        top = flippedTop >= padding ? flippedTop : Math.max(padding, viewport.height - popupHeight - padding);
      }

      // Horizontal position:
      // Try to center with trigger or align with trigger left, clamped to viewport bounds
      let left = triggerRect.left + (triggerRect.width - popupWidth) / 2;
      left = Math.max(padding, Math.min(left, viewport.width - popupWidth - padding));

      setPosition({ top, left });
    };

    // Run immediately then again after one frame so offsetWidth/offsetHeight are accurate
    computePosition();
    const raf = requestAnimationFrame(computePosition);

    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className={`fixed z-50 bg-white border border-gray-200 rounded-md shadow-md max-w-[calc(100vw-24px)] ${className}`}
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : { visibility: "hidden", top: 0, left: 0 }
      }
    >
      {children}
    </div>
  );
};

export default ContextualPopup;
