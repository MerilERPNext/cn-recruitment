import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  History,
  RefreshCw,
  X,
} from "lucide-react";
import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import FrappeAPI from "../../utils/frappeAPI";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import CircularLoader from "../shared/atoms/CircularLoader";

interface Transaction {
  source: string;
  ref: string;
  start_date: string;
  field: string;
  field_label: string;
  current_value: string;
  updated_value: string;
}

interface FutureTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

const FutureTransactionsModal: React.FC<FutureTransactionsModalProps> = ({
  isOpen,
  onClose,
  employeeId,
}) => {
  const { isDesktop } = useScreenSize();

  // Fetch data using TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useQuery<
    Transaction[],
    Error
  >({
    queryKey: ["future-transactions", employeeId],
    queryFn: async () => {
      const response = await FrappeAPI.getMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.get_future_field_transactions",
        { employee: employeeId },
      );
      return (response as Transaction[]) || [];
    },
    enabled: isOpen && !!employeeId,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isDesktop ? "md" : "full"}
      className="p-0 overflow-hidden rounded-2xl"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
              <History className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-wide">
                Future Transactions
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Scheduled changes for Employee ID:{" "}
                <span className="font-bold underline">{employeeId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data && data.length > 0 && (
              <Badge
                label={`${data.length} Pending`}
                backgroundColor="bg-white/25"
                textColor="text-white"
                size="sm"
              />
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-blue-100 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`bg-slate-50/50 p-6 overflow-y-auto ${isDesktop ? "min-h-[300px] max-h-[70vh]" : "h-[calc(100vh-80px)]"}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-16 w-16 rounded-full border-4 border-blue-500/20 animate-ping"></div>
              <CircularLoader size="lg" color="blue-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 animate-pulse">
              Retrieving future field transactions...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-red-50 p-3 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h4 className="text-base font-semibold text-gray-900">
              Failed to load transactions
            </h4>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {error.message ||
                "An unexpected error occurred while fetching the transactions."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4 flex items-center gap-1.5"
              icon={
                <RefreshCw
                  className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
                />
              }
            >
              Retry Connection
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <History className="h-8 w-8 text-blue-500" />
            </div>
            <h4 className="text-base font-semibold text-gray-900">
              No Future Transactions Found
            </h4>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              There are currently no scheduled or future field updates
              configured for this employee profile.
            </p>
          </div>
        ) : isDesktop ? (
          /* Desktop Layout (Table) */
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Effective Date
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Field Name
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Current Value
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Updated Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((tx, idx) => (
                  <tr
                    key={tx.ref || idx}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4.5 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>{formatToIndianDate(tx.start_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                        {tx.field_label || tx.field}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-xs text-gray-600">
                      <span className="inline-flex items-center rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-1.5 font-medium tracking-wide">
                        {tx.current_value || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-xs">
                      <span className="inline-flex items-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 px-3.5 py-1.5 font-bold tracking-wide">
                        {tx.updated_value || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile Layout (Cards) */
          <div className="space-y-4">
            {data.map((tx, idx) => (
              <div
                key={tx.ref || idx}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>{formatToIndianDate(tx.start_date)}</span>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                    {tx.field_label || tx.field}
                  </span>
                </div>

                <div className="grid grid-cols-7 items-center gap-2">
                  <div className="col-span-3 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[9px] uppercase font-extrabold tracking-wider text-gray-400 mb-1">
                      Current
                    </div>
                    <div className="font-mono text-xs text-gray-700 truncate font-semibold">
                      {tx.current_value || "-"}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>

                  <div className="col-span-3 text-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <div className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600 mb-1">
                      Updated
                    </div>
                    <div className="font-mono text-xs text-emerald-800 truncate font-bold">
                      {tx.updated_value || "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FutureTransactionsModal;
