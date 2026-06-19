/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Form } from "@tsed/react-formio";
import toast from "react-hot-toast";
import Button from "../../shared/atoms/Button";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useCreateSalaryStructureAssignment } from "../../../hooks/useSalaryStructureAssignment";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import FrappeAPI from "../../../utils/frappeAPI";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import type { CreateSalaryStructureAssignmentPayload } from "../../../services/salaryStructureAssignment";
import type { FilterCondition } from "../../../types/frappe";
import salaryStructureAssignmentSchema from "./salaryStructureAssignmentSchema.json";

interface EmployeeDetail {
  name: string;
  employee_name?: string;
  company?: string;
  department?: string;
  designation?: string;
  grade?: string;
  date_of_joining?: string;
  employment_type?: string;
}

export interface SelectedEmployee {
  id: string;
  name?: string;
}

interface SalaryStructureAssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * When provided (e.g. from the Employee Directory bulk action), the form runs
   * in multi-employee mode: the Employee field is hidden and one assignment is
   * created for EACH employee using the same shared form values. When omitted
   * (Salary Structure Assignment list), the form keeps the single Employee
   * picker.
   */
  employees?: SelectedEmployee[];
}

// Employee-specific fields. In multi-employee mode these are hidden in the form
// and stripped from the payload so each employee's own values are fetched
// server-side (Frappe fetch_from) per employee.
const EMPLOYEE_FIELD_KEYS = [
  "employee",
  "employee_name",
  "company",
  "department",
  "designation",
  "grade",
  "custom_date_of_joining",
  "custom_employment_type",
];

// Readable title field per link doctype (these doctypes have no `title_field`,
// so their docname is a code; the human label lives in these fields).
const TITLE_FIELD: Record<string, string> = {
  Designation: "custom_designation_title",
  "Employee Grade": "custom_grade_name",
  "Employment Type": "employee_type_name",
};

// Cache resolved titles for the session so repeated ids aren't refetched.
const titleCache = new Map<string, string>();

// Resolve a link value's human title (falls back to the id itself).
const resolveTitle = async (doctype: string, id?: string): Promise<string> => {
  if (!id) return "";
  const field = TITLE_FIELD[doctype];
  if (!field) return id;
  const key = `${doctype}::${id}`;
  if (titleCache.has(key)) return titleCache.get(key) as string;
  try {
    const res = await fetch(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(
        id,
      )}?fields=${encodeURIComponent(JSON.stringify([field]))}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return id;
    const val = (await res.json())?.data?.[field];
    const title = val ? String(val).trim() : id;
    titleCache.set(key, title);
    return title;
  } catch {
    return id;
  }
};

// Clone the schema and hide the given field keys (and drop their `required`),
// used to remove the per-employee fields in multi-employee mode.
const hideFields = (schema: any, keys: Set<string>) => {
  const clone = JSON.parse(JSON.stringify(schema));
  const walk = (comps: any[]) => {
    if (!Array.isArray(comps)) return;
    comps.forEach((c) => {
      if (c?.key && keys.has(c.key)) {
        c.hidden = true;
        if (c.validate) c.validate.required = false;
      }
      if (Array.isArray(c?.components)) walk(c.components);
      if (Array.isArray(c?.columns))
        c.columns.forEach((col: any) => walk(col?.components));
    });
  };
  walk(clone.components);
  return clone;
};

