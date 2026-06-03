
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect } from "react";

import { Users, Clock, CheckCircle, XCircle, Briefcase } from "lucide-react";
import { useScreenSize } from "../hooks/useScreenSize";
import { FetchParams } from "../services/customApiService";
import { FrappePageResponse } from "../types/frappe";
import FrappeAPI from "../utils/frappeAPI";
import DataListView, { FilterField } from "./DataListView";
import { Card } from "./shared/atoms/Card";
import { Typography } from "./shared/atoms/Typography";
import CardTable from "./shared/CardTable";
import { ColumnSortConfig } from "./shared/CardTableContext";
import Badge from "./shared/Badge";

const REFERRAL_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "candidate_name",
    getValue: (item: any) => item.candidate_name ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "designation",
    getValue: (item: any) => item.designation_label || item.designation || "",
  },
  {
    sortable: true,
    type: "string",
    field: "status",
    getValue: (item: any) => item.status ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "applied_on",
    getValue: (item: any) => item.applied_on ?? "",
  },
];

const mapStatusToGroup = (status: string) => {
  switch (status?.toLowerCase()) {
    case "draft":
    case "open":
      return "pending";
    case "interview":
      return "interview";
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    default:
      return undefined;
  }
};

const ReferralList = () => {
  const { isDesktop } = useScreenSize();

  const SUMMARY_STORAGE_KEY = "my-referrals-summary-cache";

  type SummaryShape = {
    total: number;
    pending: number;
    interview: number;
    accepted: number;
    rejected: number;
  };

  const [summary, _setSummary] = useState<SummaryShape | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = sessionStorage.getItem(SUMMARY_STORAGE_KEY);
      return cached ? (JSON.parse(cached) as SummaryShape) : null;
    } catch {
      return null;
    }
  });

  const setSummary = useCallback((next: SummaryShape) => {
    _setSummary(next);
    try {
      sessionStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  const titles = [
    "Candidate",
    "Designation & Opening",
    "Status",
    "Applied On",
  ];

  const columnWidths = [
    "minmax(200px, 1fr)",
    "minmax(220px, 1fr)",
    "150px",
    "160px",
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
      case "applied":
        return "bg-blue-100 text-blue-700";
      case "interview":
      case "shortlisted":
        return "bg-purple-100 text-purple-700";
      case "accepted":
      case "hired":
      case "offer":
        return "bg-green-100 text-green-700";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "draft":
        return "bg-orange-100 text-orange-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const ReferralListItem = ({ item, onView }: { item: any; onView: (item: any) => void }) => {
    const { isDesktop } = useScreenSize();

    const candidateName = item.candidate_name;
    const email = item.name;
    const designation = item.designation_label || item.designation;
    const openingCode = item.job_title;
    const status = item.status;
    const appliedOn = item.applied_on ? item.applied_on.split(" ")[0] : "--";

    const statusColor = getStatusColor(status);

    if (isDesktop) {
      return (
        <div
          className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer items-center bg-white"
          style={{ gridTemplateColumns: columnWidths.join(" ") }}
          onClick={() => onView(item)}
        >
          {/* Candidate */}
          <div className="flex flex-col gap-0.5">
            <Typography variant="bodySmall" className="font-medium text-center text-gray-900">
              {candidateName}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500 text-center text-xs">
              {email}
            </Typography>
          </div>

          {/* Designation & Opening */}
          <div className="flex flex-col gap-0.5">
            <Typography variant="bodySmall" className="font-medium text-center text-blue-600">
              {designation}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-400 text-center text-xs">
              {openingCode}
            </Typography>
          </div>

          {/* Status */}
          <div className="flex justify-center items-center">
            <Badge label={status} backgroundColor={statusColor} size="sm" />
          </div>

          {/* Applied On */}
          <div className="flex justify-center items-center">
            <Typography variant="bodySmall" className="text-gray-600 text-center">
              {appliedOn}
            </Typography>
          </div>
        </div>
      );
    }

    return (
      <Card
        radius="lg"
        className="border p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onView(item)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Typography variant="bodySmall" className="font-bold text-gray-900 mb-0.5">
                {candidateName}
              </Typography>
            </div>
            <Badge label={status} backgroundColor={statusColor} size="sm" />
          </div>

          {/* Designation & Opening */}
          <div className="space-y-0.5">
            <Typography variant="bodySmall" className="font-medium text-blue-600">
              {designation}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-400 text-xs">
              {openingCode}
            </Typography>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t">
            <Typography variant="bodySmall" className="text-gray-500 text-xs">
              Applied on: <span className="font-semibold text-gray-700">{appliedOn}</span>
            </Typography>
          </div>
        </div>
      </Card>
    );
  };

  const fetchReferrals = useCallback(async (_params: FetchParams): Promise<FrappePageResponse> => {
    const response: any = await FrappeAPI.callMethod(
      "recruitment.api.channels.refer.my_referrals",
      {
        search: _params.searchTerm || undefined,
        status: _params.filters?.status ? mapStatusToGroup(String(_params.filters.status)) : undefined,
      }
    );

    const referrals = response?.referrals || [];
    const stats = response?.stats;

    if (stats) {
      setSummary(stats);
    }

    // Client-side filtering
    let filtered = [...referrals];

    if (_params.filters) {
      Object.entries(_params.filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          filtered = filtered.filter((item: any) =>
            String(item[key] ?? "").toLowerCase().includes(String(val).toLowerCase())
          );
        }
      });
    }

    if (_params.searchTerm) {
      const term = _params.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (item: any) =>
          item.candidate_name?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.designation_label?.toLowerCase().includes(term) ||
          item.opening_label?.toLowerCase().includes(term) ||
          item.opening?.toLowerCase().includes(term)
      );
    }

    // Client-side sorting
    const orderBy = _params.orderBy || "applied_on desc";
    const [field, direction] = orderBy.split(" ");
    const config = REFERRAL_SORT_CONFIG.find((c: any) => c.sortable && c.field === field) as any;
    if (config && config.getValue) {
      filtered.sort((a, b) => {
        const valA = config.getValue(a);
        const valB = config.getValue(b);
        if (config.type === "date") {
          const timeA = valA ? new Date(valA).getTime() : 0;
          const timeB = valB ? new Date(valB).getTime() : 0;
          return direction?.toLowerCase() === "desc" ? timeB - timeA : timeA - timeB;
        }
        if (typeof valA === "string" && typeof valB === "string") {
          return direction?.toLowerCase() === "desc"
            ? valB.localeCompare(valA)
            : valA.localeCompare(valB);
        }
        return direction?.toLowerCase() === "desc"
          ? (valB > valA ? 1 : valB < valA ? -1 : 0)
          : (valA > valB ? 1 : valA < valB ? -1 : 0);
      });
    }

    // Client-side pagination (slicing)
    const start = _params.pageParam !== undefined ? _params.pageParam : 0;
    const limit = _params.pageSize || 20;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      totalCount: filtered.length,
      hasNextPage: start + paginated.length < filtered.length,
      nextCursor: start + paginated.length < filtered.length ? start + limit : undefined,
      pages: [Math.floor(start / limit) + 1],
    };
  }, [setSummary]);

  const filterFields: FilterField[] = [
    {
      fieldname: "status",
      label: "Status",
      fieldtype: "Select",
      options: ["Open", "Draft", "Interview", "Accepted", "Rejected"],
    },
    {
      fieldname: "designation",
      label: "Designation",
      fieldtype: "Data",
    },
  ];


  const [selectedReferral, setSelectedReferral] = useState<any | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedReferral) {
      setDetailData(null);
      return;
    }

    const email =  selectedReferral.name;
    if (!email) return;

    setIsLoadingDetail(true);
    FrappeAPI.callMethod(
      "recruitment.api.channels.refer.get_referral_application",
      { job_applicant: email }
    )
      .then((res: any) => {
        const data = res?.message || res;
        setDetailData(data);
      })
      .catch((err) => {
        console.error("Error fetching referral details:", err);
      })
      .finally(() => {
        setIsLoadingDetail(false);
      });
  }, [selectedReferral]);

  const renderField = (field: any) => {
    const { display_name, fieldtype, value, table_fields } = field;

    if (fieldtype === "Table") {
      const rows = Array.isArray(value) ? value : [];
      if (rows.length === 0) {
        return (
          <div key={field.reference_name} className="col-span-2 border-t pt-2 mt-2">
            <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-semibold">
              {display_name}
            </Typography>
            <div className="text-gray-400 text-xs italic">No records added.</div>
          </div>
        );
      }

      const visibleCols = (table_fields || []).filter((tf: any) => tf.in_list_view === 1);
      const colsToUse = visibleCols.length > 0 ? visibleCols : (table_fields || []).slice(0, 4);

      return (
        <div key={field.reference_name} className="col-span-2 border-t pt-2 mt-2 overflow-x-auto">
          <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-semibold">
            {display_name}
          </Typography>
          <table className="min-w-full text-xs border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {colsToUse.map((col: any) => (
                  <th key={col.fieldname} className="px-2 py-1 text-left border-b font-semibold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {colsToUse.map((col: any) => (
                    <td key={col.fieldname} className="px-2 py-1 text-gray-700">
                      {row[col.fieldname] !== undefined && row[col.fieldname] !== null
                        ? String(row[col.fieldname])
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (fieldtype === "Check") {
      return (
        <div key={field.reference_name} className="col-span-1">
          <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
            {display_name}
          </Typography>
          <div>
            <Badge
              label={value === 1 || value === true || String(value).toLowerCase() === "yes" ? "Yes" : "No"}
              backgroundColor={
                value === 1 || value === true || String(value).toLowerCase() === "yes"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }
              size="sm"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.reference_name} className="col-span-1">
        <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
          {display_name}
        </Typography>
        <Typography variant="bodySmall" className="font-semibold text-gray-900 break-words">
          {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
        </Typography>
      </div>
    );
  };

  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: any }) => (
        <ReferralListItem item={item} onView={setSelectedReferral} />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const statCards = [
    {
      title: "Total Referrals",
      value: summary?.total ?? "—",
      icon: Users,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Pending",
      value: summary?.pending ?? "—",
      icon: Clock,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      title: "In Interview",
      value: summary?.interview ?? "—",
      icon: Briefcase,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Accepted",
      value: summary?.accepted ?? "—",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Rejected",
      value: summary?.rejected ?? "—",
      icon: XCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="flex items-center justify-between px-2 mb-4">
        <Typography variant="h4" className="font-bold text-gray-900">
          My Referrals
        </Typography>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 mb-4 md:grid-cols-5 gap-3 md:gap-4 px-1">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              radius="xl"
              className="border p-4 md:p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center shrink-0`}
                >
                  <Icon className={`size-5 md:size-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <Typography variant="bodySmall" className="mb-1" color="body2">
                    {stat.title}
                  </Typography>
                  <Typography variant="subheading" color="primary">
                    {stat.value}
                  </Typography>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* List */}
      {isDesktop ? (
        <CardTable
          titles={titles}
          columnWidths={columnWidths}
          columnSortConfig={REFERRAL_SORT_CONFIG}
        >
          <DataListView
            queryKey={["my-referrals"]}
            fetchFunction={fetchReferrals}
            ItemComponent={ItemComponent}
            searchFields={["candidate_name", "email", "designation", "opening"]}
            infiniteScroll={false}
            pageSize={20}
            isFilter={true}
            filterFields={filterFields}
          />
        </CardTable>
      ) : (
        <div className="space-y-3 px-1">
          <DataListView
            queryKey={["my-referrals"]}
            fetchFunction={fetchReferrals}
            ItemComponent={ItemComponent}
            searchFields={["candidate_name", "email", "designation", "opening"]}
            infiniteScroll={false}
            pageSize={20}
            isFilter={true}
            filterFields={filterFields}
          />
        </div>
      )}

      {/* DETAIL MODAL / SIDEBAR */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div className="absolute inset-0" onClick={() => setSelectedReferral(null)} />

          <div
            className={`bg-white flex flex-col w-full ${
              isDesktop ? "max-w-[900px] rounded-l-2xl shadow-2xl" : ""
            } relative h-screen z-10`}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <Typography variant="subheading" className="font-extrabold text-2xl text-gray-900 tracking-tight">
                  {selectedReferral.candidate_name}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-500 text-sm mt-0.5">
                  {selectedReferral.email}
                </Typography>
              </div>
              <button
                onClick={() => setSelectedReferral(null)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors duration-150 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-sm">
              {/* Overview Card */}
              <div className="grid grid-cols-3 gap-x-8 gap-y-6 border border-[#e5ebf0] p-6 rounded-xl bg-[#f4f7fa]">
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Status
                  </Typography>
                  <div>
                    <Badge
                      label={selectedReferral.status}
                      backgroundColor={getStatusColor(selectedReferral.status)}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Status Group
                  </Typography>
                  <Typography variant="bodySmall" className="font-bold text-gray-900">
                    {selectedReferral.status_group || "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Designation
                  </Typography>
                  <Typography variant="bodySmall" className="font-bold text-gray-900">
                    {selectedReferral.designation_label || selectedReferral.designation || "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Applied On
                  </Typography>
                  <Typography variant="bodySmall" className="font-bold text-gray-900">
                    {selectedReferral.applied_on ? selectedReferral.applied_on.split(" ")[0] : "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Opening
                  </Typography>
                  <Typography variant="bodySmall" className="font-bold text-gray-900 break-words">
                    {selectedReferral.opening_label || selectedReferral.opening || "—"}
                  </Typography>
                  {selectedReferral.opening && (
                    <Typography variant="bodySmall" className="text-gray-400 text-xs mt-0.5">
                      {selectedReferral.opening}
                    </Typography>
                  )}
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-1 font-medium">
                    Email
                  </Typography>
                  <Typography variant="bodySmall" className="font-bold text-gray-900 break-all">
                    {selectedReferral.email || "—"}
                  </Typography>
                </div>
              </div>

              {/* Detailed Application Sections from API */}
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-16 gap-3 text-blue-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm text-gray-500">Loading applicant details...</span>
                </div>
              ) : detailData?.sections ? (
                detailData.sections.map((sec: any, sIdx: number) => {
                  if (!sec.fields || sec.fields.length === 0) return null;
                  return (
                    <div key={sIdx} className="space-y-4">
                      <div className="text-xs font-bold text-gray-800 tracking-wider uppercase pb-2 border-b border-gray-200 mt-6">
                        {sec.section}
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-2">
                        {sec.fields.map((field: any) => renderField(field))}
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex justify-end bg-white shrink-0">
              <button
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralList;