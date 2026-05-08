/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Employee } from "../../../types/employee";
import SearchableSelect from "../../shared/SearchableSelect";
import { searchEmployeesByQuery } from "../../../utils/searchEmployees";
import { useScreenSize } from "../../../hooks/useScreenSize";


export interface ParticipantRow {
  employee_type?: string;
  name?: string;
  employee_name?: string;
  percentage?: number | null;
  amount?: number | null;
}

export interface EmployeeOption {
  name: string;
  employee_name?: string;
}

export interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  expenseAmount: number;
  editingExpenseId?: string | null;
  expenses?: any[];
  setExpenses?: (updater: (prev: any[]) => any[]) => void;
  currentEmployee?: Employee;
  maxParticipants?: number;
  employeeOptions?: EmployeeOption[];
  employeeOptionsLoading?: boolean;
  onSave?: (participantsFormatted: any[]) => void;
  initialParticipants?: any[];
}

const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  expenseAmount,
  editingExpenseId = null,
  expenses = [],
  setExpenses,
  currentEmployee,
  maxParticipants = 0,
  employeeOptions = [],
  employeeOptionsLoading = false,
  onSave,
  initialParticipants = [],
}) => {
  const [mode, setMode] = useState<"percentage" | "amount">("percentage");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const initializedRef = React.useRef(false);
  const [activeEdit, setActiveEdit] = useState<{
    index: number;
    field: "percentage" | "amount";
    value: string;
  } | null>(null);
  const { isDesktop } = useScreenSize();
  const computeAllocations = React.useCallback((
    rowsIn?: ParticipantRow[],
    m?: "percentage" | "amount"
  ) => {
    const modeToUse = m || mode;
    const rows = Array.isArray(rowsIn)
      ? rowsIn.map((r) => ({ ...(r || {}) }))
      : [];
    const totalAmount = Number(expenseAmount) || 0;

    let totalPercent = 0;
    let totalAllocated = 0;

    const normalized = rows.map((row) => {
      const r: ParticipantRow = { ...(row || {}) };
      if (modeToUse === "percentage") {
        const rawP = r.percentage;
        const p =
          rawP === null || rawP === undefined
            ? 0
            : typeof rawP === "number"
              ? rawP
              : Number(rawP || 0) || 0;
        const amt = +(totalAmount * (p / 100) || 0);
        // Preserve null so the input can show empty
        r.percentage = rawP === null ? null : isNaN(p) ? null : +p;
        r.amount = isNaN(amt) ? null : Number(amt.toFixed(2));
      } else {
        const rawAmt = r.amount;
        const amt =
          rawAmt === null || rawAmt === undefined
            ? 0
            : typeof rawAmt === "number"
              ? rawAmt
              : Number(rawAmt || 0) || 0;
        const p = totalAmount > 0 ? +((amt / totalAmount) * 100) : 0;
        // Preserve null so the input can show empty
        r.amount = rawAmt === null ? null : isNaN(amt) ? null : +amt;
        r.percentage = isNaN(p) ? null : +p.toFixed(2);
      }
      totalPercent += Number(r.percentage || 0);
      totalAllocated += Number(r.amount || 0);
      return r;
    });

    return {
      mode: modeToUse,
      participants: normalized,
      totals: {
        totalAmount,
        totalPercent: +totalPercent.toFixed(2),
        totalAllocated: +totalAllocated.toFixed(2),
      },
    };
  }, [mode, expenseAmount]);

  const ensureFirstRowSelf = React.useCallback((rows: ParticipantRow[] = []) => {
    const first: ParticipantRow = {
      employee_type: "Self",
      name:
        currentEmployee?.name ||
        currentEmployee?.employee_name ||
        rows?.[0]?.name ||
        "Self",
      percentage: rows?.[0]?.percentage != null ? rows[0].percentage : 100,
      amount:
        rows?.[0]?.amount != null
          ? rows[0].amount
          : +(Number(expenseAmount || 0).toFixed(2) || 0),
    };
    const rest = Array.isArray(rows) && rows.length > 1 ? rows.slice(1) : [];
    return [first, ...rest];
  }, [currentEmployee, expenseAmount]);

  useEffect(() => {
    if (!isOpen) {
      setActiveEdit(null);
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    if (editingExpenseId && Array.isArray(expenses)) {
      const e = expenses.find((x) => x.id === editingExpenseId || x.uid === editingExpenseId);
      if (e && Array.isArray(e.participants) && e.participants.length > 0) {
        const comp = computeAllocations(
          ensureFirstRowSelf(e.participants),
          "percentage"
        );
        setParticipants(comp.participants);
        return;
      }
    }

    if (initialParticipants && initialParticipants.length > 0) {
      const mapped = initialParticipants.map(p => {
        if (p.employee_type === "Guest") {
          return {
            employee_type: "Guest",
            name: p.guest_name || p.name || "",
            percentage: p.percentage,
            amount: p.amount ?? p.allocated_amount
          };
        }
        return {
          employee_type: p.employee_type || "Employee",
          name: p.employee || p.name || "",
          employee_name: p.employee_name || "",
          percentage: p.percentage,
          amount: p.amount ?? p.allocated_amount
        };
      });
      const comp = computeAllocations(ensureFirstRowSelf(mapped), "percentage");
      setParticipants(comp.participants);
    } else {
      const seed: ParticipantRow = {
        employee_type: "Self",
        name: currentEmployee?.name || currentEmployee?.employee_name || "Self",
        percentage: 100,
        amount: +(Number(expenseAmount || 0).toFixed(2) || 0),
      };
      const comp = computeAllocations([seed], "percentage");
      setParticipants(comp.participants);
    }
  }, [isOpen, editingExpenseId, expenses, expenseAmount, currentEmployee, initialParticipants, computeAllocations, ensureFirstRowSelf]);

  const handleSearch = React.useCallback(async (q: string) => {
    const res = await searchEmployeesByQuery(q);
    return res.filter((op) => op.value !== currentEmployee?.name);
  }, [currentEmployee?.name]);

  const computed = useMemo(
    () => computeAllocations(participants, mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [participants, expenseAmount, mode]
  );

  const addRow = () => {
    const limit = maxParticipants || 5;
    if (participants.length >= limit) {
      toast.error(`Max. Allowed Participant - ${limit}`);
      return;
    }
    const newRow: ParticipantRow = {
      employee_type: "Employee",
      name: "",
      percentage: mode === "percentage" ? 0 : null,
      amount: mode === "amount" ? 0 : null,
    };
    const next = [...participants, newRow];
    const normalized = ensureFirstRowSelf(next);
    setParticipants(computeAllocations(normalized, mode).participants);
  };

  const removeRow = (index: number) => {
    if (index === 0) {
      toast.error("Cannot remove Self row.");
      return;
    }
    const next = participants.filter((_, i) => i !== index);
    const normalized = ensureFirstRowSelf(next);
    setParticipants(computeAllocations(normalized, mode).participants);
  };

  const sumPercentExcluding = (excludeIndex: number) => {
    return participants.reduce((acc, r, idx) => {
      if (idx === excludeIndex) return acc;
      return acc + (Number(r.percentage) || 0);
    }, 0);
  };
  const sumAmountExcluding = (excludeIndex: number) => {
    return participants.reduce((acc, r, idx) => {
      if (idx === excludeIndex) return acc;
      return acc + (Number(r.amount) || 0);
    }, 0);
  };

  const updateRow = (index: number, patch: Partial<ParticipantRow>) => {
    const EPS = 0.0001;

    if (patch.percentage !== undefined) {
      const newPct =
        patch.percentage === null ? 0 : Number(patch.percentage || 0);
      const otherSum = sumPercentExcluding(index);
      const prospectiveTotal = otherSum + newPct;
      if (prospectiveTotal - 100 > EPS) {
        toast.error("Total percentage cannot exceed 100%.");
        return;
      }
    }

    if (patch.amount !== undefined) {
      const newAmt = patch.amount === null ? 0 : Number(patch.amount || 0);
      const otherSumAmt = sumAmountExcluding(index);
      const prospectiveAmtTotal = otherSumAmt + newAmt;
      const totalAvailable = Number(expenseAmount) || 0;
      if (prospectiveAmtTotal - totalAvailable > 0.01) {
        toast.error(
          "Total allocated amount cannot exceed total expense amount."
        );
        return;
      }
    }

    if (index === 0) {
      const sanitized = {
        ...participants[0],
        employee_type: "Self",
        name:
          currentEmployee?.name ||
          currentEmployee?.employee_name ||
          participants[0].name ||
          "Self",
        percentage:
          patch.percentage !== undefined
            ? patch.percentage
            : participants[0].percentage,
        amount:
          patch.amount !== undefined ? patch.amount : participants[0].amount,
      };
      const next = [sanitized, ...participants.slice(1)];
      setParticipants(computeAllocations(next, mode).participants);
      return;
    }
    const next = participants.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    );
    const normalized = ensureFirstRowSelf(next);
    setParticipants(computeAllocations(normalized, mode).participants);
  };

  const resetParticipants = () => {
    const seed: ParticipantRow = {
      employee_type: "Self",
      name: currentEmployee?.name || currentEmployee?.employee_name || "Self",
      percentage: 100,
      amount: +(Number(expenseAmount || 0).toFixed(2) || 0),
    };
    setMode("percentage");
    setParticipants(computeAllocations([seed], "percentage").participants);
  };

  const buildFormattedParticipants = (): any[] => {
    const totalAmount = Number(expenseAmount) || 0;

    return participants.map((r) => {
      const type = (r.employee_type || "").toLowerCase();

      if (type === "guest") {
        const percent = r.percentage ?? null;
        const amt =
          percent !== null && percent !== undefined
            ? +(totalAmount * (Number(percent) / 100)).toFixed(2)
            : r.amount ?? null;

        return {
          employee_type: "Guest",
          guest_name: r.name || "",
          percentage: percent,
          amount: amt,
        };
      }

      const employeeId =
        r.name ||
        (r.employee_type === "Self"
          ? currentEmployee?.name || currentEmployee?.employee_name
          : r.name) ||
        "";
      const employeeName =
        r.employee_name ||
        (r.employee_type === "Self"
          ? currentEmployee?.employee_name
          : r.name) ||
        "";

      const percent = r.percentage ?? null;
      const amt =
        r.amount != null
          ? Number(r.amount)
          : percent != null
            ? +(totalAmount * (Number(percent) / 100) || 0).toFixed(2)
            : null;

      return {
        employee_type: r.employee_type === "Self" ? "Self" : "Employee",
        employee: employeeId,
        employee_name: employeeName,
        percentage: percent,
        amount: amt,
      };
    });
  };

  const saveParticipants = () => {
    for (let i = 0; i < participants.length; i++) {
      const row = participants[i];
      const idx = i + 1;

      if (!row.employee_type) {
        toast.error(`Row ${idx}: Employee type is required.`);
        return;
      }

      if (row.employee_type === "Self" || row.employee_type === "Employee") {
        const val = row.name ?? "";
        if (String(val).trim() === "") {
          toast.error(
            `Row ${idx}: ${row.employee_type === "Self" ? "Self" : "Employee"
            } must have an employee selected.`
          );
          return;
        }
      }

      if (row.employee_type === "Guest") {
        const val = row.name ?? "";
        if (String(val).trim() === "") {
          toast.error(`Row ${idx}: Guest name is required.`);
          return;
        }
      }

      if (mode === "percentage") {
        const p = Number(row.percentage);
        if (
          row.percentage === null ||
          row.percentage === undefined ||
          !Number.isFinite(p) ||
          p <= 0
        ) {
          toast.error(`Row ${idx}: Percentage must be greater than 0.`);
          return;
        }
      } else {
        const a = Number(row.amount);
        if (
          row.amount === null ||
          row.amount === undefined ||
          !Number.isFinite(a) ||
          a <= 0
        ) {
          toast.error(`Row ${idx}: Amount must be greater than 0.`);
          return;
        }
      }
    }

    const totals = computeAllocations(participants, mode).totals;

    if (mode === "percentage" && expenseAmount > 0) {
      if (Math.abs(totals.totalPercent - 100) > 0.01) {
        toast.error("Allocated percentage must total 100%.");
        return;
      }
    }
    if (mode === "amount") {
      if (Math.abs(totals.totalAllocated - expenseAmount) > 0.5) {
        toast.error("Allocated amount must equal the total amount.");
        return;
      }
    }

    if (editingExpenseId && typeof setExpenses === "function") {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingExpenseId ? { ...e, participants } : e
        )
      );
    }

    const formatted = buildFormattedParticipants();
    try {
      if (onSave) onSave(formatted);
    } catch (err) {
      console.warn("onSave handler threw:", err);
    }

    toast.success("Participants saved.");
    onClose();
  };

  if (!isOpen) return null;

  const optionsSource =
    employeeOptions && employeeOptions.length > 0 ? employeeOptions : [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 h-full z-50 w-full lg:max-w-[60vw] xl:max-w-[50vw] 2xl:max-w-[45vw] transform transition-transform duration-300 ease-out bg-white shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">Participants</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-20 space-y-6">
          {/* Summary Card */}
          <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total amount</div>
                <div className="text-lg font-bold text-gray-900">
                  INR {Number(expenseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Allocated percentage</div>
                <div className="text-lg font-bold text-gray-900">
                  {computed.totals.totalPercent ?? 0}%
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Allocated amount</div>
                <div className="text-lg font-bold text-gray-900">
                  INR {computed.totals.totalAllocated?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
                </div>
              </div>
            </div>

            {/* Alert */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-xl">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <p className="text-xs font-semibold text-[#92400e] leading-relaxed">
                Select radio button to edit Percentage or Amount — you can edit only one at a time.
              </p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="flex items-center gap-8 px-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="mode"
                  value="percentage"
                  checked={mode === "percentage"}
                  onChange={() => {
                    setMode("percentage");
                    setParticipants((prev) => computeAllocations(prev, "percentage").participants);
                  }}
                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-600 transition-all cursor-pointer"
                />
                <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Percentage</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="mode"
                  value="amount"
                  checked={mode === "amount"}
                  onChange={() => {
                    setMode("amount");
                    setParticipants((prev) => computeAllocations(prev, "amount").participants);
                  }}
                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-600 transition-all cursor-pointer"
                />
                <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Amount</span>
            </label>
          </div>

          {/* Participants Table Grid */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[750px]">
              <div className="grid grid-cols-[30px_140px_1fr_80px_110px_60px] gap-4 mb-4 px-2">
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">#</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Employee Type</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Name</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">%</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Amount (INR)</div>
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right pr-1">Actions</div>
              </div>

              <div className="space-y-4">
                {participants.length > 0 ? (
                  participants.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[30px_140px_1fr_80px_110px_60px] items-center gap-4 px-2 group"
                    >
                      <div className="text-xs text-gray-400 font-medium">{i + 1}</div>

                      <div>
                        {i === 0 ? (
                          <div className="w-full p-2.5 border border-gray-200 bg-[#f1f5f9] rounded-lg text-sm text-gray-700 font-medium">
                            Self
                          </div>
                        ) : (
                          <select
                            value={row.employee_type || "Employee"}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(i, { employee_type: val, name: "" });
                            }}
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer bg-white"
                          >
                            <option value="Employee">Employee</option>
                            <option value="Guest">Guest</option>
                          </select>
                        )}
                      </div>

                      <div className="min-w-0">
                        {i === 0 ? (
                          <div className="w-full p-2.5 border border-gray-200 bg-[#f1f5f9] rounded-lg text-sm text-gray-700 font-medium truncate">
                            {(() => {
                              const id = row.name || currentEmployee?.name || "";
                              const found = optionsSource.find((o) => o.name === id);
                              const name = found?.employee_name ?? currentEmployee?.employee_name ?? id ?? "Self";
                              return name && id ? `${name} (${id})` : name || id || "Self";
                            })()}
                          </div>
                        ) : row.employee_type === "Employee" ? (
                          employeeOptionsLoading ? (
                            <div className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 flex items-center">
                              <span className="animate-pulse">Loading...</span>
                            </div>
                          ) : (
                            <SearchableSelect
                              options={optionsSource
                                .filter((opt) => opt.name !== currentEmployee?.name)
                                .map((opt) => ({
                                  value: opt.name,
                                  label: opt.employee_name ? `${opt.employee_name} (${opt.name})` : opt.name,
                                }))}
                              value={row.name || ""}
                              onChange={(value, label) =>
                                updateRow(i, {
                                  name: value,
                                  employee_name: label,
                                })
                              }
                              placeholder="Search employee..."
                              disabled={false}
                              onSearch={handleSearch}
                            />
                          )
                        ) : (
                          <input
                            type="text"
                            value={row.name || ""}
                            onChange={(e) => updateRow(i, { name: e.target.value })}
                            placeholder="Guest name"
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          />
                        )}
                      </div>

                      <div className="text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            activeEdit?.index === i && activeEdit?.field === "percentage"
                              ? activeEdit.value
                              : row.percentage !== null && row.percentage !== undefined
                                ? row.percentage
                                : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setActiveEdit({ index: i, field: "percentage", value: v });
                              updateRow(i, { percentage: null });
                              return;
                            }
                            const regex = /^\d*\.?\d{0,2}$/;
                            if (!regex.test(v)) return;
                            
                            setActiveEdit({ index: i, field: "percentage", value: v });
                            const parsed = parseFloat(v);
                            if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
                            updateRow(i, { percentage: parsed });
                          }}
                          onBlur={(e) => {
                            setActiveEdit(null);
                            const val = row.percentage;
                            if (val !== null && val !== undefined) {
                              e.target.value = String(val);
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            setActiveEdit({
                              index: i,
                              field: "percentage",
                              value: e.target.value,
                            });
                          }}
                          disabled={mode !== "percentage"}
                          placeholder="0"
                          className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${mode !== "percentage" ? "bg-gray-50 text-gray-400" : "bg-white text-gray-700 font-medium"}`}
                        />
                      </div>

                      <div className="text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            activeEdit?.index === i && activeEdit?.field === "amount"
                              ? activeEdit.value
                              : row.amount !== null && row.amount !== undefined
                                ? row.amount
                                : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setActiveEdit({ index: i, field: "amount", value: v });
                              updateRow(i, { amount: null });
                              return;
                            }
                            const regex = /^\d*\.?\d{0,2}$/;
                            if (!regex.test(v)) return;
                            
                            setActiveEdit({ index: i, field: "amount", value: v });
                            const parsed = parseFloat(v);
                            if (isNaN(parsed) || parsed < 0) return;
                            updateRow(i, { amount: parsed });
                          }}
                          onBlur={(e) => {
                            setActiveEdit(null);
                            const val = row.amount;
                            if (val !== null && val !== undefined) {
                              e.target.value = String(val);
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select();
                            setActiveEdit({
                              index: i,
                              field: "amount",
                              value: e.target.value,
                            });
                          }}
                          disabled={mode !== "amount"}
                          placeholder="0"
                          className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${mode !== "amount" ? "bg-gray-50 text-gray-400" : "bg-white text-gray-700 font-medium"}`}
                        />
                      </div>

                      <div className="flex justify-end pr-1">
                        {i !== 0 && (
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="p-2 rounded-lg text-red-400 hover:text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                            title="Remove Participant"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-gray-400 text-sm">No participants added yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 px-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Max. Allowed Participant - {maxParticipants}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <button
            onClick={addRow}
            type="button"
            disabled={participants.length >= (maxParticipants || 5)}
            className={`flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${
              participants.length >= (maxParticipants || 5)
                ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="text-lg leading-none">+</span>
            <span>{isDesktop ? "Add Participant" : "Participant"}</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={resetParticipants}
              type="button"
              disabled={participants.length <= 1}
              className={`px-6 py-2.5 text-sm font-bold border rounded-xl transition-colors ${
                participants.length <= 1
                  ? "border-gray-100 text-gray-300 cursor-not-allowed"
                  : "border-gray-200 text-[#64748b] hover:text-gray-900"
              }`}
            >
              Reset
            </button>
            <button
              onClick={saveParticipants}
              type="button"
              disabled={participants.length <= 1}
              className={`px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                participants.length <= 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-primary text-white hover:bg-primary-600 shadow-blue-500/20"
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};


export default ParticipantsDrawer;
