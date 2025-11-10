/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Employee } from "../../../types/employee";
import SearchableSelect from "../../shared/SearchableSelect";

export interface ParticipantRow {
  employee_type?: string;
  name?: string;
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
  expenses: any[];
  setExpenses: (updater: (prev: any[]) => any[]) => void;
  currentEmployee?: Employee;
  maxParticipants?: number;
  employeeOptions?: EmployeeOption[];
  employeeOptionsLoading?: boolean;
  onSave?: (participantsFormatted: any[]) => void;
}

const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  expenseAmount,
  editingExpenseId = null,
  expenses,
  setExpenses,
  currentEmployee,
  maxParticipants = 5,
  employeeOptions = [],
  employeeOptionsLoading = false,
  onSave,
}) => {
  const [mode, setMode] = useState<"percentage" | "amount">("percentage");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  const computeAllocations = (
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
        const p =
          typeof r.percentage === "number"
            ? r.percentage
            : Number(r.percentage || 0) || 0;
        const amt = +(totalAmount * (p / 100) || 0);
        r.percentage = isNaN(p) ? null : +p;
        r.amount = isNaN(amt) ? null : Number(amt.toFixed(2));
      } else {
        const amt =
          typeof r.amount === "number" ? r.amount : Number(r.amount || 0) || 0;
        const p = totalAmount > 0 ? +((amt / totalAmount) * 100) : 0;
        r.amount = isNaN(amt) ? null : +amt;
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
  };

  const ensureFirstRowSelf = (rows: ParticipantRow[] = []) => {
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
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editingExpenseId) {
      const e = expenses.find((x) => x.id === editingExpenseId);
      if (e && Array.isArray(e.participants) && e.participants.length > 0) {
        const comp = computeAllocations(
          ensureFirstRowSelf(e.participants),
          "percentage"
        );
        setMode(comp.mode);
        setParticipants(comp.participants);
        return;
      }
    }

    setParticipants((prev) => {
      if (prev.length > 0) {
        return computeAllocations(ensureFirstRowSelf(prev), "percentage")
          .participants;
      }
      const seed: ParticipantRow = {
        employee_type: "Self",
        name: currentEmployee?.name || currentEmployee?.employee_name || "Self",
        percentage: 100,
        amount: +(Number(expenseAmount || 0).toFixed(2) || 0),
      };
      const comp = computeAllocations([seed], "percentage");
      setMode(comp.mode);
      return comp.participants;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingExpenseId, expenses, expenseAmount, currentEmployee]);

  const computed = useMemo(
    () => computeAllocations(participants, mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [participants, expenseAmount, mode]
  );

  const addRow = () => {
    if (participants.length >= maxParticipants) {
      toast.error(`Max. Allowed Participant - ${maxParticipants}`);
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
            `Row ${idx}: ${
              row.employee_type === "Self" ? "Self" : "Employee"
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
        if (
          row.percentage === null ||
          row.percentage === undefined ||
          !Number.isFinite(Number(row.percentage))
        ) {
          toast.error(`Row ${idx}: Percentage is required.`);
          return;
        }
      } else {
        if (
          row.amount === null ||
          row.amount === undefined ||
          !Number.isFinite(Number(row.amount))
        ) {
          toast.error(`Row ${idx}: Amount is required.`);
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

    if (editingExpenseId) {
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
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 h-full z-50 w-full lg:max-w-1/2 transform transition-transform duration-300 ease-out bg-white border-l shadow-lg"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Participants</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          <div className="border rounded p-3 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="text-xs text-gray-500">Total amount</div>
                <div className="text-lg font-semibold">
                  INR {Number(expenseAmount || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 text-center">
                  Allocated percentage
                </div>
                <div className="text-lg font-semibold text-center">
                  {computed.totals.totalPercent ?? 0}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 text-right">
                  Allocated amount
                </div>
                <div className="text-lg font-semibold text-right">
                  INR {computed.totals.totalAllocated?.toFixed(2) ?? "0.00"}
                </div>
              </div>
            </div>
            <div className="text-xs text-orange-600 mt-2">
              ⚠️ Select radio button to edit Percentage or Amount — you can edit
              only one at a time.
            </div>
          </div>

          <div className="mb-4">
            <label className="inline-flex items-center mr-4">
              <input
                type="radio"
                name="mode"
                value="percentage"
                checked={mode === "percentage"}
                onChange={() => {
                  setMode("percentage");
                  setParticipants(
                    (prev) =>
                      computeAllocations(prev, "percentage").participants
                  );
                }}
                className="mr-2"
              />
              Percentage
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="mode"
                value="amount"
                checked={mode === "amount"}
                onChange={() => {
                  setMode("amount");
                  setParticipants(
                    (prev) => computeAllocations(prev, "amount").participants
                  );
                }}
                className="mr-2"
              />
              Amount
            </label>
          </div>

          <div className="w-full">
            <div className="grid grid-cols-[40px_140px_1fr_80px_120px_80px] text-xs font-medium text-gray-600 border-b pb-2 mb-2">
              <div>#</div>
              <div>Employee Type</div>
              <div>Name</div>
              <div>%</div>
              <div>Amount (INR)</div>
              <div className="text-center">Actions</div>
            </div>

            {participants.length > 0 ? (
              participants.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[40px_140px_1fr_80px_120px_80px] items-start gap-2 py-2 border-b"
                >
                  <div className="text-sm pt-2">{i + 1}</div>

                  <div>
                    {i === 0 ? (
                      <input
                        type="text"
                        readOnly
                        value="Self"
                        className="w-full p-1 border bg-gray-100 rounded text-sm"
                      />
                    ) : (
                      <select
                        value={row.employee_type || "Employee"}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateRow(i, { employee_type: val, name: "" });
                        }}
                        className="w-full p-1 border rounded text-sm"
                      >
                        <option value="Employee">Employee</option>
                        <option value="Guest">Guest</option>
                      </select>
                    )}
                  </div>

                  <div>
                    {i === 0 ? (
                      <input
                        type="text"
                        readOnly
                        value={(() => {
                          const id =
                            row.name ||
                            currentEmployee?.name ||
                            currentEmployee?.employee_name ||
                            "";
                          const found = optionsSource.find(
                            (o) => o.name === id
                          );
                          return (
                            found?.employee_name ??
                            currentEmployee?.employee_name ??
                            id ??
                            "Self"
                          );
                        })()}
                        className="w-full p-1 border bg-gray-100 rounded text-sm"
                      />
                    ) : row.employee_type === "Employee" ? (
                      employeeOptionsLoading ? (
                        <input
                          type="text"
                          disabled
                          value="Loading..."
                          className="w-full p-1 border rounded text-sm bg-gray-100"
                        />
                      ) : optionsSource && optionsSource.length > 0 ? (
                        <SearchableSelect
                          options={optionsSource.map((opt) => ({
                            value: opt.name,
                            label: opt.employee_name ?? opt.name,
                          }))}
                          value={row.name || ""}
                          onChange={(value) => updateRow(i, { name: value })}
                          placeholder="Search employee..."
                          disabled={false}
                        />
                      ) : (
                        <input
                          type="text"
                          value={row.name || ""}
                          onChange={(e) =>
                            updateRow(i, { name: e.target.value })
                          }
                          placeholder="Employee name"
                          className="w-full p-1 border rounded text-sm"
                        />
                      )
                    ) : (
                      <input
                        type="text"
                        value={row.name || ""}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        placeholder="Guest name"
                        className="w-full p-1 border rounded text-sm"
                      />
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={
                        row.percentage !== null && row.percentage !== undefined
                          ? row.percentage
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        const parsed = v === "" ? null : parseFloat(v);
                        updateRow(i, { percentage: parsed });
                      }}
                      disabled={mode !== "percentage"}
                      placeholder="0.00"
                      className={`w-full p-1 border rounded text-sm ${
                        mode !== "percentage" ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={
                        row.amount !== null && row.amount !== undefined
                          ? row.amount
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        const parsed = v === "" ? null : parseFloat(v);
                        updateRow(i, { amount: parsed });
                      }}
                      disabled={mode !== "amount"}
                      placeholder="0.00"
                      className={`w-full p-1 border rounded text-sm ${
                        mode !== "amount" ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-red-500"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                No participants. Click "Add Participant" to start.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="text-xs text-gray-500">
              Max. Allowed Participant - {maxParticipants}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addRow}
                type="button"
                className="px-3 py-1 border rounded"
              >
                Add Participant
              </button>
              <button
                onClick={resetParticipants}
                type="button"
                className="px-3 py-1 border rounded"
              >
                RESET
              </button>
              <button
                onClick={saveParticipants}
                type="button"
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ParticipantsDrawer;
