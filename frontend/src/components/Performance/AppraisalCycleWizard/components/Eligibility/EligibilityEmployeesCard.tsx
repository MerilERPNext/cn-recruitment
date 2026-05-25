import { Typography } from "../../../../shared/atoms/Typography";

export type EligibilityEmployee = {
  name: string;
  team: string;
  location: string;
  type: string;
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
        <button className="self-start text-sm font-bold text-blue-600 sm:self-auto">
          View all 2,140 →
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-left text-sm min-w-[500px]">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-widest font-bold">
            <tr>
              <th className="px-4 py-3 font-bold">Employee Name</th>
              <th className="px-4 py-3 font-bold">Team</th>
              <th className="px-4 py-3 font-bold">Location</th>
              <th className="px-4 py-3 font-bold">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((employee) => (
              <tr key={employee.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-bold text-gray-900">{employee.name}</td>
                <td className="px-4 py-3 text-gray-500">{employee.team}</td>
                <td className="px-4 py-3 text-gray-500">{employee.location}</td>
                <td className="px-4 py-3 text-gray-500">{employee.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EligibilityEmployeesCard;
