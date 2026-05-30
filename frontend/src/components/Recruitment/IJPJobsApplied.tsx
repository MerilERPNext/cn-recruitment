import { useState, useCallback, useMemo } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import DataListView, { FilterField } from "../DataListView";
import CardTable from "../shared/CardTable";
import { IJPApplication } from "./IJPTypes";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import Button from "../shared/atoms/Button";
import Modal from "../shared/Modal";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Undo2, AlertTriangle } from "lucide-react";
import { useWithdrawIJPApplication } from "../../hooks/useRecruitment";

// ─── Status Badge Helper ──────────────────────────────────────────────────────

const renderStatusBadge = (status: string | null) => {
  const normStatus = (status || "Applied").toLowerCase();
  let bg = "bg-blue-100";
  let text = "text-blue-800";

  if (normStatus === "offered" || normStatus === "hired") {
    bg = "bg-emerald-100";
    text = "text-emerald-800";
  } else if (normStatus === "withdrawn" || normStatus === "rejected") {
    bg = "bg-rose-100";
    text = "text-rose-800";
  } else if (normStatus === "screening") {
    bg = "bg-amber-100";
    text = "text-amber-800";
  }

  return (
    <Badge
      label={status || "Applied"}
      backgroundColor={bg}
      textColor={text}
      size="sm"
    />
  );
};

const COLUMN_WIDTHS = [
  "1.25fr", // Opening ID
  "1.5fr",  // Job Title
  "1fr",    // Job Status
  "1.5fr",  // Email
  "1.25fr", // Phone
  "1.25fr", // Applied Date
  "1fr",    // Status
  "0.75fr", // Action (Back arrow button)
];

const TITLES = [
  "Opening ID",
  "Job Title",
  "Job Status",
  "Email",
  "Phone",
  "Applied Date",
  "Status",
  "Action",
];