export default function SalaryStructureAssignmentForm({
  isOpen,
  onClose,
  employees,
}: SalaryStructureAssignmentFormProps) {
  const { isDesktop } = useScreenSize();
  const loading = useLoadingOverlay();
  const mutation = useCreateSalaryStructureAssignment();
  const formRef = useRef<any>(null);

  const isMulti = Array.isArray(employees) && employees.length > 0;

  const formSchema = useMemo(
    () =>
      isMulti
        ? hideFields(salaryStructureAssignmentSchema, new Set(EMPLOYEE_FIELD_KEYS))
        : salaryStructureAssignmentSchema,
    [isMulti],
  );

  // Stable key of the selected employee ids (the prop array is a fresh
  // reference each parent render, so we key effects off the joined ids).
  const empIdsKey = useMemo(
    () => (employees || []).map((e) => e.id).join(","),
    [employees],
  );

  // In multi-employee mode, fetch the per-employee details (the same fields
  // Frappe resolves via fetch_from) so they can be shown in the summary table.
  const [empDetails, setEmpDetails] = useState<Record<string, EmployeeDetail>>(
    {},
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!isMulti || !isOpen) return;
    const ids = (employees as SelectedEmployee[]).map((e) => e.id);
    if (ids.length === 0) return;
    let cancelled = false;
    setDetailsLoading(true);
    (async () => {
      try {
        const filters: FilterCondition[] = [["name", "in", ids]];
        const res = await FrappeAPI.getDocumentList("Employee", {
          fields: [
            "name",
            "employee_name",
            "company",
            "department",
            "designation",
            "grade",
            "date_of_joining",
            "employment_type",
          ],
          filters,
          limit: ids.length,
        });
        if (cancelled) return;
        const list = res.data as EmployeeDetail[];
        // Resolve readable titles for the coded link fields (cached + deduped).
        await Promise.all(
          list.flatMap((e) => [
            resolveTitle("Designation", e.designation).then((t) => {
              e.designation = t;
            }),
            resolveTitle("Employee Grade", e.grade).then((t) => {
              e.grade = t;
            }),
            resolveTitle("Employment Type", e.employment_type).then((t) => {
              e.employment_type = t;
            }),
          ]),
        );
        if (cancelled) return;
        const map: Record<string, EmployeeDetail> = {};
        list.forEach((e) => {
          map[e.name] = e;
        });
        setEmpDetails(map);
      } catch (e) {
        console.warn("Failed to fetch employee details for table", e);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMulti, isOpen, empIdsKey]);

  // Push values into the Form.io submission while preserving the rest of the
  // current form data.
  const patchSubmission = (patch: Record<string, any>) => {
    const instance = formRef.current;
    if (!instance) return;
    const current = instance.submission?.data || {};
    instance.setSubmission({ data: { ...current, ...patch } });
  };

  // When an Employee is picked, fetch the linked values (employee_name,
  // company, designation, grade, date of joining, employee type) from the
  // Employee record via the resource API and fill the read-only fields —
  // mirroring Frappe's fetch_from behaviour.
  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      const fields = [
        "employee_name",
        "company",
        "department",
        "designation",
        "grade",
        "date_of_joining",
        "employment_type",
      ];
      const res = await fetch(
        `/api/resource/Employee/${encodeURIComponent(
          employeeId,
        )}?fields=${encodeURIComponent(JSON.stringify(fields))}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return;
      const json = await res.json();
      const emp = json?.data || {};
      // Resolve readable titles for the coded link fields so the form shows
      // names, not ids (e.g. "Associate" instead of "DES_PW_00003").
      const [designation, grade, employmentType] = await Promise.all([
        resolveTitle("Designation", emp.designation),
        resolveTitle("Employee Grade", emp.grade),
        resolveTitle("Employment Type", emp.employment_type),
      ]);
      patchSubmission({
        employee_name: emp.employee_name || "",
        company: emp.company || "",
        department: emp.department || "",
        designation,
        grade,
        custom_date_of_joining: emp.date_of_joining || "",
        custom_employment_type: employmentType,
      });
    } catch (e) {
      console.warn("Failed to fetch employee details", e);
    }
  };

  // When a Salary Structure is picked, fetch its currency.
  const fetchSalaryStructureCurrency = async (salaryStructure: string) => {
    try {
      const res = await fetch(
        `/api/resource/Salary Structure/${encodeURIComponent(
          salaryStructure,
        )}?fields=${encodeURIComponent(JSON.stringify(["currency"]))}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return;
      const json = await res.json();
      patchSubmission({ currency: json?.data?.currency || "" });
    } catch (e) {
      console.warn("Failed to fetch salary structure currency", e);
    }
  };

  // Returns the set of employee ids that already have a SUBMITTED assignment
  // with the given from_date — the backend rejects those as duplicates, so we
  // pre-check to skip/warn instead of hitting a hard error.
  const findDuplicateEmployees = async (
    employeeIds: string[],
    fromDate: string,
  ): Promise<Set<string>> => {
    if (!fromDate || employeeIds.length === 0) return new Set();
    try {
      const filters: FilterCondition[] = [
        ["employee", "in", employeeIds],
        ["from_date", "=", fromDate],
        ["docstatus", "=", 1],
      ];
      const res = await FrappeAPI.getDocumentList("Salary Structure Assignment", {
        fields: ["employee"],
        filters,
        limit: employeeIds.length,
      });
      return new Set(
        (res.data as { employee: string }[]).map((r) => r.employee),
      );
    } catch (e) {
      console.warn("Duplicate assignment check failed", e);
      return new Set();
    }
  };

  const handleFormChange = (changed: any) => {
    const changedKey = changed?.changed?.component?.key;
    if (changedKey === "employee") {
      const employeeId = changed?.data?.employee;
      if (employeeId) {
        fetchEmployeeDetails(employeeId);
      } else {
        patchSubmission({
          employee_name: "",
          company: "",
          department: "",
          designation: "",
          grade: "",
          custom_date_of_joining: "",
          custom_employment_type: "",
        });
      }
    } else if (changedKey === "salary_structure") {
      const salaryStructure = changed?.data?.salary_structure;
      if (salaryStructure) {
        fetchSalaryStructureCurrency(salaryStructure);
      } else {
        patchSubmission({ currency: "" });
      }
    }
  };

  // Shared cleanup applied to the Form.io data before it becomes a payload.
  const buildCleanedData = (formData: Record<string, any>) => {
    const cleaned: Record<string, any> = { ...formData };

    // Form.io datetime fields emit a full ISO timestamp
    // (e.g. "2026-06-19T00:00:00+05:30"); Frappe Date columns need a plain
    // "YYYY-MM-DD" string, so trim to the date part.
    const toDateOnly = (v: any) =>
      typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : v;
    ["from_date", "custom_date_of_joining", "custom_esic_applicable_period"].forEach(
      (k) => {
        if (cleaned[k]) cleaned[k] = toDateOnly(cleaned[k]);
      },
    );

    // Drop blank child-table rows and coerce numeric amounts. The backend
    // controller computes monthly = annual / 12, so an empty reimbursement
    // row (annual_total_amount = null) would crash server-side.
    if (Array.isArray(cleaned.custom_employee_reimbursements)) {
      cleaned.custom_employee_reimbursements = cleaned.custom_employee_reimbursements
        .filter((r: any) => r && r.reimbursements)
        .map((r: any) => ({
          ...r,
          annual_total_amount: Number(r.annual_total_amount) || 0,
          monthly_total_amount: Number(r.monthly_total_amount) || 0,
        }));
    }
    if (Array.isArray(cleaned.payroll_cost_centers)) {
      cleaned.payroll_cost_centers = cleaned.payroll_cost_centers.filter(
        (r: any) => r && r.cost_center,
      );
    }
    if (Array.isArray(cleaned.custom_variable_pay_components)) {
      cleaned.custom_variable_pay_components = cleaned.custom_variable_pay_components
        .filter((r: any) => r && r.variable_name)
        .map((r: any) => ({ ...r, amount: Number(r.amount) || 0 }));
    }

    return cleaned;
  };

  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data;

      if (!formData) {
        toast.error("Please fill all required fields.");
        return;
      }

      const cleaned = buildCleanedData(formData);

      // ── Multi-employee mode (from Employee Directory) ────────────────────
      // Same create+submit logic, run once per selected employee. The shared
      // values (structure, period, slab, amounts…) are identical; the
      // per-employee fields are stripped so company/name/grade/etc. are
      // resolved from each employee server-side.
      if (isMulti) {
        EMPLOYEE_FIELD_KEYS.forEach((k) => delete cleaned[k]);
        const fromDate = cleaned.from_date as string;
        const allEmps = employees as SelectedEmployee[];

        // Skip employees that already have a submitted assignment on this date.
        const dupSet = await findDuplicateEmployees(
          allEmps.map((e) => e.id),
          fromDate,
        );
        const toCreate = allEmps.filter((e) => !dupSet.has(e.id));
        const skipped = allEmps.filter((e) => dupSet.has(e.id));

        if (toCreate.length === 0) {
          toast.error(
            `All ${allEmps.length} selected employee(s) already have an assignment effective ${fromDate}.`,
          );
          return;
        }

        await loading?.wrap(async () => {
          let ok = 0;
          const failures: { employee: string; error: any }[] = [];
          for (const emp of toCreate) {
            try {
              await mutation.mutateAsync({
                ...cleaned,
                employee: emp.id,
              } as unknown as CreateSalaryStructureAssignmentPayload);
              ok += 1;
            } catch (error) {
              failures.push({ employee: emp.id, error });
            }
          }

          const parts: string[] = [];
          if (ok) parts.push(`${ok} created`);
          if (skipped.length)
            parts.push(`${skipped.length} skipped (already assigned)`);
          if (failures.length) parts.push(`${failures.length} failed`);
          const summary = parts.join(", ");

          if (failures.length === 0) {
            toast.success(`${summary}.`);
            onClose();
          } else {
            const first = errorResponseFormater(
              failures[0].error,
              "Failed to create assignment.",
            );
            toast.error(`${summary} — ${failures[0].employee}: ${first}`);
            console.error("Multi-assignment failures:", failures);
          }
        }, "Creating salary structure assignments…");
        return;
      }

      // ── Single-employee mode (from the list view) ────────────────────────
      // designation/grade/employee-type now hold display titles, not link ids;
      // drop them so Frappe's fetch_from resolves the correct values from the
      // selected employee on save.
      ["designation", "grade", "custom_employment_type"].forEach(
        (k) => delete cleaned[k],
      );

      // Pre-check: an employee can't have two submitted assignments on the same
      // from_date — surface a clear message instead of the raw backend error.
      const singleEmployee = cleaned.employee as string;
      const fromDate = cleaned.from_date as string;
      const dupSet = await findDuplicateEmployees([singleEmployee], fromDate);
      if (dupSet.has(singleEmployee)) {
        toast.error(
          `This employee already has a Salary Structure Assignment effective ${fromDate}.`,
        );
        return;
      }

      const payload = cleaned as unknown as CreateSalaryStructureAssignmentPayload;

      await loading?.wrap(async () => {
        await new Promise<void>((resolve, reject) => {
          mutation.mutate(payload, {
            onSuccess: () => {
              toast.success(
                "Salary Structure Assignment created successfully!",
              );
              onClose();
              resolve();
            },
            onError: (error: any) => {
              toast.error(
                errorResponseFormater(
                  error,
                  "Failed to create Salary Structure Assignment.",
                ),
              );
              console.error(error);
              reject(error);
            },
          });
        });
      }, "Creating salary structure assignment…");
    } catch (err) {
      console.error("❌ Form submission error", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[88vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-900">
            {isMulti
              ? `New Salary Structure Assignment — ${
                  (employees as SelectedEmployee[]).length
                } employee(s)`
              : "New Salary Structure Assignment"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body — Form.io rendered schema */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-24">
          {isMulti && (
            <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-gray-700">
              <p className="mb-2">
                These values will be applied to{" "}
                <span className="font-semibold">
                  {(employees as SelectedEmployee[]).length}
                </span>{" "}
                selected employee(s). Company, name, designation and grade are
                resolved per employee automatically.
              </p>
              <div className="max-h-52 overflow-auto rounded-md border border-gray-200 bg-white">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 font-medium w-8">#</th>
                      <th className="px-3 py-1.5 font-medium">Employee ID</th>
                      <th className="px-3 py-1.5 font-medium">Name</th>
                      <th className="px-3 py-1.5 font-medium">Company</th>
                      <th className="px-3 py-1.5 font-medium">Department</th>
                      <th className="px-3 py-1.5 font-medium">Designation</th>
                      <th className="px-3 py-1.5 font-medium">Grade</th>
                      <th className="px-3 py-1.5 font-medium">Date of Joining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employees as SelectedEmployee[]).map((emp, idx) => {
                      const d = empDetails[emp.id];
                      return (
                        <tr key={emp.id} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">
                            {emp.id}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.employee_name || emp.name || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.company || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.department || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.designation || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.grade || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                            {d?.date_of_joining
                              ? formatToIndianDate(d.date_of_joining)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {detailsLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
                    employee details…
                  </div>
                )}
              </div>
            </div>
          )}
          <Form
            form={formSchema}
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
            onChange={handleFormChange}
            options={{ submitButton: false, noAlerts: true }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-20 border-t border-gray-200">
          <div className="mx-auto flex flex-row gap-3 md:justify-end">
            {!isDesktop && (
              <Button onClick={onClose} fullWidth size="md" variant="outline">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              fullWidth
              size="md"
              variant="contain"
              className="w-full md:w-auto min-w-[150px]"
            >
              {isMulti ? "Create for All" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
