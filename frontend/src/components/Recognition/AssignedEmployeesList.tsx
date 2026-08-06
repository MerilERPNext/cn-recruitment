import React from "react";
import { Users } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import { useScreenSize } from "../../hooks/useScreenSize";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import PersonAvatar from "./components/MyAppreciationsHistory/PersonAvatar";
import {
  useProgramAssignedEmployees,
  type AssignedEmployee,
} from "../../services/recognitionService";

/** Same badge tones the nomination screens use, so states read consistently. */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = (status || "").toLowerCase();
  const tone =
    s === "published" || s === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : s === "shortlisted"
        ? "bg-slate-100 text-slate-700"
        : s === "rejected"
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${tone}`}
    >
      {status || "—"}
    </span>
  );
};

/**
 * Employees who have already been recognised under the open Active Program.
 * Sits under the nomination form so a manager can see previous recipients
 * before assigning, and spot anyone who has hit the per-receiver limit.
 */
const AssignedEmployeesList: React.FC<{
  program: string;
  employee?: string;
}> = ({ program, employee }) => {
  // Desktop/mobile split is driven in JS (as on the other Recognition tables)
  // rather than by `md:` classes, so exactly one variant always renders.
  const { isDesktop } = useScreenSize();
  const { data, isLoading, isError } = useProgramAssignedEmployees(program, employee);

  const rows: AssignedEmployee[] = data?.data ?? [];
  const limit = data?.per_receiver_limit ?? 0;

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-gray-500" />
          <Typography variant="bodyMedium" className="font-semibold">
            Already Assigned Employees
          </Typography>
          {!isLoading && rows.length > 0 && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {data?.total_count}
            </span>
          )}
        </div>
        {limit > 0 && (
          <span className="text-[11px] text-gray-500">
            Limit: {limit} per employee, per recognizer
          </span>
        )}
      </header>

      {isLoading ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          Loading assigned employees…
        </p>
      ) : isError ? (
        <p className="px-4 py-8 text-center text-sm text-red-500">
          Could not load assigned employees.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          No employees have been assigned to this program yet.
        </p>
      ) : (
        <>
          {isDesktop ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  <th className="px-4 py-2.5 font-semibold">Employee</th>
                  <th className="px-4 py-2.5 font-semibold">Employee ID</th>
                  <th className="px-4 py-2.5 font-semibold">Department</th>
                  <th className="px-4 py-2.5 font-semibold">Designation</th>
                  <th className="px-4 py-2.5 font-semibold">Date Assigned</th>
                  <th className="px-4 py-2.5 font-semibold">Assigned By</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.employee}
                    className={`border-t border-gray-100 ${
                      r.can_assign_again ? "" : "bg-amber-50/40"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={r.employee_name} imageUrl={r.image} size={26} />
                        <WrapperHoverCard employeeId={r.employee}>
                          <span className="cursor-pointer text-sm font-medium text-gray-800">
                            {r.employee_name}
                          </span>
                        </WrapperHoverCard>
                        {r.times_assigned > 1 && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                            ×{r.times_assigned}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.employee}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.department || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.designation || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.date_assigned || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.assigned_by || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={r.status} />
                        {!r.can_assign_again && (
                          <span className="text-[10px] font-medium text-amber-700">
                            Limit reached
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.employee} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <PersonAvatar name={r.employee_name} imageUrl={r.image} size={28} />
                  <div className="min-w-0 flex-1">
                    <WrapperHoverCard employeeId={r.employee}>
                      <span className="cursor-pointer text-sm font-semibold text-gray-800">
                        {r.employee_name}
                      </span>
                    </WrapperHoverCard>
                    <p className="text-xs text-gray-500">
                      {r.employee}
                      {r.designation ? ` · ${r.designation}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {r.department || "—"} · {r.date_assigned || "—"} · by {r.assigned_by || "—"}
                  {r.times_assigned > 1 ? ` · ×${r.times_assigned}` : ""}
                  {!r.can_assign_again ? " · Limit reached" : ""}
                </p>
              </li>
            ))}
          </ul>
          )}
        </>
      )}
    </section>
  );
};

export default AssignedEmployeesList;