export default function IJPJobsApplied() {
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedAppToWithdraw, setSelectedAppToWithdraw] =
    useState<IJPApplication | null>(null);
  const [isConfirmingWithdraw, setIsConfirmingWithdraw] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const withdrawMutation = useWithdrawIJPApplication();


  const filterFields: FilterField[] = useMemo(
    () => [
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select" as const,
        options: [
          { label: "Applied", value: "Applied" },
          { label: "Screening", value: "Screening" },
          { label: "Technical Round", value: "Technical Round" },
          { label: "Manager Round", value: "Manager Round" },
          { label: "Offered", value: "Offered" },
          { label: "Withdrawn", value: "Withdrawn" },
        ],
      },
    ],
    [],
  );

  const handleWithdraw = () => {
    if (!selectedAppToWithdraw) return;

    withdrawMutation.mutate(
      {
        job_applicant: selectedAppToWithdraw.name,
        reason: withdrawReason,
      },
      {
        onSuccess: () => {
          setIsConfirmingWithdraw(false);
          setSelectedAppToWithdraw(null);
          setWithdrawReason("");
        },
      },
    );
  };

  const clientFilterFn = useCallback(
    (data: IJPApplication[]) => {
      let filtered = data;

      if (statusFilter) {
        filtered = filtered.filter((item) =>
          (item.status || "")
            .toLowerCase()
            .includes(statusFilter.toLowerCase()),
        );
      }

      if (searchTerm.trim()) {
        const s = searchTerm.trim().toLowerCase();
        const searchFields: (keyof IJPApplication)[] = [
          "job_title",
          "opening",
          "name",
          "email",
          "phone",
          "status",
        ];
        filtered = filtered.filter((item) =>
          searchFields.some((field) =>
            item[field]?.toString().toLowerCase().includes(s),
          ),
        );
      }

      return filtered;
    },
    [statusFilter, searchTerm],
  );

  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: IJPApplication }) => {
        if (isDesktop) {
          return (
            <div
              className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors items-center min-w-max bg-white text-sm"
              style={{ gridTemplateColumns: COLUMN_WIDTHS.join(" ") }}
            >
              <div className="text-slate-800 font-medium truncate text-center">
                {item.opening || item.name}
              </div>
              <div className="text-blue-600 font-semibold truncate text-center">
                {item.job_title || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.job_status || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.email || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.phone || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.applied_on ? formatToIndianDate(item.applied_on) : "--"}
              </div>
              <div className="flex justify-center items-center">
                {renderStatusBadge(item.status)}
              </div>
              <div className="flex justify-center items-center">
                {item.can_withdraw &&
                item.status.toLowerCase() !== "withdrawn" ? (
                  <Button
                    variant="outline"
                    className="border-red-200 hover:bg-red-50 text-red-600 p-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppToWithdraw(item);
                      setIsConfirmingWithdraw(true);
                    }}
                  >
                    <Undo2 className="size-4" />
                  </Button>
                ) : (
                  <span className="text-gray-400 text-xs">-</span>
                )}
              </div>
            </div>
          );
        }

        // Mobile View
        return (
          <div className="border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl m-2">
            <div className="p-4 flex flex-col gap-4 w-full">
              {/* Header: ID + Status */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Opening ID</Typography>
                  <Typography variant="mobileCardValue">
                    {item.opening || item.name}
                  </Typography>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {renderStatusBadge(item.status)}
                </div>
              </div>

              {/* Job Title */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Job Title</Typography>
                <Typography
                  variant="mobileCardValue"
                  className="font-semibold text-gray-900"
                >
                  {item.job_title || "--"}
                </Typography>
              </div>

              {/* Designation + Department */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1 max-w-[50%]">
                  <Typography variant="mobileCardLabel">Job Status</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.job_status || "--"}
                  </Typography>
                </div>

                <div className="flex flex-col gap-1 text-right max-w-[50%]">
                  <Typography variant="mobileCardLabel">Email</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.email || "--"}
                  </Typography>
                </div>
              </div>

              {/* Phone + Applied On */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1 max-w-[50%]">
                  <Typography variant="mobileCardLabel">Phone</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.phone || "--"}
                  </Typography>
                </div>

                <div className="flex flex-col gap-1 text-right max-w-[50%]">
                  <Typography variant="mobileCardLabel">Applied On</Typography>
                  <Typography variant="mobileCardValue">
                    {item.applied_on
                      ? formatToIndianDate(item.applied_on)
                      : "--"}
                  </Typography>
                </div>
              </div>

              {/* Action Button on mobile card footer */}
              {item.can_withdraw &&
                item.status.toLowerCase() !== "withdrawn" && (
                  <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                    <Button
                      variant="outline"
                      className="border-red-200 hover:bg-red-50 text-red-600 flex items-center gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppToWithdraw(item);
                        setIsConfirmingWithdraw(true);
                      }}
                    >
                      <Undo2 className="size-3.5" />
                      Withdraw
                    </Button>
                  </div>
                )}
            </div>
          </div>
        );
      },
    [isDesktop],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans w-full max-w-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-4 py-1 md:pb-4">
            <Typography variant="h4">IJP Jobs Applied</Typography>
            <Typography variant="bodySmall" color="body2">
              View status and details of your submitted job applications
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-2 pb-5 md:pb-20 mt-2 max-w-full overflow-x-hidden">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full max-w-full">
          {isDesktop ? (
            <CardTable titles={TITLES} columnWidths={COLUMN_WIDTHS}>
              <DataListView
                queryKey={["my-applications", currentEmployee?.name || ""]}
                customAPI={{
                  method: "recruitment.api.channels.ijp.my_applications",
                  responseKeys: {
                    dataKey: "applications",
                    totalCountKey: "active_count",
                  },
                }}
                ItemComponent={ItemComponent}
                isSearch={true}
                isFilter={true}
                filterFields={filterFields}
                onFiltersChange={(filters) => {
                  setStatusFilter(filters.status || null);
                }}
                onSearchChange={setSearchTerm}
                clientFilterFn={clientFilterFn}
                pageSize={10}
              />
            </CardTable>
          ) : (
            <div className="space-y-3 px-1">
              <DataListView
                queryKey={["my-applications", currentEmployee?.name || ""]}
                customAPI={{
                  method: "recruitment.api.channels.ijp.my_applications",
                  responseKeys: {
                    dataKey: "applications",
                    totalCountKey: "active_count",
                  },
                }}
                ItemComponent={ItemComponent}
                isSearch={true}
                isFilter={true}
                filterFields={filterFields}
                onFiltersChange={(filters) => {
                  setStatusFilter(filters.status || null);
                }}
                onSearchChange={setSearchTerm}
                clientFilterFn={clientFilterFn}
                pageSize={10}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmingWithdraw}
        onClose={() => {
          setIsConfirmingWithdraw(false);
          setSelectedAppToWithdraw(null);
          setWithdrawReason("");
        }}
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <div className="bg-red-50 p-2 rounded-full">
              <AlertTriangle className="size-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Withdraw Application
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Are you sure you wish to withdraw you application? You will not able
            to undo this action
          </p>

          <div className="mb-5">
            <label className="text-xs text-gray-500 uppercase mb-1.5 block font-semibold tracking-wide">
              Reason for withdrawal
            </label>
            <textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Enter reason for withdrawal..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-slate-900 font-semibold"
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setIsConfirmingWithdraw(false);
                setSelectedAppToWithdraw(null);
                setWithdrawReason("");
              }}
              size="sm"
              bgColor="disabled"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              disabled={!withdrawReason.trim() || withdrawMutation.isPending}
              loading={withdrawMutation.isPending}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
