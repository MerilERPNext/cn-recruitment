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

const EligibilityEmployeesCard = ({ employees }: EligibilityEmployeesCardProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h3" className="text-base font-bold text-gray-900">
          Sample matching employees
        </Typography>
        <button className="self-start text-sm font-bold text-blue-600 sm:self-auto hover:underline">
          View all 2,140 →
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <table className="w-full text-left text-sm min-w-[650px] border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 uppercase tracking-widest font-bold">
            <tr>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Employee</th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Department</th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Grade</th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Manager</th>
              <th className="px-4 py-3.5 font-bold whitespace-nowrap">Tenure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {employees.map((employee) => (
              <tr key={employee.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                      {employee.initials}
                    </span>
                    <span className="font-semibold text-gray-800 whitespace-nowrap">
                      {employee.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{employee.department}</td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{employee.grade}</td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{employee.manager}</td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{employee.tenure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EligibilityEmployeesCard;
