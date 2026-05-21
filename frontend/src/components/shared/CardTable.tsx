import { ReactNode, useRef, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "./atoms/Typography";
import {
  CardTableSortContext,
  ColumnSortConfig,
  SortDirection,
} from "./CardTableContext";
import { useBulkSelectContext } from "./BulkSelectContext";

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
  noBorder = false,
  noShadow = false,
  noRound = false,
}: {
  titles: ReactNode[];
  columnWidths?: string[];
  children: ReactNode;
  columnSortConfig?: ColumnSortConfig[];
  /** Optional callback — use when you need the parent to react to sort changes (e.g. server-side sort). */
  onSortChange?: (field: string, direction: SortDirection) => void;
  noBorder?: boolean;
  noShadow?: boolean;
  noRound?: boolean;
}) => {
  const { isDesktop } = useScreenSize();
  const bulkSelect = useBulkSelectContext();
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

  const borderClass = noBorder ? "" : "md:border border-gray-100";
  const shadowClass = noShadow ? "" : "shadow-sm";
  const roundClass = noRound ? "" : "rounded-lg";

  return (
    <CardTableSortContext.Provider value={{ sortState, columnSortConfig }}>
      <div className={`bg-white flex flex-col max-h-full ${roundClass} ${shadowClass} ${borderClass}`}>
        <div
          ref={scrollRef}
          className={
            isDesktop
              ? `overflow-x-auto bg-white flex flex-col h-full ${roundClass} ${shadowClass}`
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
                  // When BulkSelectContext is active, replace the first column header
                  // with the select-all checkbox instead of the "Select" label.
                  if (index === 0 && bulkSelect?.state?.isEnabled) {
                    const { state, callbacksRef } = bulkSelect;
                    const allSelected =
                      state.allRequests.length > 0 &&
                      state.selectedIds.length === state.allRequests.length;
                    return (
                      <div key={index} className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => callbacksRef.current?.onSelectAll()}
                          className="cursor-pointer w-4 h-4"
                        />
                      </div>
                    );
                  }

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
                      {typeof title === "string" || typeof title === "number" ? (
                        <Typography
                          variant="bodySmall"
                          className="font-bold text-center whitespace-nowrap"
                        >
                          {title}
                        </Typography>
                      ) : (
                        title
                      )}
                      <SortIcon direction={activeDirection} />
                    </button>
                  ) : typeof title === "string" || typeof title === "number" ? (
                    <Typography
                      key={index}
                      variant="bodySmall"
                      className="font-bold text-center whitespace-nowrap"
                    >
                      {title}
                    </Typography>
                  ) : (
                    <div key={index} className="flex justify-center items-center w-full">
                      {title}
                    </div>
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
