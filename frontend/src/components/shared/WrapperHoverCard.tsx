import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useGetEmployeeHoverData } from "../../hooks/useEmployee";
import { createPortal } from "react-dom";

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

const mapEmployeeData = (data: any[]) => {
  const map: Record<string, any> = {};
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
  const [error, setError] = useState<any>(null);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);

  const hasFetchedRef = useRef(false);

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
    } catch (err: any) {
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
  const hideTimer = useRef<any>(null);
  const animationTimer = useRef<number | null>(null);

  const handleEnter = () => {
    clearTimeout(hideTimer.current);
    clearTimeout(animationTimer?.current ?? undefined);
    setShow(true);
    // Start animation after render
    animationTimer.current = setTimeout(() => setIsAnimating(true), 10);
  };

  const handleLeave = () => {
    // Start exit animation
    setIsAnimating(false);
    // Hide card after animation completes (faster exit)
    hideTimer.current = setTimeout(() => setShow(false), 150);
  };

  const updatePosition = () => {
    if (!targetRef.current || !cardRef.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom-right":
        top = rect.bottom + window.scrollY + 8;
        left = rect.left + window.scrollX;
        break;

      case "bottom-left":
        top = rect.bottom + window.scrollY + 8;
        left = rect.right + window.scrollX - cardRect.width;
        break;

      case "top-right":
        top = rect.top + window.scrollY - cardRect.height - 8;
        left = rect.left + window.scrollX;
        break;

      case "top-left":
        top = rect.top + window.scrollY - cardRect.height - 8;
        left = rect.right + window.scrollX - cardRect.width;
        break;

      case "center-left":
        top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
        left = rect.left + window.scrollX - cardRect.width - 12;
        break;

      case "center-right":
      default:
        top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
        left = rect.right + window.scrollX + 12;
    }

    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (show) updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show, placement]);

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
        onMouseEnter={() => {
          handleEnter();
          handleFetchProfile();
        }}
        onMouseLeave={handleLeave}
      >
        {children}
      </div>

      {show &&
        createPortal(
          <div
            ref={cardRef}
            className="absolute z-[999]"
            style={{
              top: pos.top,
              left: pos.left,
              opacity: isAnimating ? 1 : 0,
              transform: isAnimating
                ? "scale(1) translateY(0)"
                : "scale(0.98) translateY(0)",
              transition: isAnimating
                ? "opacity 200ms ease-out, transform 200ms ease-out"
                : "opacity 150ms ease-in, transform 150ms ease-in",
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <div
              className={`w-[320px] p-5 rounded-xl bg-white border border-[#E6F0FF] shadow-lg ${cardClassName}`}
            >
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
                    {error?.message || "Please try again"}
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
                        {emp.Image ? (
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
                                emp["Full Name"] || "U",
                              ),
                            }}
                          >
                            {emp["Full Name"]?.charAt(0)?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 group">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                            {emp["Full Name"]}
                          </p>

                          <p className="text-sm text-gray-600 mt-0.5 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                            @{emp.Designation}
                          </p>

                          <p className="text-sm text-gray-500 mt-1 truncate group-hover:whitespace-normal group-hover:overflow-visible">
                            {emp["Company Email"] || emp["Personal Email"]}
                          </p>
                        </div>
                      </div>

                      <hr className="my-3 border-gray-200" />

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div>
                          <p className="text-gray-500">Department</p>
                          <p className="font-medium text-gray-900">
                            {emp.Department || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Employee ID</p>
                          <p className="font-medium text-gray-900">
                            {emp["ID (name)"]}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Date of Joining</p>
                          <p className="font-medium text-gray-900">
                            {emp["Date of Joining"]
                              ? new Date(
                                  emp["Date of Joining"],
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Company</p>
                          <p className="font-medium text-gray-900">
                            {emp.Company || "—"}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}

              {/* Fallback when no employeeId */}
              {!isLoading && !isError && !employeeInfo?.data && !employeeId && (
                <p className="text-sm text-gray-500 text-center py-2">
                  Employee information not available
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default WrapperHoverCard;
