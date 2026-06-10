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
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const computePosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      // Anchor from the right edge of the trigger — avoids needing popup width
      const right = viewport.width - triggerRect.right;
      let top = triggerRect.bottom + 4;

      // If popup would overflow bottom, flip above the trigger
      if (popupRef.current) {
        const popupHeight = popupRef.current.offsetHeight;
        if (top + popupHeight > viewport.height) {
          top = triggerRect.top - popupHeight - 4;
        }
      }

      setPosition({ top, right });
    };

    // Run immediately then again after one frame so offsetHeight is available
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
      className={`fixed z-50 bg-white border border-gray-200 rounded-md shadow-md min-w-[150px] ${className}`}
      style={
        position
          ? { top: `${position.top}px`, right: `${position.right}px` }
          : { visibility: "hidden", top: 0, right: 0 }
      }
    >
      {children}
    </div>
  );
};

export default ContextualPopup;
