import React from "react";
import { useFrappeDocument } from "../../hooks/useFrappeQuery";
import EmploymentHistoryCard from "./EmploymentHistoryCard";
import Button from "../shared/atoms/Button";
import { EditIcon, PlusIcon } from "lucide-react";
import EmploymentHistoryForm from "./EmploymentHistorForm";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

interface EmploymentHistoryProps {
  employeeId: string | undefined;
}

export interface CustomWorkHistory {
  doctype_name: string;
  records: string;
  start_date: string | null;
  end_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Employee {
  name: string;
  date_of_joining?: string;
  custom_work_history?: CustomWorkHistory[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const EmploymentHistory: React.FC<EmploymentHistoryProps> = ({
  employeeId,
}) => {
  const { data, isLoading, error } = useFrappeDocument(
    "Employee",
    employeeId || "",
    ["custom_work_history", "date_of_joining"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as { data: Employee | null; isLoading: boolean; error: any };
  const history = data?.custom_work_history || [];
  const hasEmploymentHistory = history.length > 0;

  const defaultStartDateForAdd = !hasEmploymentHistory
    ? data?.date_of_joining
    : new Date().toISOString();
  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canEditEmploymentHistory = isActionEnabled(
    userUiPermission,
    "edit_employee_history",
    "Employee Profile",
  );
  const canAddEmploymentHistory = isActionEnabled(
    userUiPermission,
    "add_employee_history",
    "Employee Profile",
  );

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  const groupedHistory = history.reduce<Record<string, CustomWorkHistory[]>>(
    (acc, item) => {
      if (!acc[item.doctype_name]) acc[item.doctype_name] = [];
      acc[item.doctype_name].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="address-form-container bg-white rounded-md">
      <div className="p-4 md:p-8">
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-8 rounded-md ">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Employment History
            </h2>
            <p className="text-gray-600">
              Your employment history and organizational information
            </p>
          </div>
          <div className="flex gap-2 ">
            {canEditEmploymentHistory && (
              <Button
                onClick={() => {
                  setIsModalOpen(true);
                  setIsEditing(true);
                }}
                icon={<EditIcon className="h-4 w-4" />}
                variant="subtle"
                size="md"
              >
                Edit
              </Button>
            )}
            {canAddEmploymentHistory && (
              <Button
                onClick={() => setIsModalOpen(true)}
                icon={<PlusIcon className="h-4 w-4" />}
                variant="contain"
                size="md"
              >
                Add
              </Button>
            )}
          </div>
        </div>
        {!employeeId && (
          <p className="p-4 text-gray-500">No employee selected</p>
        )}

        {isLoading && (
          <div className="space-y-8">
            {[1, 2].map((section) => (
              <div key={section}>
                <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((card) => (
                    <div
                      key={card}
                      className="bg-white rounded-xl shadow-sm border p-6 animate-pulse"
                    >
                      <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
                      <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
                      <div className="h-4 w-28 bg-gray-100 rounded mb-2" />
                      <div className="h-4 w-24 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="p-4 text-red-500">Failed to load employment history</p>
        )}

        {!isLoading &&
          !error &&
          (() => {
            const joinDate = data?.date_of_joining
              ? new Date(data.date_of_joining).getTime()
              : null;

            let overallClosestItem: CustomWorkHistory | null = null;
            let overallClosestCategory: string | null = null;
            let minDiff = Infinity;

            if (joinDate && history.length > 0) {
              history.forEach((item) => {
                const itemDate = item.start_date
                  ? new Date(item.start_date).getTime()
                  : 0;
                const diff = Math.abs(itemDate - joinDate);
                if (diff < minDiff) {
                  minDiff = diff;
                  overallClosestItem = item;
                  overallClosestCategory = item.doctype_name;
                }
              });
            }

            const sortedCategories = Object.keys(groupedHistory).sort(
              (a, b) => {
                if (a === overallClosestCategory) return -1;
                if (b === overallClosestCategory) return 1;
                return a.localeCompare(b);
              },
            );

            return sortedCategories.map((category) => {
              const items = groupedHistory[category];
              const sortedItems = [...items].sort((a, b) => {
                // If we found a closest item and it's in this category, place it at the very top
                if (joinDate && category === overallClosestCategory) {
                  if (a.name === overallClosestItem?.name) return -1;
                  if (b.name === overallClosestItem?.name) return 1;
                }

                // Otherwise sort by start date descending
                const aDate = a.start_date
                  ? new Date(a.start_date).getTime()
                  : 0;
                const bDate = b.start_date
                  ? new Date(b.start_date).getTime()
                  : 0;
                return bDate - aDate;
              });

              return (
                <div key={category} className="mb-10">
                  <h3 className="md:text-xl font-semibold text-gray-800 mb-4">
                    {category}
                  </h3>

                  <div className="flex gap-2 overflow-auto">
                    {sortedItems.map((item) => (
                      <div
                        key={item.name}
                        className={`${
                          sortedItems.length === 1 ? "max-w-md w-full" : ""
                        }`}
                      >
                        <EmploymentHistoryCard
                          title={item.records}
                          start_date={item.start_date}
                          end_date={item.end_date}
                          isCurrent={!item.end_date}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <EmploymentHistoryForm
              onCancel={() => {
                setIsModalOpen(false);
                setIsEditing(false);
              }}
              isEdit={isEditing}
              defaultStartDate={defaultStartDateForAdd}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentHistory;
