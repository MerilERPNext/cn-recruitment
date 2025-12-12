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

// Pastel Color Generator
const stringToPastelColor = (str: string) => {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = Math.abs(hash % 360);
    const s = 65;
    const l = 58;

    return `hsl(${h}, ${s}%, ${l}%)`;
};

// Avatar Renderer
const getAvatar = (data: any[]) => {
    const imageItem = data.find((item) => item.label === "Image");
    const fullName = data.find((item) => item.label === "Full Name")?.value || "";
    const employeeId = data.find((item) => item.label === "ID (name)")?.value || "";
    const fallbackChar = fullName?.charAt(0)?.toUpperCase() ?? "?";

    const color = stringToPastelColor(fullName || "default");

    const AvatarWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-col justify-center items-center">
            {children}
            <div className="mt-2 flex flex-col justify-center">
                <p className="font-semibold text-center">{fullName}</p>
                <p className="text-[12px] text-center opacity-80">{employeeId}</p>
            </div>
        </div>
    );

    if (imageItem?.value) {
        return (
            <AvatarWrapper>
                <img
                    src={imageItem.value}
                    alt="avatar"
                    className="w-14 h-14 shrink-0 rounded-full object-cover"
                />
            </AvatarWrapper>
        );
    }

    return (
        <AvatarWrapper>
            <div
                className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ background: color }}
            >
                {fallbackChar}
            </div>
        </AvatarWrapper>
    );
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
    const [EmployeeInfo, setEmployeeInfo] = useState<any>(null);

    const hasFetchedRef = useRef(false);

    // Fetch only once per open
    const handleFetchProfile = async () => {
        if (hasFetchedRef.current || !employeeId) return;

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

    setPos({ top, left });
  };

    const handleEnter = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setShow(true);
    };

    const handleLeave = () => {
        hideTimer.current = setTimeout(() => {
            setShow(false);
        }, 120);
    };

    // Calculate portal position
    const updatePosition = () => {
        const el = targetRef.current;
        const card = cardRef.current;
        if (!el || !card) return;

        const rect = el.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (placement) {
            case "bottom-left":
                top = rect.bottom + window.scrollY + 8;
                left = rect.right + window.scrollX - cardRect.width;
                break;
            case "bottom-right":
                top = rect.bottom + window.scrollY + 8;
                left = rect.left + window.scrollX;
                break;
            case "top-left":
                top = rect.top + window.scrollY - cardRect.height - 8;
                left = rect.right + window.scrollX - cardRect.width;
                break;
            case "top-right":
                top = rect.top + window.scrollY - cardRect.height - 8;
                left = rect.left + window.scrollX;
                break;
            case "center-right":
                top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
                left = rect.right + window.scrollX + 12;
                break;
            case "center-left":
                top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
                left = rect.left + window.scrollX - cardRect.width - 12;
                break;
        }

        setPos({ top, left });
    };
  }, [placement, show]);

    useLayoutEffect(() => {
        if (show) updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [show, placement]);

    return (
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ backgroundColor: color }}
      >
        {fallbackChar}
      </div>
    );
  };

  return (
    <>
      {/* TRIGGER */}
      <div
        ref={targetRef}
        className={`inline-block ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </div>

      {/* HOVER CARD */}
      {show &&
        createPortal(
          <div
            ref={cardRef}
            className="absolute z-[9999]"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <div
                ref={targetRef}
                className={`inline-block ${className}`}
                onMouseEnter={() => {
                    handleEnter();
                    handleFetchProfile();
                }}
                onMouseLeave={handleLeave}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-2 px-4">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
                  <span className="text-sm font-medium text-gray-700 animate-pulse whitespace-nowrap">
                    Loading employee info…
                  </span>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4 px-4 text-red-600">
                  <p className="text-sm font-semibold">Failed to load employee info.</p>
                  <p className="text-xs">{error?.message ?? "Unknown error"}</p>
                </div>
              ) : (
                <>
                  {/* Avatar on top */}
                  {getAvatar(EmployeeInfo?.data ?? [])}

                  {/* Employee Info below */}
                  <div className="w-full px-4">
                    {(EmployeeInfo?.data ?? [])
                      .filter((item) => item.label !== "Image")
                      .map((item: any) => (
                        <div
                            className={`w-full max-h-[400px] overflow-y-auto pt-6 md:max-w-sm lg:max-w-md rounded-xl 
                                backdrop-blur-md bg-white border border-gray-300 shadow-xl flex flex-col items-center gap-4 ${cardClassName}`}
                        >
                            {isLoading ? (
                                <div className="flex flex-col items-center pb-6 justify-center gap-2 py-2 px-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
                                    <span className="text-sm font-medium text-gray-700 animate-pulse whitespace-nowrap">
                                        Loading employee info…
                                    </span>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center gap-2 mb-4 py-4 px-4 text-red-600">
                                    <p className="text-sm font-semibold">Failed to load employee info.</p>
                                    <p className="text-xs">{error?.message ?? "Unknown error"}</p>
                                </div>
                            ) : EmployeeInfo?.data ? (
                                <>
                                    {getAvatar(EmployeeInfo.data)}

                                    <table className="w-full px-4 border-none">
                                        {EmployeeInfo.data
                                            .filter((item: any) => !["Full Name", "ID (name)", "Image"].includes(item.label))
                                            .map((item: any) => (
                                                <tr key={item.label} className="py-2 border-b border-gray-200 text-sm">
                                                    <td className="text-xs text-gray-500">{item.label}</td>
                                                    <td className="text-xs text-right">{item.value ?? "—"}</td>
                                                </tr>
                                            ))}
                                    </table>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 py-4">No data available.</p>
                            )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default WrapperHoverCard;
