import { format } from "date-fns";
import Badge from "./Badge";

type ActionCardProps = {
  todoId: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  isActionedCard?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
};
const TestApprovalListCard = ({
  isSelected = false,
  isActionedCard = true,
  isDisabled = false,
  onToggleSelect,

  data,
  onAction,
}: ActionCardProps) => {
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  return (
    <div className="cursor-pointer border border-gray-200 bg-white shadow-sm rounded-xl transition-shadow">
      <div className="p-4 flex items-start gap-3 w-full">
        {isActionedCard && (
          <input
            type="checkbox"
            className="mt-1 accent-blue-500"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(data?.custom_funnel_task)}
            disabled={isDisabled}
          />
        )}

        <div className="w-full">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-gray-800">
                {data?.name}
              </h3>
              <h3 className="font-semibold text-sm text-gray-800">
                {data?.allocated_to}
              </h3>
              <p className="text-sm text-gray-500">
                {format(new Date(data?.creation), "dd/MM/yyyy")}
              </p>
            </div>
            <Badge
              label={data?.status}
              backgroundColor="bg-gray-200 text-gray-500"
            />
          </div>
          <div className="flex gap-2 mt-2">
            {actions?.length &&
              actions?.map((action: string) => (
                <button
                  key={action}
                  onClick={() => {
                    onAction(action, data);
                  }}
                  className="bg-blue-100 text-blue-600 rounded-md text-sm px-2 py-1"
                >
                  {action}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestApprovalListCard;
