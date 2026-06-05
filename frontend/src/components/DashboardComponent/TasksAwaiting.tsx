import { ClipboardList } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTodoCategories, useTodoList } from "../../hooks/useTodo";
import type { ToDo } from "../../services/todoService";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ViewAll } from "../shared/atoms/ViewAll";
import CustomDropdown from "../shared/CustomDropdown";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";

const MyToDoItem: React.FC<{ item: ToDo; index?: number }> = ({ item }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.custom_dynamic_route) {
      navigate(item.custom_dynamic_route);
    } else {
      navigate(`/webapp/todo-app#/${item.name}`);
    }
  };

  const cleanDescription = sanitizeToPlainText(item.description);

  return (
    <div
      key={item.name}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent hover-lift transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="mr-2 min-w-0 flex-1">
          <Typography
            variant="bodySmall"
            className="font-medium block line-clamp-1"
          >
            {cleanDescription || "Task"}
          </Typography>

          <Typography variant="label" color="body2">
            {item.custom_due_datetime
              ? `Due on ${formatDateDDMonthYYYY(item.custom_due_datetime)}`
              : item.date
                ? `Due on ${formatDateDDMonthYYYY(item.date)}`
                : "No due date"}
          </Typography>
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

  const handleTodoClick = () => navigate("/webapp/todo-app");

  const generatePastelColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-700 ring-blue-300",
      "bg-purple-100 text-purple-700 ring-purple-300",
      "bg-green-100 text-green-700 ring-green-300",
      "bg-pink-100 text-pink-700 ring-pink-300",
      "bg-yellow-100 text-yellow-700 ring-yellow-300",
      "bg-orange-100 text-orange-700 ring-orange-300",
      "bg-cyan-100 text-cyan-700 ring-cyan-300",
      "bg-red-100 text-red-700 ring-red-300",
    ];
    return colors[index % colors.length];
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
  const displayedTodos = useMemo(() => todos.slice(0, 3), [todos]);

  const filterOptions = useMemo(() => {
    return categories.map((cat) => ({
      label: `${cat.name} (${cat.count})`,
      value: cat.name,
    }));
  }, [categories]);

  const isLoading = isCategoriesLoading;

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
        <div className="flex gap-3 mb-4 p-2 max-w-full overflow-x-auto">
          {categories.map((cat, idx) => {
            const isActive = activeCategory === cat.name;
            const colors = generatePastelColor(idx);

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
      )}

      {/* Show only top 5 items for the active category */}
      <div className="flex-1">
        {isLoading || isTodosLoading ? (
          <CardSkeleton rows={2} />
        ) : displayedTodos.length > 0 ? (
          displayedTodos.map((item: ToDo) => (
            <MyToDoItem key={item.name} item={item} />
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
