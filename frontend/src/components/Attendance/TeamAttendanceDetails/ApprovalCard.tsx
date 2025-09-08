import { format } from "date-fns";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";

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

  const getActionStyles = (action: string) => {
    const parsedAction = action.toLowerCase().trim();
    let styles = "";
    switch (parsedAction) {
      case "approve":
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed";
        break;
      case "reject":
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed";

        break;
      default:
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";
        break;
    }
    return styles;
  };
  const formattedDate = data?.date
    ? format(new Date(data.date), "dd/MM/yyyy")
    : "--/--/----";

  return (
    <>
      {isDesktop ? (
        <div
          className="grid grid-cols-6 items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer "
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
              disabled={isDisabled}
            />
          </div>

          {/* Allocated To */}
          <div className="truncate text-gray-900 font-medium text-sm text-start">
            {data?.allocated_to}
          </div>

          {/* Description */}
          <div className="text-gray-600 text-sm truncate text-start">
            {data?.description}
          </div>
          {/* Date */}
          <div className="text-gray-700 text-sm text-start">
            {formattedDate}
          </div>

          {/* Status + Actions */}
          <div className="flex items-center justify-start">
            <Badge
              label={data?.status}
              backgroundColor={"bg-yellow-100 text-yellow-600"}
            />
          </div>
          <div className="flex w-full justify-start gap-2">
            {actions?.length &&
              actions.map((action: string) => (
                <button
                  key={action}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction(action, data);
                  }}
                  disabled={
                    loadingAction?.id === data?.name &&
                    loadingAction?.action === action
                  }
                  className={`${getActionStyles(action)} text-xs`}
                >
                  {loadingAction?.id === data?.name &&
                  loadingAction?.action === action ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    action
                  )}
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border border-gray-200 bg-white shadow-sm rounded-xl transition-shadow"
          onClick={() => {
            if (onClick) {
              onClick(data);
            }
          }}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            <input
              type="checkbox"
              className="mt-1 accent-blue-500"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(data?.name)}
              disabled={isDisabled}
            />

            <div className="w-full">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-gray-800">
                    {data?.allocated_to}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(data?.date), "dd/MM/yyyy")}
                  </p>
                </div>
                <Badge
                  label={data?.status}
                  backgroundColor={"bg-yellow-100 text-yellow-600"}
                />
              </div>

              <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                <span className="font-semibold">Description:</span>{" "}
                <div
                  dangerouslySetInnerHTML={{ __html: data?.description }}
                ></div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length &&
                  actions?.map((action: string) => (
                    <button
                      key={action}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction(action, data);
                      }}
                      disabled={
                        loadingAction?.id === data?.name &&
                        loadingAction?.action === action
                      }
                      className={getActionStyles(action)}
                    >
                      {loadingAction?.id === data?.name &&
                      loadingAction?.action === action ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        action
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalCard;
