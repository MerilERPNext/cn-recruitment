/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { MdErrorOutline } from "react-icons/md";
import { Typography } from "../../../shared/atoms/Typography";

import {
  useApprovalITDeclaration,
  useTeamApprovalList,
} from "../../../../hooks/payroll/TeamApprovalITDeclaration";

import { useScreenSize } from "../../../../hooks/useScreenSize";
import CardTable from "../../../shared/CardTable";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { useParams } from "react-router-dom";
import { Check, Search, X } from "lucide-react";
import { BulkActionBar } from "../../../Attendance/TeamAttendanceDetails/BulkActionBar";
import Tooltip from "../../../shared/Tooltip";
import Button from "../../../shared/atoms/Button";
import toast from "react-hot-toast";

/* ---------------- Types ---------------- */

type Status = "Pending" | "Approved" | "Rejected" | "Not Submitted";

interface ExemptionItem {
  id: number;
  subCategory: string;
  category: string;
  maxLimit: number;
  actualAmount: number;
  proof?: string;
  status: Status;
  note: string;
  employeeName?: string;
  
}

/* ---------------- Helpers ---------------- */

const formatCurrency = (num: number) =>
  `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/* ---------------- Component ---------------- */

export default function TeamApprovalListExemptionTable() {
  const { isDesktop } = useScreenSize();
  const { proofId = "" } = useParams<{ proofId: string }>();

  const [rows, setRows] = useState<ExemptionItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  /* Search */
  const [searchTerm, setSearchTerm] = useState("");

  /* Modal */
  const [openModal, setOpenModal] = useState(false);
  const [activeRow, setActiveRow] = useState<ExemptionItem | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [comment, setComment] = useState("");

  const [isDirty, setIsDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<Status | null>(null);

  const {
    data: TeamApprovalList,
    isLoading,
    isError,
  } = useTeamApprovalList(proofId || "");

  const mutation = useApprovalITDeclaration();
console.log("coment log", comment)
  /* ---------------- Map API Data ---------------- */

  useEffect(() => {
    if (Array.isArray(TeamApprovalList)) {
      const mapped = TeamApprovalList.map(
        (item: any, index: number): ExemptionItem => ({
          id: index + 1,
          subCategory: item.exemption_sub_category,
          category: item.category,
          maxLimit: Number(item.max_amount || 0),
          actualAmount: Number(item.declared_amount || 0),
          proof: item.attach || "",
          status: item.status || "Pending",
          note: item.note || "",
          employeeName: item.employee_name || item.employee || "",
        })
      );
      setRows(mapped);
    }
  }, [TeamApprovalList]);

  /* ---------------- Filtered List ---------------- */

  const list = useMemo(() => {
    if (!searchTerm) return rows;
  
    const lowerSearch = searchTerm.toLowerCase();
  
    return rows.filter((row) => {
      const subCategory = (row.subCategory || "").toLowerCase();
      const category = (row.category || "").toLowerCase();
  
      return (
        subCategory.includes(lowerSearch) ||
        category.includes(lowerSearch)
      );
    });
  }, [rows, searchTerm]);
  

  const pendingRows = useMemo(
    () => list.filter((r) => r.status === "Pending"),
    [list]
  );

  /* ---------------- Row Click ---------------- */

  const handleRowClick = (row: ExemptionItem) => {
    setActiveRow(row);
    setEditAmount(row.actualAmount);
    setComment(comment);
    setIsDirty(false);
    setOpenModal(true);
  };

  /* ---------------- Selection ---------------- */

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  /* ---------------- Approve / Reject ---------------- */

  const handleStatusChange = async (row: ExemptionItem, status: Status) => {
    try {
      await mutation.mutateAsync({
        empdoc_id: proofId,
        exemption_sub_category: row.subCategory,
        status: status as "Approved" | "Rejected",
        approved_amount: editAmount,
        notes: comment,
      });

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status, actualAmount: editAmount } : r
        )
      );

      setOpenModal(false);
    } catch {
      alert("Failed to update status");
    } finally {
      setEditAmount(0);
      setComment("");
      setIsDirty(false);
    }
  };

  /* ---------------- Bulk Action ---------------- */

  const handleBulkAction = async (status: Status) => {
    if (!selected.length) return toast.error("Select at least one");

    setBulkLoading(true);

    try {
      for (const id of selected) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;

        await mutation.mutateAsync({
          empdoc_id: proofId,
          exemption_sub_category: row.subCategory,
          status: status as "Approved" | "Rejected",
          approved_amount: row.actualAmount,
        });
      }

      setRows((prev) =>
        prev.map((r) => (selected.includes(r.id) ? { ...r, status } : r))
      );

      setSelected([]);
    } catch {
      alert("Bulk update failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const titles = [
    "Select",
    "Sub Category",
    "Category",
    "Max Limit",
    "Actual Amount",
    "Status",
    "Actions",
  ];

  const columnWidths = ["40px", "1.5fr", "1.5fr", "1fr", "1fr", "1fr", "1.5fr"];
  /* ---------------- UI ---------------- */
  const employeeName = useMemo(() => {
    return rows?.[0]?.employeeName || "";
  }, [rows]);
  return (
    <div className="flex flex-col h-full mt-2">
      {/* HEADER */}
      <div className="px-2 pb-2">
        <Typography variant="h4">Team Proof Approval Request</Typography>
        <Typography variant="bodySmall" color="body2">
          Review and manage submitted proofs. <b><span className="font-bold text-black">{employeeName}</span>'s</b> declaration is awaiting your approval. 
        </Typography>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto md:px-2 md:pb-20">
        {isDesktop ? (
          <CardTable titles={titles} columnWidths={columnWidths}>
            {/* SEARCH */}
            <div className="relative flex justify-start w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-100 w-full"
              />
            </div>

            {/* BULK BAR */}
            <BulkActionBar
              selectedIds={selected.map(String)}
              pendingRequests={pendingRows as any}
              columnWidths={columnWidths}
              loadingAction={
                bulkLoading ? { isLoading: true, action: "Approve" } : undefined
              }
              onSelectAll={() =>
                setSelected(
                  selected.length === pendingRows.length
                    ? []
                    : pendingRows.map((r) => r.id)
                )
              }
              onBulkAction={(action: string) => {
                if (action === "Approve") handleBulkAction("Approved");
                if (action === "Reject") handleBulkAction("Rejected");
              }}
            />

            {/* BODY */}
            {isLoading ? (
              <CardSkeleton />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-error">
                <MdErrorOutline size={40} className="mb-2" />
                Error loading data
              </div>
            ) : list.length ? (
              list.map((row) => (
                <div
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className="grid items-center gap-4 px-6 h-16 border-b cursor-pointer"
                  style={{
                    gridTemplateColumns: "40px 1.5fr 1.5fr 1fr 1fr 1fr 1.5fr",
                  }}
                >
                  <input
                    type="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    checked={selected.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {row.subCategory}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {row.category}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {formatCurrency(row.maxLimit)}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {formatCurrency(row.actualAmount)}
                  </Typography>

                  <div className="flex justify-center">
                    <StatusBadge status={row.status} />
                  </div>

                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.status === "Pending" && (
                      <div
                        className="
    h-8
    flex items-center
    gap-1
    px-1
    py-1
    rounded-3xl
    bg-gray-10
    w-fit
  "
                      >
                        {/* APPROVE */}
                        <Tooltip content="Approved" position="top">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusChange(row, "Approved");
                            }}
                            className="
        flex items-center justify-center
        w-7 h-7
        rounded-full
        hover:bg-green-100
        transition-all duration-200
      "
                          >
                            <Check
                              className="w-4 h-4 text-green-600"
                              strokeWidth={2}
                            />
                          </button>
                        </Tooltip>

                        {/* Divider */}
                        <span className="w-px h-4 bg-gray-300" />

                        {/* REJECT */}
                        <Tooltip content="Rejected" position="top">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusChange(row, "Rejected");
                            }}
                            className="
        flex items-center justify-center
        w-7 h-7
        rounded-full
        hover:bg-red-100
        transition-all duration-200
      "
                          >
                            <X
                              className="w-4 h-4 text-red-500"
                              strokeWidth={2}
                            />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No records found
              </div>
            )}
          </CardTable>
        ) : (
          <div className="flex flex-col gap-3  pb-24">
    
          {/* SEARCH */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm"
            />
          </div>
      
          {/* BULK ACTION */}
          {selected.length > 0 && (
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow-sm">
              <span className="text-sm font-medium">
                {selected.length} Selected
              </span>
      
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("Approved")}
                  disabled={bulkLoading}
                  className="text-xs px-3 py-1 rounded bg-success-100 text-success-600"
                >
                  Approve
                </button>
      
                <button
                  onClick={() => handleBulkAction("Rejected")}
                  disabled={bulkLoading}
                  className="text-xs px-3 py-1 rounded bg-error-100 text-error-600"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
      
          {/* LIST */}
          {isLoading ? (
            <CardSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-error">
              <MdErrorOutline size={32} className="mb-2" />
              Error loading data
            </div>
          ) : list.length ? (
            list.map((row) => (
              <div
                key={row.id}
                onClick={() => handleRowClick(row)}
                className="bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3"
              >
                {/* Top Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold">
                      {row.subCategory}
                    </p>
                    <p className="text-xs text-gray-500">
                      {row.category}
                    </p>
                  </div>
      
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    className="w-4 h-4"
                  />
                </div>
      
                {/* Amount Section */}
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Max Limit</p>
                    <p className="font-medium">
                      {formatCurrency(row.maxLimit)}
                    </p>
                  </div>
      
                  <div>
                    <p className="text-gray-500 text-xs">Declared</p>
                    <p className="font-medium">
                      {formatCurrency(row.actualAmount)}
                    </p>
                  </div>
                </div>
      
                {/* Status + Actions */}
                <div className="flex justify-between items-center">
                  <StatusBadge status={row.status} />
      
                  {row.status === "Pending" && (
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          handleStatusChange(row, "Approved")
                        }
                        className="p-2 rounded-full bg-green-100"
                      >
                        <Check
                          className="w-4 h-4 text-green-600"
                          strokeWidth={2}
                        />
                      </button>
      
                      <button
                        onClick={() =>
                          handleStatusChange(row, "Rejected")
                        }
                        className="p-2 rounded-full bg-red-100"
                      >
                        <X
                          className="w-4 h-4 text-red-500"
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-10">
              No records found
            </div>
          )}
        </div>
        )}
      </div>

      {/* ================= MODAL ================= */}

      {openModal && activeRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white w-full h-screen md:h-[90%] md:w-[95%] md:rounded-lg flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-3 border-b">
              <Typography variant="h4">{activeRow?.category}</Typography>
              <Button 
              onClick={() => setOpenModal(false)}
              variant="soft"
              
              ><X/></Button>
            </div>

            {/* BODY */}
            <div className="flex-1 flex flex-col gap-2 md:flex-row">
              {/* PDF */}
              <div className="md:w-[60%] h-full  w-full border-r">
                {activeRow.proof ? (
                  <iframe
                    src={`${activeRow.proof}#toolbar=0`}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    No Proof Uploaded
                  </div>
                )}
              </div>

              {/* FORM */}
              <div className="md:w-[40%] w-full p-6 flex flex-col gap-4">
                <input
                  disabled
                  value={activeRow.subCategory}
                  className="border p-2 rounded bg-gray-100"
                />

                <input
                  disabled
                  value={formatCurrency(activeRow.maxLimit)}
                  className="border p-2 rounded bg-gray-100"
                />

                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => {
                    setEditAmount(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="border p-2 rounded"
                />

                <textarea
                  placeholder="Enter reason (mandatory for reject)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="border p-2 rounded"
                />

            
              </div>
            </div>
            <div className="flex justify-end items-center px-4 py-2 border-b">
              <div className="mt-auto flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (!comment.trim()) {
                        toast.error("Comment mandatory for rejection");
                        return;
                      }
                      if (isDirty) {
                        setPendingAction("Rejected");
                        setShowConfirm(true);
                      } else {
                        handleStatusChange(activeRow, "Rejected");
                      }
                    }}
                    className="bg-error-100 text-error-600 px-4 py-1 rounded-lg"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => {
                      if (isDirty) {
                        setPendingAction("Approved");
                        setShowConfirm(true);
                      } else {
                        handleStatusChange(activeRow, "Approved");
                      }
                    }}
                    className="bg-success-100 text-success-600 px-4 py-1.5 rounded-lg"
                  >
                    Approve
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SAVE / DISCARD */}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[320px]">
            <Typography variant="h4">Unsaved Changes</Typography>
            <p className="mt-2 text-sm">You changed amount. Save or discard?</p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setEditAmount(activeRow!.actualAmount);
                  setIsDirty(false);
                  setShowConfirm(false);
                }}
                className="border px-3 py-1.5 bg-error-100 text-error-600 rounded-lg"
              >
                Discard
              </button>

              <button
                onClick={() => {
                  handleStatusChange(activeRow!, pendingAction!);
                  setShowConfirm(false);
                }}
                className="bg-success-100 text-success-600 px-3 py-1.5 rounded-lg"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
