import { ChevronLeft, ChevronRight, ClipboardList, HelpCircle } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTodoCategories, useTodoList } from "../../hooks/useTodo";
import { useOptionalTargetEmployeeId } from "../../context/ViewedUserContext";
import type { ToDo } from "../../services/todoService";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ViewAll } from "../shared/atoms/ViewAll";
import CustomDropdown from "../shared/CustomDropdown";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";

// Colours cycle by category position; task icons take the active category's colour.
const CATEGORY_COLORS = [
  { chip: "bg-blue-100 text-blue-700 ring-blue-300", icon: "bg-blue-50 text-blue-600" },
  { chip: "bg-purple-100 text-purple-700 ring-purple-300", icon: "bg-purple-50 text-purple-600" },
  { chip: "bg-green-100 text-green-700 ring-green-300", icon: "bg-green-50 text-green-600" },
  { chip: "bg-pink-100 text-pink-700 ring-pink-300", icon: "bg-pink-50 text-pink-600" },
  { chip: "bg-yellow-100 text-yellow-700 ring-yellow-300", icon: "bg-yellow-50 text-yellow-600" },
  { chip: "bg-orange-100 text-orange-700 ring-orange-300", icon: "bg-orange-50 text-orange-600" },
  { chip: "bg-cyan-100 text-cyan-700 ring-cyan-300", icon: "bg-cyan-50 text-cyan-600" },
  { chip: "bg-red-100 text-red-700 ring-red-300", icon: "bg-red-50 text-red-500" },
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

const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const badge = TICKET_STATUS_BADGES[status] ?? { label: status, ...GRAY_BADGE };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${badge.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClassName}`} />
      {badge.label}
    </span>
  );
};

const MyToDoItem: React.FC<{ item: ToDo; iconClassName: string }> = ({ item, iconClassName }) => {
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
      navigate(appendTargetUser(item.custom_dynamic_route));
    } else {
      const queryParam = targetEmployeeId ? `?target_user=${targetEmployeeId}` : "";
      navigate(`/webapp/todo-app${queryParam}#/${item.name}`);
    }
  };

  const cleanDescription = sanitizeToPlainText(item.description);
  const isTicket = item.reference_type === "HD Ticket";
  const Icon = isTicket ? HelpCircle : ClipboardList;
  const dueDate = item.custom_due_datetime || item.date;

  return (
    <div
      key={item.name}
      className="flex cursor-pointer items-center justify-between gap-3 py-3 border border-transparent hover-lift transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl flex items-center justify-center ${iconClassName}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <Typography
            variant="bodySmall"
            className="font-medium block line-clamp-1"
          >
            {cleanDescription || "Task"}
          </Typography>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
            {isTicket && item.reference_status && (
              <TicketStatusBadge status={item.reference_status} />
            )}
          </div>
        </div>
      </div>
      <button
        onClick={handleClick}
        className="text-primary-600 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
      >
        View task
      </button>
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
  const targetEmployeeId = useOptionalTargetEmployeeId();

  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipsOverflow, setChipsOverflow] = useState(false);

  const handleTodoClick = () => {
    const queryParam = targetEmployeeId ? `?target_user=${targetEmployeeId}` : "";
    navigate(`/webapp/todo-app${queryParam}`);
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
    data: todos = [],
    isLoading: isTodosLoading,
  } = useTodoList(
    activeCategory
      ? { category_filter: activeCategory }
      : {}
  );

  // Show only top 3 items
  const displayedTodos = useMemo(() => todos.slice(0, 5), [todos]);

  const filterOptions = useMemo(() => {
    return categories.map((cat) => ({
      label: `${cat.name} (${cat.count})`,
      value: cat.name,
    }));
  }, [categories]);

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
    <Card shadow="sm" className="h-fit md:h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="subheading" color="title">
          Tasks Awaiting You
        </Typography>
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
        <div className="flex items-center gap-1 mb-2">
          {chipsOverflow && (
            <button
              type="button"
              aria-label="Scroll categories left"
              onClick={() => scrollChips(-1)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div ref={chipsRef} className="flex gap-3 p-2 min-w-0 flex-1 overflow-x-auto">
            {categories.map((cat, idx) => {
              const isActive = activeCategory === cat.name;
              const colors = getCategoryColors(idx).chip;

              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-2xl text-sm whitespace-nowrap font-semibold shadow transition-all ${isActive
                    ? `scale-105 ring-2 ${colors}`
                    : `${colors} opacity-70 hover:opacity-100`
                    } `}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>
          {chipsOverflow && (
            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => scrollChips(1)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Show only top 3 items for the active category */}
      <div className="flex-1 flex flex-col divide-y divide-gray-100">
        {isLoading || isTodosLoading ? (
          <CardSkeleton rows={2} />
        ) : displayedTodos.length > 0 ? (
          displayedTodos.map((item: ToDo) => (
            <MyToDoItem key={item.name} item={item} iconClassName={activeIconClassName} />
          ))
        ) : (
          <NoDataFound
            title="You're all caught up 🎉"
            subtitle="No pending tasks right now."
          />
        )}
      </div>
    </Card>
  );
};

export default TasksAwaiting;
