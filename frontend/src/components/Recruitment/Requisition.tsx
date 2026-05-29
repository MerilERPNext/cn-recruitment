/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import { useScreenSize } from "../../hooks/useScreenSize";
import Badge from "../shared/Badge";
import DataListView, { FilterField } from "../DataListView";
import FrappeAPI from "../../utils/frappeAPI";
import type { FetchParams } from "../../services/customApiService";
import type { FrappePageResponse } from "../../types/frappe";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import { Briefcase, CheckCircle, Edit, FileText, FolderOpen } from "lucide-react";

const EditButton = ({ requisition, onClose }: { requisition: any; onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        onClose();
        navigate("/webapp/recruitment/requisition/edit", {
          state: { requisition },
        });
      }}
      className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
    >
      <Edit className="w-4 h-4" /> Edit Requisition
    </button>
  );
};

const Requisition = () => {
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployee();
  const currentEmployeeName = currentEmployee?.employee_name;
  // Persist the 4-card summary across navigations (e.g. edit → back) so the
  // cards don't blank out when React Query returns cached row data without
  // re-running the loader on remount.
  const SUMMARY_STORAGE_KEY = "requisition-summary-cache";
  type SummaryShape = {
    total_requisitions: number;
    total_positions: number;
    active_offer_positions: number;
    closed_positions: number;
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
  const setSummary = (next: SummaryShape) => {
    _setSummary(next);
    try {
      sessionStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* sessionStorage unavailable — fall back to in-memory only */
    }
  };
  const titles = [
    "Requisition Code",
    "Designation, Department & Location",
    "Status",
    "Total Positions",
    "Active Evaluation",
    "Active Offer",
    "Draft",
    "Closed Positions",
    "Last Updated On",
    "Initiated On",
  ];

  const columnWidths = [
    "140px",
    "minmax(250px, 1fr)",
    "150px",
    "130px",
    "140px",
    "120px",
    "80px",
    "140px",
    "130px",
    "130px",
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "approved active":
      case "open":
      case "open & approved":
        return "bg-green-100 text-green-700";
      case "pending":
      case "approval pending":
        return "bg-yellow-100 text-yellow-700";
      case "draft":
      case "approved draft":
        return "bg-orange-100 text-orange-700";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "filled":
      case "closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const RequisitionItem = ({ item, onView }: { item: any; onView: (item: any) => void }) => {
    const { isDesktop } = useScreenSize();
    const [showRequesterCard, setShowRequesterCard] = useState(false);

    const handleRowClick = () => {
      onView(item);
    };

    const code = item.name;
    const designation = item.designation;
    const department = item.department;
    const location = item.custom_location || item.location;
    const status = item.status;

    const totalPositions = item.no_of_positions || item.total_positions || "1";

    const details = item.custom_position_details || [];
    const newCount = details.filter((p: any) => p.vacancy_type === "New").length;
    const replacementCount = details.filter((p: any) => p.vacancy_type === "Replacement").length;
    const positionDetail = item.position_detail || `(${newCount} New, ${replacementCount} Repl..)`;
    const activeEvaluation = item.active_evaluation || "0";
    const activeOffer = item.active_offer || "--";
    const draft = item.draft_count || "0";
    const closedPositions = item.closed_positions || "--";

    const lastUpdated = item.modified ? item.modified.split(" ")[0] : "--";
    const initiated = item.creation ? item.creation.split(" ")[0] : "--";

    const statusColor = getStatusColor(status);

    if (isDesktop) {
      return (
        <div
          className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer items-center min-w-max bg-white"
          style={{ gridTemplateColumns: columnWidths.join(" ") }}
          onClick={handleRowClick}
        >
          <div className="flex items-center">
            <Typography variant="bodySmall" className="font-medium text-gray-900">
              {code}
            </Typography>
          </div>

          <div className="flex flex-col gap-0.5">
            <Typography variant="bodySmall" className="font-medium text-blue-600">
              {designation}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {department}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {location}
            </Typography>
          </div>

          <div className="flex items-center">
            <Badge label={status} backgroundColor={statusColor} />
          </div>

          <div className="flex flex-col gap-0.5">
            <Typography variant="bodySmall" className="font-semibold">
              {totalPositions}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500 text-xs text-nowrap truncate">
              {positionDetail}
            </Typography>
          </div>

          <div className="flex items-center justify-center">
            <Typography
              variant="bodySmall"
              className={activeEvaluation === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
            >
              {activeEvaluation}
            </Typography>
          </div>

          <div className="flex items-center justify-center">
            <Typography
              variant="bodySmall"
              className={activeOffer === "--" || activeOffer === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
            >
              {activeOffer}
            </Typography>
          </div>

          <div className="flex items-center justify-center">
            <Typography
              variant="bodySmall"
              className={draft === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
            >
              {draft}
            </Typography>
          </div>

          <div className="flex items-center justify-center">
            <Typography
              variant="bodySmall"
              className={closedPositions === "--" || closedPositions === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
            >
              {closedPositions}
            </Typography>
          </div>

          <div className="flex items-center">
            <Typography variant="bodySmall" className="text-gray-600">
              {lastUpdated}
            </Typography>
          </div>

          <div className="flex items-center relative">
            <div
              className="flex flex-col gap-0.5"
              onMouseEnter={() => setShowRequesterCard(true)}
              onMouseLeave={() => setShowRequesterCard(false)}
            >
              <Typography variant="bodySmall" className="text-gray-600">
                {initiated}
              </Typography>
              <Typography variant="bodySmall" className="text-gray-500 text-xs hover:underline cursor-pointer">
                {item.requested_by_name || item.requested_by}
              </Typography>
              {showRequesterCard && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50 w-72 transition-all duration-200 text-left pointer-events-none">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-base">
                      {item.requested_by_name ? item.requested_by_name[0] : "E"}
                    </div>
                    <div>
                      <Typography variant="bodySmall" className="font-bold text-gray-900 leading-tight">
                        {item.requested_by_name}
                      </Typography>
                      <Typography variant="bodySmall" className="text-gray-500 text-xs truncate max-w-[170px]">
                        {item.requested_by_designation || "Employee"}
                      </Typography>
                    </div>
                  </div>
                  <div className="border-t z-50 border-gray-100 pt-2 space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Employee ID:</span>
                      <span className="font-semibold">{item.requested_by}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Department:</span>
                      <span className="font-semibold">{item.requested_by_dept || "—"}</span>
                    </div>
                    {item.custom_requested_by_user_id && (
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="font-semibold truncate max-w-[160px]">{item.custom_requested_by_user_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Card
        radius="lg"
        className="border p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleRowClick}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Typography variant="bodySmall" className="font-bold text-gray-900 mb-1">
                {code}
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-blue-600">
                {designation}
              </Typography>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-medium ${statusColor} shrink-0`}>
              {status}
            </span>
          </div>

          {/* Department, Location & Requester */}
          <div className="space-y-0.5">
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {department}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {location}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500 text-xs">
              Requested by: {item.requested_by_name || item.requested_by}
            </Typography>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Total Positions
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {totalPositions}{" "}
                <span className="text-gray-500 text-xs font-normal">{positionDetail}</span>
              </Typography>
            </div>
            <div>
              <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Active Evaluation
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {activeEvaluation}
              </Typography>
            </div>
            <div>
              <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Last Updated
              </Typography>
              <Typography variant="bodySmall" className="font-semibold text-xs">
                {lastUpdated}
              </Typography>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const fetchRequisitions = useCallback(async (params: FetchParams): Promise<FrappePageResponse> => {
    const start = params.pageParam !== undefined ? params.pageParam : 0;
    const limit = params.pageSize || 20;

    const finalFilters: any[] = [];
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          finalFilters.push([key, "=", val]);
        }
      });
    }

    if (params.searchTerm) {
      const term = params.searchTerm.trim();
      if (/req/i.test(term) || /\d/.test(term)) {
        finalFilters.push(["name", "like", `%${term}%`]);
      } else {
        finalFilters.push(["designation", "like", `%${term}%`]);
      }
    }

    const response: any = await FrappeAPI.callMethod(
      "recruitment.api.job_requisition.get_job_requisition",
      {
        start,
        limit,
        filters: finalFilters.length > 0 ? JSON.stringify(finalFilters) : undefined,
        employee: currentEmployee?.name,
        order_by: params.orderBy || "modified desc",
      }
    );

    const requisitions = response?.data?.requisitions || [];
    const totalCount = response?.data?.pagination?.total ?? requisitions.length;
    const returned = response?.data?.pagination?.returned ?? requisitions.length;

    const hasNextPage = start + returned < totalCount;
    const nextCursor = hasNextPage ? start + returned : undefined;

    if (response?.data?.summary) {
      setSummary(response.data.summary);
    }

    return {
      data: requisitions,
      totalCount,
      hasNextPage,
      nextCursor,
      pages: [Math.floor(start / limit) + 1],
    };
  }, [currentEmployee?.name]);

  const filterFields: FilterField[] = [
    {
      fieldname: "status",
      label: "Status",
      fieldtype: "Select",
      options: ["Pending", "Approved", "Cancelled", "Closed", "Draft"],
    },
    {
      fieldname: "department",
      label: "Department",
      fieldtype: "Data",
    },
    {
      fieldname: "designation",
      label: "Designation",
      fieldtype: "Data",
    },
  ];

  const REQUISITION_SORT_CONFIG: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "string",
      field: "name",
      getValue: (item: any) => item.name ?? "",
    },
    {
      sortable: true,
      type: "string",
      field: "designation",
      getValue: (item: any) => item.designation ?? "",
    },
    {
      sortable: true,
      type: "string",
      field: "status",
      getValue: (item: any) => item.status ?? "",
    },
    {
      sortable: true,
      type: "number",
      field: "no_of_positions",
      getValue: (item: any) => item.no_of_positions ?? 0,
    },
    { sortable: false },
    { sortable: false },
    { sortable: false },
    { sortable: false },
    {
      sortable: true,
      type: "date",
      field: "modified",
      getValue: (item: any) => item.modified ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "creation",
      getValue: (item: any) => item.creation ?? "",
    },
  ];

  const [selectedRequisition, setSelectedRequisition] = useState<any | null>(null);

  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: any }) => (
        <RequisitionItem item={item} onView={setSelectedRequisition} />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const statCards = [
    {
      title: "Total Requisitions",
      value: summary?.total_requisitions ?? "—",
      icon: FileText,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Total Positions",
      value: summary?.total_positions ?? "—",
      icon: Briefcase,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Active Offer Positions",
      value: summary?.active_offer_positions ?? "—",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Closed Positions",
      value: summary?.closed_positions ?? "—",
      icon: FolderOpen,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="flex-1  overflow-y-auto pb-24">
      <div className="flex items-center justify-between px-2">
        <Typography
          variant="h4"
          className="font-bold text-gray-900"
        >
          Requisition
        </Typography>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 mb-4 md:grid-cols-4 gap-3 md:gap-4 px-1">
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
      {isDesktop ? (
        <CardTable
          titles={titles}
          columnWidths={columnWidths}
          columnSortConfig={REQUISITION_SORT_CONFIG}
        >
          <DataListView
            queryKey={["job-requisitions", currentEmployeeName || ""]}
            fetchFunction={fetchRequisitions}
            ItemComponent={ItemComponent}
            searchFields={["name", "designation", "department"]}
            infiniteScroll={false}
            pageSize={10}
            isFilter={true}
            filterFields={filterFields}
          />
        </CardTable>
      ) : (
        <div className="space-y-3 px-1">
          <DataListView
            queryKey={["job-requisitions", currentEmployeeName || ""]}
            fetchFunction={fetchRequisitions}
            ItemComponent={ItemComponent}
            searchFields={["name", "designation", "department"]}
            infiniteScroll={false}
            pageSize={20}
            isFilter={true}
            filterFields={filterFields}
          />
        </div>
      )}

      {/* REQUISITION DETAIL MODAL / SIDEBAR */}
      {selectedRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div className="absolute inset-0" onClick={() => setSelectedRequisition(null)} />

          <div
            className={`bg-white flex flex-col w-full ${isDesktop ? "max-w-[600px]" : ""
              } shadow-lg relative h-screen z-10`}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <Typography variant="subheading" color="body1" className="font-bold text-lg">
                  {selectedRequisition.name}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-500 text-xs">
                  {selectedRequisition.designation} — {selectedRequisition.department}
                </Typography>
              </div>
              <button
                onClick={() => setSelectedRequisition(null)}
                className="text-gray-500 hover:text-black text-xl p-2"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* Overview Details Card */}
              <div className="grid grid-cols-2 gap-4 border border-gray-200 p-4 rounded-xl bg-gray-50/50">
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Status
                  </Typography>
                  <Badge
                    label={selectedRequisition.status}
                    backgroundColor={getStatusColor(selectedRequisition.status)}
                  />
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Hiring Lead
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">
                    {selectedRequisition.custom_hiring_lead || "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Total Positions
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">
                    {selectedRequisition.no_of_positions}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Expected compensation
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">
                    {selectedRequisition.expected_compensation
                      ? `INR ${selectedRequisition.expected_compensation.toLocaleString("en-IN")}`
                      : "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Posting Date
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">
                    {selectedRequisition.posting_date || "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                    Expected By
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">
                    {selectedRequisition.expected_by || "—"}
                  </Typography>
                </div>
              </div>

              {/* Position Details Table */}
              <div className="space-y-3">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Position Details
                </Typography>
                {selectedRequisition.custom_position_details?.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left">No</th>
                          <th className="px-4 py-2 text-left">Vacancy Type</th>
                          <th className="px-4 py-2 text-left">Location</th>
                          <th className="px-4 py-2 text-left">Reporting Manager</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-150 text-gray-900">
                        {selectedRequisition.custom_position_details.map((pos: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2 font-medium">{pos.position_no}</td>
                            <td className="px-4 py-2">{pos.vacancy_type}</td>
                            <td className="px-4 py-2">{pos.location || "—"}</td>
                            <td className="px-4 py-2">{pos.reporting_manager || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Typography variant="bodySmall" className="text-gray-500">
                    No positions specified.
                  </Typography>
                )}
              </div>

              {/* Qualifications */}
              <div className="space-y-2">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Qualifications
                </Typography>
                {selectedRequisition.custom_qualifications?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRequisition.custom_qualifications.map((q: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-100"
                      >
                        {q.qualification} ({q.mandatory || "Required"})
                      </span>
                    ))}
                  </div>
                ) : (
                  <Typography variant="bodySmall" className="text-gray-500">
                    No qualifications specified.
                  </Typography>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Required Skills
                </Typography>
                {selectedRequisition.custom_skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRequisition.custom_skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Typography variant="bodySmall" className="text-gray-500">
                    No skills specified.
                  </Typography>
                )}
              </div>

              {/* Pre-Screened Candidates */}
              <div className="space-y-3">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Pre-Screened Candidates
                </Typography>
                {selectedRequisition.custom_pre_screened_candidates?.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Phone</th>
                          <th className="px-4 py-2 text-left">Attachment</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-150 text-gray-900">
                        {selectedRequisition.custom_pre_screened_candidates.map((cand: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2 font-medium">{cand.candidate_name}</td>
                            <td className="px-4 py-2">{cand.email || "—"}</td>
                            <td className="px-4 py-2">{cand.phone || "—"}</td>
                            <td className="px-4 py-2">
                              {cand.cv ? (
                                <a
                                  href={cand.cv}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-semibold"
                                >
                                  View Attachment
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Typography variant="bodySmall" className="text-gray-500">
                    No candidates listed.
                  </Typography>
                )}
              </div>

              {/* Additional Roles & Responsibilities */}
              {selectedRequisition.custom_additional_roles__responsibilities && (
                <div className="space-y-1">
                  <Typography variant="bodyMedium" className="font-bold text-gray-900">
                    Roles & Responsibilities
                  </Typography>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {selectedRequisition.custom_additional_roles__responsibilities}
                  </p>
                </div>
              )}

              {/* Reason for Requesting */}
              {selectedRequisition.reason_for_requesting && (
                <div className="space-y-1">
                  <Typography variant="bodyMedium" className="font-bold text-gray-900">
                    Reason for Requesting
                  </Typography>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {selectedRequisition.reason_for_requesting}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white shrink-0">
              <button
                onClick={() => setSelectedRequisition(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <EditButton requisition={selectedRequisition} onClose={() => setSelectedRequisition(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requisition;