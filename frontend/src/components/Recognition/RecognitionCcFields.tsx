/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import SearchableSelect from "../shared/SearchableSelect";
import { useGetAllEmployees } from "../../hooks/useEmployee";

// Basic email-format check (mirrors the backend validation intent).
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const Chip: React.FC<{ label: string; onRemove: () => void; disabled?: boolean }> = ({
  label,
  onRemove,
  disabled = false,
}) => (
  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
    {label}
    {!disabled && (
      <button
        type="button"
        onClick={onRemove}
        className="text-blue-400 hover:text-blue-700"
        aria-label={`Remove ${label}`}
      >
        <X className="size-3" />
      </button>
    )}
  </span>
);

export interface RecognitionCcFieldsProps {
  /** Show the CC Employees multi-select (Advanced Settings: enable_cc_employees). */
  showEmployees: boolean;
  /** Show the CC Email IDs multi-input (Advanced Settings: enable_cc_email_ids). */
  showEmails: boolean;
  ccEmployees: string[];
  onChangeEmployees: (next: string[]) => void;
  ccEmails: string[];
  onChangeEmails: (next: string[]) => void;
  /** Read-only mode — every input is disabled and chips lose their remove button. */
  disabled?: boolean;
}

/**
 * Reusable CC recipients block for the Recognition form. Renders a searchable
 * employee multi-select and/or an external-email multi-input, each shown only
 * when its Advanced Settings flag is enabled. Fully self-contained so it can be
 * reused by any recognition/appreciation form.
 */
const RecognitionCcFields: React.FC<RecognitionCcFieldsProps> = ({
  showEmployees,
  showEmails,
  ccEmployees,
  onChangeEmployees,
  ccEmails,
  onChangeEmails,
  disabled = false,
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  // Employee options (fetched only when the employee field is shown).
  const { data: employees = [] } = useGetAllEmployees(
    ["name", "employee_name", "designation"],
    500,
    showEmployees ? [["status", "=", "Active"]] : undefined,
  );

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach((e: any) => {
      m[e.name] = e.employee_name || e.name;
    });
    return m;
  }, [employees]);

  // Options exclude already-selected employees.
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e: any) => !ccEmployees.includes(e.name))
        .map((e: any) => ({
          value: e.name,
          label: e.designation
            ? `${e.employee_name} (${e.name}) — ${e.designation}`
            : `${e.employee_name} (${e.name})`,
        })),
    [employees, ccEmployees],
  );

  const addEmployee = (id: string) => {
    if (id && !ccEmployees.includes(id)) onChangeEmployees([...ccEmployees, id]);
  };
  const removeEmployee = (id: string) =>
    onChangeEmployees(ccEmployees.filter((x) => x !== id));

  const addEmail = () => {
    const v = emailInput.trim().toLowerCase();
    if (!v) return;
    if (!isValidEmail(v)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (ccEmails.includes(v)) {
      setEmailError("This email is already added.");
      return;
    }
    onChangeEmails([...ccEmails, v]);
    setEmailInput("");
    setEmailError("");
  };
  const removeEmail = (email: string) =>
    onChangeEmails(ccEmails.filter((x) => x !== email));

  if (!showEmployees && !showEmails) return null;

  return (
    <div className="space-y-3">
      {showEmployees && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Recognition notification CC users
          </label>
          <SearchableSelect
            options={employeeOptions}
            value=""
            onChange={addEmployee}
            placeholder="Search employees to CC..."
            disabled={disabled}
          />
          {ccEmployees.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ccEmployees.map((id) => (
                <Chip
                  key={id}
                  label={nameById[id] || id}
                  onRemove={() => removeEmployee(id)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showEmails && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">CC Email IDs</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (emailError) setEmailError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder="name@example.com"
              disabled={disabled}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={addEmail}
              disabled={disabled}
              className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-50"
            >
              Add
            </button>
          </div>
          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          {ccEmails.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ccEmails.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  onRemove={() => removeEmail(email)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecognitionCcFields;
