import { Typography } from "../../../../shared/atoms/Typography";

export type EligibilityEmployee = {
  name: string;
  department: string;
  grade: string;
  manager: string;
  tenure: string;
  initials: string;
};

type EligibilityEmployeesCardProps = {
  employees: EligibilityEmployee[];
};

const EligibilityEmployeesCard = ({
  employees,
}: EligibilityEmployeesCardProps) => {
  return (
    <section className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h3" className="text-base font-bold text-text-title">
          Sample matching employees
        </Typography>
        <button className="self-start text-sm font-bold text-primary sm:self-auto hover:underline cursor-pointer">
          View all 2,140 →
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm min-w-[650px] border-collapse">
          <thead className="bg-slate-500/10 border-b border-border text-[11px] text-text-body2 uppercase tracking-widest font-bold">
            <tr>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">
                Employee
              </th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">
                Department
              </th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Grade</th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">
                Manager
              </th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">
                Tenure
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {employees.map((employee) => (
              <tr
                key={employee.name}
                className="hover:bg-slate-500/10 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {employee.initials}
                    </span>
                    <span className="font-semibold text-text-title whitespace-nowrap">
                      {employee.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-text-body2 whitespace-nowrap">
                  {employee.department}
                </td>
                <td className="px-4 py-3.5 text-text-body2 whitespace-nowrap">
                  {employee.grade}
                </td>
                <td className="px-4 py-3.5 text-text-body2 whitespace-nowrap">
                  {employee.manager}
                </td>
                <td className="px-4 py-3.5 text-text-body2 whitespace-nowrap">
                  {employee.tenure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EligibilityEmployeesCard;
