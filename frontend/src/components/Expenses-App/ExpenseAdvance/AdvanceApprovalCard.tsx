import { format, isValid, parse } from "date-fns";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { getActionStyles } from "../../../utils/actionButtonStyles";

type ApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  showCheckbox?: boolean;
};

const AdvanceApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  showCheckbox = true,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const actions = (() => {
    try {
      return data?.custom_doctype_actions
        ? JSON.parse(data.custom_doctype_actions)
        : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions:", e);
      return [];
    }
  })();
  const actionsWithForm = (() => {
    try {
      const str = data?.custom_doctype_actions_with_form?.replace(/'/g, '"');
      return str ? JSON.parse(str) : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions_with_form:", e);
      return [];
    }
  })();

  const formatDate = (date: string): string => {
    if (!date) return "--/--/----";

    const possibleFormats = ["dd-MM-yyyy", "yyyy-MM-dd"];

    for (const dateFormat of possibleFormats) {
      const parsedDate = parse(date, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
    }

    return "--/--/----";
  };

  const gridTemplateColumns = showCheckbox
    ? "0.5fr 1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr"
    : "1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr";

  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open" || status === "Draft") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };

  const status = getStatus(data?.status);
  const totalClaimedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(data?.reference_document?.advance_amount ?? 0);

  return (
    <>
      {isDesktop ? (
        <div
          className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-primary/10 transition-colors cursor-pointer"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {showCheckbox && (
            <div className="flex items-center justify-start">
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect?.(data?.todo_id)}
                disabled={
                  isDisabled ||
                  actionsWithForm?.includes("Approve") ||
                  actionsWithForm?.includes("Reject")
                }
              />
            </div>
          )}
          <WrapperHoverCard employeeId={data?.reference_document?.employee}>
            <div className="truncate text-gray-900 font-medium text-sm text-start">
              {data?.reference_document?.employee_name}
            </div>
          </WrapperHoverCard>

          <div className="text-gray-700 truncate text-sm text-start">
            {data?.reference_document?.department}
          </div>
          <div className="text-gray-700 text-sm text-start">
            {totalClaimedAmount}
          </div>

          <div className="text-gray-700 text-sm text-start">
            {formatDate(data?.due_date)}
          </div>

          {/* Status + Actions */}
          <div className="flex items-center justify-start">
            <Badge
              size="sm"
              label={status?.label as string}
              backgroundColor={status?.statusColor}
            />
          </div>
          <div className="flex w-full justify-start gap-2">
            {actions?.length &&
              data?.status !== "Approved" &&
              data?.status !== "Rejected" &&
              actions.map((action: string) => {
                const actionStyle = getActionStyles(action);

                return (
                  <Button
                    key={action}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAction(action, data);
                    }}
                    bgColor={actionStyle.bgColor}
                    variant={actionStyle.variant}
                    disabled={
                      loadingAction?.id === data?.todo_id &&
                      loadingAction?.action === action
                    }
                  >
                    {loadingAction?.id === data?.todo_id &&
                    loadingAction?.action === action ? (
                      <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      action
                    )}
                  </Button>
                );
              })}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-1 border-gray-200 bg-white rounded-xl"
          onClick={() => {
            if (onClick) {
              onClick(data);
            }
          }}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            {showCheckbox && (
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect?.(data?.todo_id)}
                disabled={
                  isDisabled ||
                  actionsWithForm?.includes("Approve") ||
                  actionsWithForm?.includes("Reject")
                }
              />
            )}

            <div className="w-full">
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <p className="text-md font-bold">
                    {data?.reference_document?.employee_name}
                  </p>
                </div>

                <Badge
                  size="sm"
                  label={data?.status === "Draft" ? "Pending" : data?.status}
                  backgroundColor={status?.statusColor}
                />
              </div>
              <div className="flex flex-col items-start justify-between bg-gray-100 mt-1 rounded-md p-1">
                <div className="flex justify-between items-center w-full">
                  <p className="w-1/2 truncate font-semibold text-gray-600">
                    Category
                  </p>
                  <p className="w-1/2 truncate text-end">
                    {data?.reference_document?.custom_expense_category}
                  </p>
                </div>
                <div className="flex justify-between items-center w-full">
                  <p className="w-1/2 truncate font-semibold text-gray-600">
                    Advance Amount
                  </p>
                  <p className="w-1/2 truncate text-end">
                    {totalClaimedAmount}
                  </p>
                </div>
                <div className="flex justify-between items-center w-full">
                  <p className="w-1/2 truncate font-semibold text-gray-600">
                    Due Date
                  </p>
                  <p className="w-1/2 truncate text-end">
                    {formatDate(data?.due_date)}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length > 0 &&
                  data?.status !== "Approved" &&
                  data?.status !== "Rejected" &&
                  actions.map((action: string) => {
                    const actionStyle = getActionStyles(action);

                    return (
                      <Button
                        key={action}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAction(action, data);
                        }}
                        fullWidth
                        bgColor={actionStyle.bgColor}
                        variant={actionStyle.variant}
                        disabled={
                          loadingAction?.id === data?.todo_id &&
                          loadingAction?.action === action
                        }
                      >
                        {loadingAction?.id === data?.todo_id &&
                        loadingAction?.action === action ? (
                          <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          action
                        )}
                      </Button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvanceApprovalCard;
