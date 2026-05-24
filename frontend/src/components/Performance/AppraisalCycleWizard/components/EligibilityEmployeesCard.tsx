import { Typography } from "../../../shared/atoms/Typography";

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
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
        {employees.map((employee) => (
          <div
            key={employee.name}
            className="grid grid-cols-1 gap-1 border-b border-gray-100 px-3 py-3 text-sm last:border-b-0 sm:grid-cols-2 md:grid-cols-[1fr_130px_130px_100px]"
          >
            <span className="font-bold text-gray-900">{employee.name}</span>
            <span className="text-gray-500">{employee.team}</span>
            <span className="text-gray-500">{employee.location}</span>
            <span className="text-gray-500">{employee.type}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EligibilityEmployeesCard;
