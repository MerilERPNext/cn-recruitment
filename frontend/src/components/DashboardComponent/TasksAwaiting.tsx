import { ChevronLeft, ChevronRight, ClipboardList, HelpCircle } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTodoCategories, useTodoList } from "../../hooks/useTodo";
import { useOptionalTargetEmployeeId } from "../../context/ViewedUserContext";
import type { ListViewField, ToDo } from "../../services/todoService";
import { formatCurrency } from "../../utils/currency";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ViewAll } from "../shared/atoms/ViewAll";
import CustomDropdown from "../shared/CustomDropdown";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";

// Colours cycle by category position; the dot carries the category's identity on
// every chip, while chip/icon tints only apply to the active one.
const CATEGORY_COLORS = [
  { chip: "bg-blue-100 text-blue-700 ring-blue-300", icon: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  { chip: "bg-purple-100 text-purple-700 ring-purple-300", icon: "bg-purple-50 text-purple-600", dot: "bg-purple-500" },
  { chip: "bg-green-100 text-green-700 ring-green-300", icon: "bg-green-50 text-green-600", dot: "bg-green-500" },
  { chip: "bg-pink-100 text-pink-700 ring-pink-300", icon: "bg-pink-50 text-pink-600", dot: "bg-pink-500" },
  { chip: "bg-yellow-100 text-yellow-700 ring-yellow-300", icon: "bg-yellow-50 text-yellow-600", dot: "bg-yellow-500" },
  { chip: "bg-orange-100 text-orange-700 ring-orange-300", icon: "bg-orange-50 text-orange-600", dot: "bg-orange-500" },
  { chip: "bg-cyan-100 text-cyan-700 ring-cyan-300", icon: "bg-cyan-50 text-cyan-600", dot: "bg-cyan-500" },
  { chip: "bg-red-100 text-red-700 ring-red-300", icon: "bg-red-50 text-red-500", dot: "bg-red-500" },
];

const PINK_BADGE = { className: "bg-pink-50 text-pink-600", dotClassName: "bg-pink-500" };
const GRAY_BADGE = { className: "bg-gray-100 text-gray-600", dotClassName: "bg-gray-400" };

// HD Ticket statuses as the assigned agent sees them.
const TICKET_STATUS_BADGES: Record<string, { label: string; className: string; dotClassName: string }> = {
  Open: { label: "Open", ...PINK_BADGE },
  Reopened: { label: "Reopened", ...PINK_BADGE },
  "Not Assigned": { label: "Not assigned", ...PINK_BADGE },
  "Awaiting User Response": {
    label: "Awaiting user reply",
    className: "bg-blue-50 text-blue-600",
    dotClassName: "bg-blue-500",
  },
  "Requested Closure": {
    label: "Closure requested",
    className: "bg-amber-50 text-amber-600",
    dotClassName: "bg-amber-500",
  },
  Closed: { label: "Closed", ...GRAY_BADGE },
  Archived: { label: "Archived", ...GRAY_BADGE },
};

const EMPTY_TODOS: ToDo[] = [];
const EMPTY_FIELDS: ListViewField[] = [];

const DATE_FIELDTYPES = new Set(["Date", "Datetime"]);

// Prose columns either repeat the task description or blow out the one-line
// meta row, and layout fieldtypes carry no value at all, so neither makes it
// onto the card.
const SKIPPED_FIELDTYPES = new Set([
  "Text",
  "Small Text",
  "Long Text",
  "Text Editor",
  "Markdown Editor",
  "HTML Editor",
  "Code",
  "Section Break",
  "Column Break",
  "Tab Break",
  "HTML",
  "Button",
  "Image",
  "Attach",
  "Attach Image",
  "Signature",
]);

// The row already leads with a due date; a second timestamp beside it is noise.
const SKIPPED_FIELDNAMES = new Set(["creation", "modified"]);

// Link-path columns are configured with machine-joined labels
// ("From Employee - Employee"); only the trailing segment reads as a label.
const shortLabel = (label: string) => {
  const parts = String(label || "").split(" - ");
  return (parts[parts.length - 1] || label || "").trim();
};

// Amounts read better pinned to the row's trailing edge than buried in the meta
// line, so they are split out of the configured columns.
const isAmountField = (field: ListViewField) => field.fieldtype === "Currency";

const formatFieldValue = (field: ListViewField, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  if (isAmountField(field)) return formatCurrency(value as string | number);
  if (DATE_FIELDTYPES.has(field.fieldtype)) return formatToIndianDate(value as string);
  if (field.fieldtype === "Check") return Number(value) ? "Yes" : "No";
  const raw = String(value);
  return raw.includes("<") ? sanitizeToPlainText(raw) : raw;
};

// More than a couple of pairs and the meta line wraps into the next row.
const MAX_META_FIELDS = 2;

// Start/end dates are configured as two independent columns but read as a single
// fact, so a recognised pair is collapsed into one "start to end" chunk instead
// of burning both meta slots on half a date range each.
const RANGE_PAIRS: Array<[string, string]> = [
  ["from_date", "to_date"],
  ["work_from_date", "work_end_date"],
  ["start_date", "end_date"],
  ["date_from", "date_to"],
];

/** Names the partner column of `fieldname`, best match first. */
const rangePartnerNames = (fieldname: string): string[] => {
  const candidates: string[] = [];
  for (const [start, end] of RANGE_PAIRS) {
    if (fieldname === start) {
      candidates.push(end);
    } else if (fieldname.endsWith(`_${start}`)) {
      candidates.push(`${fieldname.slice(0, -start.length)}${end}`);
    }
  }
  return candidates;
};

// A day count belongs to the range it measures, not to a slot of its own. It has
// to come from the configured column: a half-day leave spans one calendar day but
// counts as 0.5, so deriving it from the dates would be wrong.
const DURATION_FIELDTYPES = new Set(["Float", "Int"]);
const DURATION_FIELDNAME = /(days|duration)$/i;

const isDurationField = (field: ListViewField) =>
  DURATION_FIELDTYPES.has(field.fieldtype) && DURATION_FIELDNAME.test(field.fieldname);

const formatDayCount = (raw: unknown): string => {
  const count = Number(raw);
  if (!Number.isFinite(count) || count <= 0) return "";
  return `${count} ${count === 1 ? "day" : "days"}`;
};

interface MetaChunk {
  key: string;
  label: string;
  value: string;
  isRange: boolean;
}

const buildMetaChunks = (
  fields: ListViewField[],
  data: Record<string, unknown>
): MetaChunk[] => {
  const byName = new Map(fields.map((field) => [field.fieldname, field]));
  const consumed = new Set<string>();
  const chunks: MetaChunk[] = [];

  for (const field of fields) {
    if (consumed.has(field.fieldname)) continue;

    const value = formatFieldValue(field, data[field.fieldname]);
    if (!value) continue;

    // Pair up only when both halves are dates that actually resolved.
    if (DATE_FIELDTYPES.has(field.fieldtype)) {
      const partner = rangePartnerNames(field.fieldname)
        .map((name) => byName.get(name))
        .find(
          (candidate): candidate is ListViewField =>
            !!candidate &&
            DATE_FIELDTYPES.has(candidate.fieldtype) &&
            !!formatFieldValue(candidate, data[candidate.fieldname])
        );

      if (partner) {
        consumed.add(partner.fieldname);
        const partnerValue = formatFieldValue(partner, data[partner.fieldname]);
        // Single-day requests set both ends to the same date; repeating it
        // reads as a mistake rather than a range.
        const span = partnerValue === value ? value : `${value} to ${partnerValue}`;

        const duration = fields.find(
          (candidate) => isDurationField(candidate) && formatDayCount(data[candidate.fieldname])
        );
        if (duration) consumed.add(duration.fieldname);
        const dayCount = duration ? formatDayCount(data[duration.fieldname]) : "";

        chunks.push({
          key: field.fieldname,
          label: shortLabel(field.label),
          value: dayCount ? `${span} (${dayCount})` : span,
          isRange: true,
        });
        continue;
      }
    }

    chunks.push({
      key: field.fieldname,
      label: shortLabel(field.label),
      value,
      isRange: false,
    });
  }

  return chunks;
};

const MetaSeparator: React.FC = () => (
  <span className="w-1 h-1 rounded-full bg-gray-200 flex-shrink-0" aria-hidden />
);

const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const badge = TICKET_STATUS_BADGES[status] ?? { label: status, ...GRAY_BADGE };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${badge.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-xl ${badge.dotClassName}`} />
      {badge.label}
    </span>
  );
};

// A date range is the defining fact of a leave or attendance approval, so it takes
// the meta line on its own rather than competing with columns that mostly repeat
// what the task title already says.
const capMetaChunks = (chunks: MetaChunk[]): MetaChunk[] => {
  const range = chunks.find((chunk) => chunk.isRange);
  if (range) return [range];

  return chunks.slice(0, MAX_META_FIELDS);
};

/** Values the task title already states are noise when repeated underneath it. */
const dropTitleEchoes = (chunks: MetaChunk[], title: string): MetaChunk[] => {
  const haystack = title.toLowerCase();
  return chunks.filter((chunk) => {
    const value = chunk.value.trim();
    // Short values (codes, single digits) collide by accident far too easily.
    if (chunk.isRange || value.length < 4) return true;
    return !haystack.includes(value.toLowerCase());
  });
};

const MyToDoItem: React.FC<{
  item: ToDo;
  iconClassName: string;
  listViewFields: ListViewField[];
}> = ({ item, iconClassName, listViewFields }) => {
  const navigate = useNavigate();
  const targetEmployeeId = useOptionalTargetEmployeeId();

  const handleClick = () => {
    const appendTargetUser = (baseRoute: string) => {
      if (!targetEmployeeId) return baseRoute;
      return baseRoute.includes("?")
        ? `${baseRoute}&target_user=${targetEmployeeId}`
        : `${baseRoute}?target_user=${targetEmployeeId}`;
    };

    // if startes with /helpdesk then open in new tab
    if (item.custom_dynamic_route?.startsWith("/helpdesk")) {
      window.open(appendTargetUser(item.custom_dynamic_route), "_blank");
    } else if (item.custom_dynamic_route) {
      navigate(item.custom_dynamic_route);
    } else {
      navigate(`/webapp/todo-app#/${item.name}`);
    }
  };

  const cleanDescription = sanitizeToPlainText(item.description);
  const isTicket = item.reference_type === "HD Ticket";
  const Icon = isTicket ? HelpCircle : ClipboardList;
  const dueDate = item.custom_due_datetime || item.date;

  // What a row shows past the due date is whatever the Todo Type configured:
  // an expense task surfaces its amount and employee id, a leave task its dates.
  const { amount, metaFields } = useMemo(() => {
    const data = (item.reference_data ?? {}) as Record<string, unknown>;
    const amountField = listViewFields.find(isAmountField);

    return {
      amount: amountField ? formatFieldValue(amountField, data[amountField.fieldname]) : "",
      metaFields: capMetaChunks(
        dropTitleEchoes(
          buildMetaChunks(
            listViewFields.filter(
              (field) =>
                !isAmountField(field) &&
                !SKIPPED_FIELDTYPES.has(field.fieldtype) &&
                !SKIPPED_FIELDNAMES.has(field.fieldname)
            ),
            data
          ),
          cleanDescription
        )
      ),
    };
  }, [item.reference_data, listViewFields, cleanDescription]);

  return (
    <div
      key={item.name}
      onClick={handleClick}
      className="flex cursor-pointer items-center justify-between gap-3.5 p-3 rounded-xl border border-gray-100 bg-white hover:border-primary-200 hover:bg-slate-50/50 hover:shadow-xs transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${iconClassName}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <Typography
            variant="bodySmall"
            className="font-medium text-text-title block line-clamp-1 group-hover:text-primary-600 transition-colors"
          >
            {cleanDescription || "Task"}
          </Typography>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Typography variant="label" color="body2">
              {dueDate ? (
                <>
                  Due on{" "}
                  <span className="font-semibold text-text-title">
                    {formatToIndianDate(dueDate)}
                  </span>
                </>
              ) : (
                "No due date"
              )}
            </Typography>
            {metaFields.map((meta) => (
              <React.Fragment key={meta.key}>
                <MetaSeparator />
                <Typography variant="label" color="body2" className="line-clamp-1">
                  {meta.label ? `${meta.label} ` : ""}
                  <span className="font-semibold text-text-title">{meta.value}</span>
                </Typography>
              </React.Fragment>
            ))}
            {isTicket && item.reference_status && (
              <TicketStatusBadge status={item.reference_status} />
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {amount && (
          <Typography
            variant="bodySmall"
            className="font-semibold text-text-title whitespace-nowrap tabular-nums"
          >
            {amount}
          </Typography>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="text-primary-600 group-hover:text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 group-hover:bg-primary-100 hover:bg-primary-200 transition-colors whitespace-nowrap flex-shrink-0"
        >
          View task
        </button>
      </div>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } = useTodoCategories();

  const [activeCategory, setActiveCategory] = useState<string>("");

  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipsOverflow, setChipsOverflow] = useState(false);

  const handleTodoClick = () => {
    navigate("/webapp/todo-app");
  };

  const getCategoryColors = (index: number) =>
    CATEGORY_COLORS[Math.max(index, 0) % CATEGORY_COLORS.length];

  const scrollChips = (direction: 1 | -1) => {
    chipsRef.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
  };

  // Set default active category to the first available category
  React.useEffect(() => {
    if (
      categories.length > 0 &&
      (!activeCategory || !categories.some((c) => c.name === activeCategory))
    ) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  // Fetch todos for the selected category using category_filter
  const {
    data: todoResult,
    isLoading: isTodosLoading,
  } = useTodoList(
    activeCategory
      ? { category_filter: activeCategory }
      : {}
  );

  const todos = todoResult?.todos ?? EMPTY_TODOS;
  const listViewFields = todoResult?.listViewFields ?? EMPTY_FIELDS;

  // Show only top 5 items
  const displayedTodos = useMemo(() => todos.slice(0, 5), [todos]);

  const filterOptions = useMemo(() => {
    return categories.map((cat) => ({
      label: `${cat.name} (${cat.count})`,
      value: cat.name,
    }));
  }, [categories]);

  const totalPending = useMemo(
    () => categories.reduce((sum, cat) => sum + (cat.count || 0), 0),
    [categories]
  );

  const isLoading = isCategoriesLoading;

  // Scroll arrows are only useful when the category chips overflow the card.
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const update = () => setChipsOverflow(el.scrollWidth > el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [categories, isDesktop, isLoading]);

  const activeIconClassName = getCategoryColors(
    categories.findIndex((c) => c.name === activeCategory)
  ).icon;

  return (
    <Card shadow="sm" className="h-fit min-h-[500px] flex flex-col">
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <Typography variant="subheading" color="title">
            Tasks Awaiting You
          </Typography>
          {!isLoading && totalPending > 0 && (
            <Typography variant="label" color="body2" className="block mt-0.5">
              {totalPending} pending across {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}
            </Typography>
          )}
        </div>
        <ViewAll title="View to-do" onClick={handleTodoClick} />
      </div>

      {/* Mobile Filter Dropdown */}
      {!isDesktop && (
        <div className="block mb-4 w-full">
          <CustomDropdown
            value={activeCategory}
            options={filterOptions}
            onChange={(e) => setActiveCategory(e.target.value)}
            label="Select Category"
            variant="soft"
            contentAlign="start"
            position="bottom-right"
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
        </div>
      )}

      {isDesktop && !isLoading && categories.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {chipsOverflow && (
            <button
              type="button"
              aria-label="Scroll categories left"
              onClick={() => scrollChips(-1)}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div ref={chipsRef} className="flex gap-2 py-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            {categories.map((cat, idx) => {
              const isActive = activeCategory === cat.name;
              const colors = getCategoryColors(idx);

              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm whitespace-nowrap border transition-all ${isActive
                    ? `font-semibold border-transparent ring-1 shadow-xs ${colors.chip}`
                    : "font-medium border-gray-50 bg-white text-text-body1 hover:border-gray-100 hover:bg-gray-10/40"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                  {cat.name}
                  <span
                    className={`rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${isActive ? "bg-white/70" : "bg-gray-10/70 text-text-body2"
                      }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
          {chipsOverflow && (
            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => scrollChips(1)}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Show only top 5 items for the active category */}
      <div className="flex-1 flex flex-col gap-2.5">
        {isLoading || isTodosLoading ? (
          <CardSkeleton rows={2} />
        ) : displayedTodos.length > 0 ? (
          displayedTodos.map((item: ToDo) => (
            <MyToDoItem
              key={item.name}
              item={item}
              iconClassName={activeIconClassName}
              listViewFields={listViewFields}
            />
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center py-6">
            <NoDataFound
              title="You're all caught up 🎉"
              subtitle="No pending tasks right now."
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default TasksAwaiting;
