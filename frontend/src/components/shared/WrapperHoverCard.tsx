import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { useGetEmployeeHoverData } from "../../hooks/useEmployee";
import { createPortal } from "react-dom";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { DataResponse, MessageDataItem } from "../../services/commonSerivce";

type WrapperHoverCardProps = {
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
  employeeId?: string;
  placement?:
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center-left"
  | "center-right";
};


type valueType = string | number | boolean | null;

const mapEmployeeData = (data: MessageDataItem[]) => {
  const map: Record<string, valueType> = {};
  data.forEach((item) => {
    map[item.label] = item.value;
  });
  return map;
};

const stringToPastelColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 65%, 58%)`;
};

const WrapperHoverCard: React.FC<WrapperHoverCardProps> = ({
  children,
  className = "",
  cardClassName = "",
  employeeId = "",
  placement = "center-right",
}) => {
  const { mutateAsync: fetchEmployee } = useGetEmployeeHoverData();

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [employeeInfo, setEmployeeInfo] = useState<DataResponse | null>(null);

  const hasFetchedRef = useRef(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    hasFetchedRef.current = false;
    setEmployeeInfo(null);
    setIsError(false);
    setError(null);
  }, [employeeId]);

  /* Fetch profile */
  const handleFetchProfile = async () => {
    if (!employeeId || hasFetchedRef.current) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const data = await fetchEmployee(employeeId);
      setEmployeeInfo(data);
      hasFetchedRef.current = true;
    } catch (err: unknown) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };
  const targetRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [show, setShow] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animationTimer = useRef<number | null>(null);
  const closedAtRef = useRef(0);

  const handleEnter = () => {
    clearTimeout(hideTimer?.current ?? undefined);
    clearTimeout(animationTimer?.current ?? undefined);
    setShow(true);
    // Start animation after render
    animationTimer.current = setTimeout(() => setIsAnimating(true), 10);
  };

  const handleLeave = (immediate = false) => {
    clearTimeout(hideTimer?.current ?? undefined);
    clearTimeout(animationTimer?.current ?? undefined);
    closedAtRef.current = Date.now();
    if (immediate) {
      // Skip animation — close instantly (for touch dismissals)
      setIsAnimating(false);
      setShow(false);
    } else {
      // Start exit animation
      setIsAnimating(false);
      // Hide card after animation completes (faster exit)
      hideTimer.current = setTimeout(() => setShow(false), 150);
    }
  };

  useEffect(() => {
    if (!show) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        targetRef.current && !targetRef.current.contains(e.target as Node) &&
        cardRef.current && !cardRef.current.contains(e.target as Node)
      ) {
        // Use immediate close for touch to prevent synthetic click from re-opening
        const isTouch = e.type === "touchstart";
        handleLeave(isTouch);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [show]);

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!targetRef.current || !cardRef.current) return;

      const rect = targetRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (placement) {
        case "bottom-right":
          top = rect.bottom + 8;
          left = rect.left;
          break;

        case "bottom-left":
          top = rect.bottom + 8;
          left = rect.right - cardRect.width;
          break;

        case "top-right":
          top = rect.top - cardRect.height - 8;
          left = rect.left;
          break;

        case "top-left":
          top = rect.top - cardRect.height - 8;
          left = rect.right - cardRect.width;
          break;

        case "center-left":
          top = rect.top + rect.height / 2 - cardRect.height / 2;
          left = rect.left - cardRect.width - 12;
          break;

        case "center-right":
        default:
          top = rect.top + rect.height / 2 - cardRect.height / 2;
          left = rect.right + 12;
      }

      const padding = 12;
      const minTop = padding;
      const maxTop = window.innerHeight - cardRect.height - padding;
      const minLeft = padding;
      const maxLeft = window.innerWidth - cardRect.width - padding;

      setPos({
        top: Math.max(minTop, Math.min(top, maxTop)),
        left: Math.max(minLeft, Math.min(left, maxLeft)),
      });
    };

    if (!show) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show, placement, isLoading, employeeInfo]);

  useEffect(() => {
    return () => {
      clearTimeout(hideTimer.current);
      clearTimeout(animationTimer.current ?? undefined);
    };
  }, []);

  return (
    <>
      <div
        ref={targetRef}
        className={`inline-block ${className}`}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          if (Date.now() - mountedAt.current < 500) return;
          e.stopPropagation();
          handleEnter();
          handleFetchProfile();
        }}
        onClick={() => {
          // If card was just closed (within 400ms), ignore — prevents touch re-open
          if (Date.now() - closedAtRef.current < 400) return;
          // Toggle: if already showing, close instead of re-opening
          if (show) {
            handleLeave(true);
            return;
          }
          handleEnter();
          handleFetchProfile();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          handleLeave();
        }}
      >
        {children}
      </div>

      {show &&
        createPortal(
          <>
            {/* Backdrop Dimming Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/15 z-[998] pointer-events-none transition-opacity duration-300"
              style={{ opacity: isAnimating ? 1 : 0 }}
            />

            <div
              ref={cardRef}
              className="fixed z-[999]"
              style={{
                top: pos.top,
                left: pos.left,
                opacity: isAnimating ? 1 : 0,
                transform: isAnimating
                  ? "scale(1) translateY(-8px)"
                  : "scale(0.95) translateY(12px)",
                transition: isAnimating
                  ? "opacity 300ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "opacity 150ms ease-in, transform 150ms ease-in",
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") handleEnter();
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") handleLeave();
              }}
            >
              <div
                className={`relative w-[320px] p-5 rounded-xl bg-white shadow-sm hover:shadow-2xl  transition-all duration-300 ${cardClassName}`}
              >
                {/* Close Button for Mobile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleLeave(true);
                  }}
                  type="button"
                  className="md:hidden absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Loading */}
                {isLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-7 h-7 animate-spin text-gray-600" />
                  </div>
                )}

                {/* Error */}
                {!isLoading && isError && (
                  <div className="py-6 text-center">
                    <p className="text-sm font-medium text-red-600">
                      Failed to load employee info
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(error as { message?: string })?.message || "Please try again"}
                    </p>
                  </div>
                )}

                {/* Data */}
                {!isLoading &&
                  !isError &&
                  employeeInfo?.data &&
                  (() => {
                    const emp = mapEmployeeData(employeeInfo.data);

                    return (
                      <>
                        {/* Header */}
                        <div className="flex items-start gap-4">
                          {emp?.Image && typeof emp.Image === "string" ? (
                            <img
                              src={emp.Image}
                              className="w-16 h-16 rounded-full object-cover"
                              alt="avatar"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                              style={{
                                background: stringToPastelColor(
                                  (emp["Full Name"] || "U") as string,
                                ),
                              }}
                            >
                              {(emp["Full Name"] as string)?.charAt(0)?.toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0 group pr-6">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                              {emp["Full Name"]}
                            </p>

                            <p className="text-sm text-gray-600 mt-0.5 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                              {emp.Designation}
                            </p>

                            <p className="text-sm text-gray-500 mt-1 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                              {emp["Company Email"] || emp["Personal Email"]}
                            </p>
                          </div>
                        </div>

                        <hr className="my-3 border-gray-200" />

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          {employeeInfo.data
                            .filter((item: MessageDataItem) => {
                              const headerFields = [
                                "Full Name",
                                "Designation",
                                "Company Email",
                                "Personal Email",
                                "Image",
                              ];
                              return !headerFields.includes(item.label);
                            })
                            .map((item: MessageDataItem, idx: number) => {
                              let displayValue = item.value || "—";

                              // Dynamic Date Formatting
                              if (
                                item.label.toLowerCase().includes("date") &&
                                item.value &&
                                !isNaN(Date.parse(item.value.toString()))
                              ) {
                                displayValue = formatToIndianDate(item.value.toString());
                              }

                              return (
                                <div key={idx} className="min-w-0">
                                  <p
                                    className="text-gray-500 truncate"
                                    title={item.label}
                                  >
                                    {item.label}
                                  </p>
                                  <p className="font-medium text-gray-900 break-words">
                                    {displayValue}
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    );
                  })()}

                {/* Fallback when no employeeId */}
                {!isLoading &&
                  !isError &&
                  !employeeInfo?.data &&
                  !employeeId && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Employee information not available
                    </p>
                  )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default WrapperHoverCard;
