import { useEffect, useState } from "react";
import Button from "../../../shared/atoms/Button";
import SideDrawer from "../../../shared/SideDrawer";
import {
  useGetAllEmployeeRegularize,
  useMarkBulkAttendance,
} from "../../../../hooks/useAttendance";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  generateMonthOptions,
  getMonthDateRange,
} from "../../../../utils/helperUtils";
import { MonthOption } from "../../AllEmpAttendance/SelectByMonth";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";
import { EmployeeRegularize } from "../../../../types/attendance";
import toast from "react-hot-toast";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import { useSearchParams } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";

const RegularizeDrawer = () => {
  const [searchParams] = useSearchParams();
  const encodedDate = searchParams.get("date") || "";
  const decodedDate = decodeURIComponent(encodedDate);

  // 2️⃣ Parse ISO string → Date
  const parsedDate = decodedDate ? parseISO(decodedDate) : new Date();
  const date = isValid(parsedDate) ? parsedDate : new Date();
  const formattedDate = format(date, "yyyy-MM");

  const [open, setOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string,
  );

  const monthOptions: MonthOption[] = generateMonthOptions(1);
  const { frm_date, to_date } = getMonthDateRange(
    formattedDate || monthOptions[0].value,
  );

  const {
    data: allEmployeeRegularize,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAllEmployeeRegularize(
    {
      employee: currentEmployee?.employee,
      from_date: frm_date,
      to_date: to_date,
      exclude_holidays: 1,
    },
    open && !!currentEmployee?.employee,
    decodedDate,
  );
  const {
    mutateAsync: markBulkAttendance,
    isPending: isMarkBulkAttendancePending,
  } = useMarkBulkAttendance();

  useEffect(() => {
    if (!open) setSelectedDates([]);
  }, [open]);

  const isAllSelected =
    allEmployeeRegularize &&
    selectedDates.length === allEmployeeRegularize.length;

  const toggleSelectAll = () => {
    if (!allEmployeeRegularize) return;

    setSelectedDates(
      isAllSelected ? [] : allEmployeeRegularize.map((item) => item.date),
    );
  };

  const toggleRow = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
  };

  const handleSubmit = () => {
    markBulkAttendance(
      {
        data: {
          employee: currentEmployee?.employee,
          from_date: frm_date,
          to_date: to_date,
          exclude_holidays: 0,
          status: "Present",
          unmarked_days: selectedDates,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedDates([]);
          refetch();
          toast.success("Regularization submitted successfully");
        },
        onError: (error) => {
          const err = errorResponseFormater(error);
          toast.error(err);
        },
      },
    );
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Attendance Update
      </Button>

      <SideDrawer
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        title="Attendance Update"
        size="xxl"
      >
        <div className="mb-30">
          {isLoading && (
            <>
              <div className="animate-pulse mb-2">
                <div className="h-8 w-1/2 bg-gray-200 rounded-lg" />
              </div>
              <TableSkeleton columns={4} rows={16} />
            </>
          )}

          {isError && (
            <div className="p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
              Failed to load check-ins.
              <div className="mt-1 text-xs text-red-600">
                {(error as Error)?.message || "Something went wrong"}
              </div>
            </div>
          )}

          {!isLoading &&
            !isError &&
            allEmployeeRegularize &&
            allEmployeeRegularize?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-100 mb-20">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <td className="border-r px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                        />
                      </td>
                      <td className="border-r px-4 py-3 text-xs font-medium text-gray-500">
                        Date
                      </td>
                      <td className="border-r px-4 py-3 text-xs font-medium text-gray-500">
                        Attendance Status
                      </td>
                      <td className="border-r px-4 py-3 text-xs font-medium text-gray-500">
                        Day Type
                      </td>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {allEmployeeRegularize.map((item: EmployeeRegularize) => (
                      <tr key={item.date} className="hover:bg-gray-50 text-sm">
                        <td className="border-r px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedDates.includes(item.date)}
                            onChange={() => toggleRow(item.date)}
                          />
                        </td>
                        <td className="border-r px-4 py-3 text-sm">
                          {format(new Date(item.date), "dd-MM-yyyy")}
                        </td>
                        <td className="border-r px-4 py-3 text-sm">
                          {item.status}
                        </td>
                        <td className="border-r px-4 py-3 text-sm">
                          {item.day}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {!isLoading && !isError && allEmployeeRegularize?.length === 0 && (
            <div className="text-sm text-gray-500">
              No check-ins found for the selected month.
            </div>
          )}
        </div>
        {selectedDates.length > 0 && (
          <div className="sticky w-full px-8 bottom-14 z-10 bg-white left-0 border-t border-gray-200 rounded-lg shadow-lg  py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Selected: {selectedDates.length}
            </span>

            <Button
              size="md"
              disabled={selectedDates.length === 0}
              onClick={handleSubmit}
            >
              {isMarkBulkAttendancePending ? (
                <CircularLoader color="white" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        )}
      </SideDrawer>
    </>
  );
};

export default RegularizeDrawer;
