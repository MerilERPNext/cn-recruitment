import { format } from "date-fns";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DOMPurify from "dompurify";
import Button from "../../shared/atoms/Button";
type ApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
};
const ApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const getActionStyles = (action: string): { bg: string; text: string } => {
    const parsedAction = action.toLowerCase().trim();
    let styles = {
      bg: "gray-100",
      text: "gray-600",
    };
    switch (parsedAction) {
      case "approve":
        styles = {
          bg: "green-100",
          text: "green-600",
        };
        break;
      case "reject":
        styles = {
          bg: "red-100",
          text: "red-600",
        };

        break;
      default:
        styles = {
          bg: "gray-200",
          text: "gray-600",
        };
        break;
    }
    return styles;
  };
  const formattedDate = data?.date
    ? format(new Date(data.date), "dd/MM/yyyy")
    : "--/--/----";
  const cleanDescription = DOMPurify.sanitize(data?.description || "");
  const gridTemplateColumns = "15% 30% 10% 10% 20%";

  const getStatus = (status: string) => {
    if (status === "Open") {
      return {
        label: "Open",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Closed") {
      return {
        label: "Closed",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Cancelled") {
      return {
        label: "Cancelled",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };
  const status = getStatus(data?.status);

  return (
    <>
      {isDesktop ? (
        <div
          className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {/* Checkbox */}
          <div className="flex items-center justify-start">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(data?.name)}
              disabled={
                isDisabled || data?.custom_doctype_actions_with_form?.length > 0
              }
            />
          </div>

          {/* Allocated To */}
          {/* <div className="truncate text-gray-900 font-medium text-sm text-start">
            {data?.allocated_to}
          </div> */}

          {/* Description */}
          <div className="text-gray-600 text-sm truncate text-start">
            <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
          </div>
          {/* Date */}
          <div className="text-gray-700 text-sm text-start">
            {formattedDate}
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
              actions.map((action: string) => (
                <Button
                  key={action}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction(action, data);
                  }}
                  bgColor={getActionStyles(action).bg}
                  textColor={getActionStyles(action).text}
                  disabled={
                    loadingAction?.id === data?.name &&
                    loadingAction?.action === action
                  }
                >
                  {loadingAction?.id === data?.name &&
                  loadingAction?.action === action ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    action
                  )}
                </Button>
              ))}
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
            <input
              type="checkbox"
              className={"mt-1 accent-blue-500"}
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(data?.name)}
              disabled={
                isDisabled || data?.custom_doctype_actions_with_form?.length > 0
              }
            />
            <div className="w-full">
              <div className="flex items-start justify-between">
                <div>
                  {/* <h3 className="font-semibold text-sm text-gray-800">
                    {data?.allocated_to}
                  </h3> */}
                  <p className="text-sm text-gray-500">
                    {format(new Date(data?.date), "dd/MM/yyyy")}
                  </p>
                </div>
                <Badge
                  size="sm"
                  label={data?.status}
                  backgroundColor={"bg-yellow-100 text-yellow-600"}
                />
              </div>

              <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                <span className="font-semibold">Description:</span>{" "}
                <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length > 0
                  ? actions?.map((action: string) => (
                      <Button
                        key={action}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAction(action, data);
                        }}
                        bgColor={getActionStyles(action).bg}
                        textColor={getActionStyles(action).text}
                        disabled={
                          loadingAction?.id === data?.name &&
                          loadingAction?.action === action
                        }
                      >
                        {loadingAction?.id === data?.name &&
                        loadingAction?.action === action ? (
                          <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          action
                        )}
                      </Button>
                    ))
                  : ""}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalCard;
