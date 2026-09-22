import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Eye,
  Edit,
  AlertTriangle,
  RefreshCw,
  X,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useNewHiresList,
  useActivateEmployeeMutation,
  useNewHireDetail,
  useUpdateNewHireMutation,
} from "../../../hooks/useNewHire";
import type { NewHireRow } from "../../../types/newHire";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import TableSkeleton from "../../shared/molecules/Skeletons/TableSkeleton";
import NoDataFound from "../../shared/atoms/NoDataFound";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { formatCurrency } from "../../../utils/currency";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

const getStageBadgeColor = (stage?: string) => {
  switch (stage) {
    case "Draft":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "Pending Approval":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Onboarding Initiated":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-500 border-gray-300";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const NewHiresList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  // Search & Pagination state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  // Query
  const { data: listData, isLoading, isError, error, refetch } = useNewHiresList({
    search: searchTerm || undefined,
    start: page * pageSize,
    page_length: pageSize,
    order_by: "creation desc",
  });

  // Mutations
  const { mutateAsync: activateEmployee, isPending: isActivating } = useActivateEmployeeMutation();
  const { mutateAsync: updateNewHire, isPending: isUpdating } = useUpdateNewHireMutation();

  // Modals state
  const [candidateToActivate, setCandidateToActivate] = useState<NewHireRow | null>(null);
  const [activationEmail, setActivationEmail] = useState<string>("");
  const [selectedCandidateName, setSelectedCandidateName] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<NewHireRow | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  // Fetch detail for modal
  const { data: detailData, isLoading: isDetailLoading } = useNewHireDetail(selectedCandidateName || undefined);

  const rows = listData?.data?.rows || [];
  const total = listData?.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Dynamic editable columns from API
  const editableColumns = useMemo(() => {
    const rawCols = listData?.data?.columns || [];
    const nonEditable = new Set(["name", "custom_new_hire_stage", "status"]);
    const filtered = rawCols.filter((col) => !nonEditable.has(col.fieldname));

    if (filtered.length > 0) {
      return filtered;
    }

    return [
      { fieldname: "employee_name", label: "Employee Name", value_key: "employee_name" },
      { fieldname: "designation", label: "Designation", value_key: "designation" },
      { fieldname: "department", label: "Department", value_key: "department" },
      { fieldname: "company", label: "Company", value_key: "company" },
      { fieldname: "employment_type", label: "Employment Type", value_key: "employment_type" },
      { fieldname: "date_of_joining", label: "Date of Joining", value_key: "date_of_joining" },
    ];
  }, [listData?.data?.columns]);

  const handleOpenEdit = (row: NewHireRow) => {
    const fields: Record<string, string> = {};
    editableColumns.forEach((col) => {
      const val = row[col.fieldname] ?? row[col.value_key] ?? "";
      fields[col.fieldname] = String(val ?? "");
    });
    // Also capture phone/email if present on row
    if (row.cell_number !== undefined && !fields.cell_number) {
      fields.cell_number = String(row.cell_number || "");
    }
    if (row.personal_email !== undefined && !fields.personal_email) {
      fields.personal_email = String(row.personal_email || "");
    }
    setEditingCandidate(row);
    setEditFields(fields);
  };

  // Actions
  const openActivate = (row: NewHireRow) => {
    setCandidateToActivate(row);
    setActivationEmail(String(row.company_email || ""));
  };

  const closeActivate = () => {
    setCandidateToActivate(null);
    setActivationEmail("");
  };

  const isActivationEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activationEmail.trim());

  const handleActivate = async () => {
    // Enter in the email field submits the form even while the button is loading.
    if (!candidateToActivate || isActivating) return;
    const companyEmail = activationEmail.trim();
    if (!companyEmail) {
      toast.error("Please enter the company email.");
      return;
    }
    if (!isActivationEmailValid) {
      toast.error("Please enter a valid company email.");
      return;
    }
    try {
      const res = await activateEmployee({ name: candidateToActivate.name, companyEmail });
      const newName = res?.data?.name || candidateToActivate.name;
      toast.success(
        res?.data?.renamed
          ? `Employee activated successfully! Renamed to ${newName}.`
          : `Employee ${newName} is now active.`
      );
      closeActivate();
      refetch();
    } catch (err) {
      toast.error(errorResponseFormater(err, "Failed to activate employee."));
    }
  };

  const handleSaveEdit = async (submit: number = 0) => {
    if (!editingCandidate) return;
    try {
      await updateNewHire({
        name: editingCandidate.name,
        payload: editFields,
        submit,
      });
      toast.success(
        submit === 1
          ? `Updated and submitted ${editingCandidate.name} for approval!`
          : `Updated ${editingCandidate.name} successfully.`
      );
      setEditingCandidate(null);
      refetch();
    } catch (err) {
      toast.error(errorResponseFormater(err, "Failed to update employee details."));
    }
  };

  // Header content
  const headerContent = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 mb-6 bg-white px-4 py-3 rounded-xl shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/webapp/employees-directory")}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Employee Directory"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Typography variant="h3" color="title">
              New Hires (Pending Intakes)
            </Typography>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-primary-50 text-primary border border-primary-200">
              {total} Total
            </span>
          </div>
          <Typography variant="bodySmall" color="secondary">
            Review pending new hire records and activate joining employees with their company email.
          </Typography>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="contain"
          size="md"
          onClick={() => navigate("/webapp/employees-directory/add-employee")}
          icon={<UserPlus className="w-4 h-4" />}
          className="shadow-xs font-semibold"
        >
          New Recruit
        </Button>
      </div>
    </div>
  );

  // Render list content
  const renderList = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <TableSkeleton columns={7} rows={6} />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center my-6">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-600 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <Typography variant="h3" color="title" className="mb-2 font-bold">
            Failed to Load New Hires
          </Typography>
          <Typography variant="body" color="secondary" className="max-w-md mb-6">
            {error instanceof Error ? error.message : "Unable to fetch pending new hire employees."}
          </Typography>
          <div className="flex items-center gap-3">
            <Button
              variant="contain"
              size="md"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => refetch()}
            >
              Try Again
            </Button>
            <Button
              variant="subtle"
              size="md"
              onClick={() => navigate("/webapp/employees-directory")}
            >
              Back to Directory
            </Button>
          </div>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <NoDataFound
            title="No New Hires Found"
            subtitle={
              searchTerm
                ? "No pending employees match your search criteria."
                : "No pending new hire employees found. Click 'New Recruit' to add one."
            }
            onClick={() => navigate("/webapp/employees-directory/add-employee")}
          />
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-700">
              <tr>
                <th className="py-3.5 px-4">Pending ID</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Designation & Dept</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Date of Joining</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const stage = row.custom_new_hire_stage || "Draft";
                const canActivate = Boolean(row.can_activate);
                const isEditable = stage === "Draft" || stage === "Rejected";

                return (
                  <tr
                    key={row.name}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedCandidateName(row.name)}
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-primary">
                      {row.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {row.employee_name || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{row.designation || "—"}</div>
                      <div className="text-xs text-gray-500">{row.department || ""}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 text-xs">{row.company || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                      {row.date_of_joining ? formatToIndianDate(row.date_of_joining) : "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${getStageBadgeColor(
                          stage
                        )}`}
                      >
                        {stage}
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Activate Employee (once submitted) */}
                        {canActivate && (
                          <Button
                            variant="contain"
                            size="md"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
                            icon={<UserCheck className="w-3.5 h-3.5" />}
                            onClick={() => openActivate(row)}
                            loading={isActivating && candidateToActivate?.name === row.name}
                          >
                            Activate Employee
                          </Button>
                        )}

                        {/* 2. Edit (when Draft or Rejected) */}
                        {isEditable && (
                          <Button
                            variant="subtle"
                            size="md"
                            icon={<Edit className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenEdit(row)}
                          >
                            Edit
                          </Button>
                        )}

                        {/* 3. View Details */}
                        <button
                          onClick={() => setSelectedCandidateName(row.name)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 text-sm text-gray-600 bg-gray-50">
            <div>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="subtle"
                size="md"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-semibold">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="subtle"
                size="md"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isDesktop ? (
        <DesktopLayoutWrapper title="New Hires">
          <div className="max-w-7xl mx-auto w-full p-6">
            {headerContent}

            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidate name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-hidden transition-all"
                />
              </div>
            </div>

            {renderList()}
          </div>
        </DesktopLayoutWrapper>
      ) : (
        <div className="flex flex-col min-h-screen bg-gray-50">
          <HeaderBar
            title="New Hires"
            showBackButton={true}
            onBack={() => navigate("/webapp/employees-directory")}
          />
          <main className="flex-grow p-4">
            {headerContent}
            <div className="relative w-full mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-hidden transition-all"
              />
            </div>
            {renderList()}
          </main>
        </div>
      )}

      {/* Activate Employee: asks for the company email */}
      {candidateToActivate &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isActivating) closeActivate();
            }}
          >
            <form
              className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleActivate();
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Typography variant="h3" color="title">
                    Activate Employee
                  </Typography>
                  <Typography variant="bodySmall" color="secondary">
                    {candidateToActivate.employee_name} ({candidateToActivate.name})
                  </Typography>
                </div>
                <button
                  type="button"
                  onClick={closeActivate}
                  disabled={isActivating}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="flex flex-col">
                <label htmlFor="activation-company-email" className="text-xs font-bold text-gray-700 mb-1">
                  Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="activation-company-email"
                  type="email"
                  autoFocus
                  required
                  placeholder="name@company.com"
                  value={activationEmail}
                  onChange={(e) => setActivationEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This assigns the official employee code and marks the employee as Active.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="subtle" size="md" onClick={closeActivate} disabled={isActivating}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contain"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  icon={<UserCheck className="w-4 h-4" />}
                  loading={isActivating}
                  disabled={!isActivationEmailValid}
                >
                  Activate Employee
                </Button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Detail View Drawer / Modal */}
      {selectedCandidateName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedCandidateName(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Typography variant="h3" color="title">
                    {detailData?.data?.employee_name || selectedCandidateName}
                  </Typography>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${getStageBadgeColor(
                      detailData?.data?.custom_new_hire_stage
                    )}`}
                  >
                    {detailData?.data?.custom_new_hire_stage || "Draft"}
                  </span>
                </div>
                <div className="font-mono text-xs text-primary">{selectedCandidateName}</div>
              </div>

              <button
                onClick={() => setSelectedCandidateName(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">Company</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.company || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Department</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.department || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Designation</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.designation || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Employment Type</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.employment_type || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Company Email</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.company_email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Personal Email</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.personal_email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Mobile Number</span>
                    <span className="font-medium text-gray-800">{detailData?.data?.cell_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Date of Joining</span>
                    <span className="font-medium text-gray-800">
                      {detailData?.data?.date_of_joining ? formatToIndianDate(detailData.data.date_of_joining) : "—"}
                    </span>
                  </div>
                  {detailData?.data?.ctc && (
                    <div>
                      <span className="text-xs text-gray-500 block">CTC</span>
                      <span className="font-medium text-gray-800">{formatCurrency(Number(detailData.data.ctc))}</span>
                    </div>
                  )}
                </div>


                {/* Action in Modal */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  {detailData?.data?.can_activate && (
                    <Button
                      variant="contain"
                      size="md"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      icon={<UserCheck className="w-4 h-4" />}
                      onClick={() => {
                        openActivate(detailData.data);
                        setSelectedCandidateName(null);
                      }}
                    >
                      Activate Employee
                    </Button>
                  )}

                  <Button variant="subtle" size="md" onClick={() => setSelectedCandidateName(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Edit Modal (for Draft/Rejected) */}
      {editingCandidate &&
        createPortal(
          <div
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 m-0"
            onClick={() => setEditingCandidate(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-4 border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Typography variant="h3" color="title" className="font-bold text-gray-900">
                    Edit New Recruit
                  </Typography>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-primary-50 text-primary border border-primary-200">
                    {editingCandidate.name}
                  </span>
                </div>
                <button
                  onClick={() => setEditingCandidate(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
                {editableColumns.map((col) => {
                  const isDateField = col.fieldname.toLowerCase().includes("date");
                  const isEmailField = col.fieldname.toLowerCase().includes("email");
                  const isPhoneField =
                    col.fieldname.toLowerCase().includes("phone") ||
                    col.fieldname.toLowerCase().includes("cell");

                  return (
                    <div key={col.fieldname} className="flex flex-col">
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        {col.label}
                      </label>
                      <input
                        type={isDateField ? "date" : isEmailField ? "email" : isPhoneField ? "tel" : "text"}
                        value={editFields[col.fieldname] ?? ""}
                        onChange={(e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            [col.fieldname]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
                <Button variant="subtle" size="md" onClick={() => setEditingCandidate(null)}>
                  Cancel
                </Button>
                <Button
                  variant="contain"
                  size="md"
                  onClick={() => handleSaveEdit(0)}
                  loading={isUpdating}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default NewHiresList;
