import { ReactNode, useRef, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "./atoms/Typography";
import {
  CardTableSortContext,
  ColumnSortConfig,
  SortDirection,
} from "./CardTableContext";

export type { ColumnSortConfig, SortDirection } from "./CardTableContext";

const SortIcon = ({ direction }: { direction: SortDirection }) => {
  if (direction === "asc")
    return <ArrowUp size={13} className="text-blue-600 flex-shrink-0" />;
  if (direction === "desc")
    return <ArrowDown size={13} className="text-blue-600 flex-shrink-0" />;
  return <ArrowUpDown size={13} className="text-gray-400 flex-shrink-0" />;
};

const CardTable = ({
  titles,
  columnWidths,
  children,
  columnSortConfig = [],
  onSortChange,
}: {
  titles: ReactNode[];
  columnWidths?: string[];
  children: ReactNode;
  columnSortConfig?: ColumnSortConfig[];
  /** Optional callback — use when you need the parent to react to sort changes (e.g. server-side sort). */
  onSortChange?: (field: string, direction: SortDirection) => void;
}) => {
  const { isDesktop } = useScreenSize();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [scrollContainerWidth, setScrollContainerWidth] = useState<number>(0);
  const [searchBarOffset, setSearchBarOffset] = useState<number>(0);
  const [sortState, setSortState] = useState<{
    field: string;
    direction: SortDirection;
  } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateWidth = () => setScrollContainerWidth(el.offsetWidth);
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const updateWidth = () => setSearchBarOffset(el.clientHeight);
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSort = (field: string) => {
    setSortState((prev) => {
      let newDirection: SortDirection;
      if (prev?.field === field) {
        if (prev.direction === "asc") newDirection = "desc";
        else if (prev.direction === "desc") newDirection = null;
        else newDirection = "asc";
      } else {
        newDirection = "asc";
      }
      const next = newDirection ? { field, direction: newDirection } : null;
      onSortChange?.(field, newDirection);
      return next;
    });
  };

  const gridTemplateColumns = columnWidths?.length
    ? columnWidths.join(" ")
    : `repeat(${titles.length}, 1fr)`;

  return (
    <CardTableSortContext.Provider value={{ sortState, columnSortConfig }}>
      <div className="bg-white rounded-lg shadow-sm md:border border-gray-100 flex flex-col max-h-full">
        <div
          ref={scrollRef}
          className={
            isDesktop
              ? "overflow-x-auto rounded-lg bg-white shadow-sm flex flex-col h-full"
              : "flex flex-col h-full"
          }
          style={
            scrollContainerWidth
              ? ({
                  "--card-table-visible-width": `${scrollContainerWidth}px`,
                  "--search-bar-offset": `${searchBarOffset}px`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <div className={`${isDesktop ? "min-w-max" : ""} flex flex-col h-full`}>
            {isDesktop && (
              <div
                className="grid gap-4 px-6 py-4 bg-gray-50 border-b flex-shrink-0 sticky top-0 z-10"
                style={{ gridTemplateColumns }}
                ref={stickyRef}
              >
                {titles.map((title, index) => {
                  const colConfig = columnSortConfig[index];
                  const isSortable = colConfig?.sortable === true;
                  const field = isSortable
                    ? (colConfig as { sortable: true; field: string }).field
                    : null;
                  const activeDirection =
                    field && sortState?.field === field
                      ? sortState.direction
                      : null;

                  return isSortable && field ? (
                    <button
                      key={index}
                      onClick={() => handleSort(field)}
                      className="flex items-center justify-center gap-1 focus:outline-none"
                    >
                      <Typography
                        variant="bodySmall"
                        className="font-bold text-center whitespace-nowrap"
                      >
                        {title}
                      </Typography>
                      <SortIcon direction={activeDirection} />
                    </button>
                  ) : (
                    <Typography
                      key={index}
                      variant="bodySmall"
                      className="font-bold text-center whitespace-nowrap"
                    >
                      {title}
                    </Typography>
                  );
                })}
              </div>
            )}

            <div className="flex-1">{children}</div>
          </div>
        </div>
      </div>
    </CardTableSortContext.Provider>
  );
};

export default CardTable;
