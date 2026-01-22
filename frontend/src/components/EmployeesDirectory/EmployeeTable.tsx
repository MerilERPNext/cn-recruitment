import { Link } from "react-router-dom";
import { Employee } from "../../types/employee";
import WrapperHoverCard from "../shared/WrapperHoverCard";
const EmployeeTable = ({
    employees,
    selectedEmployees = [],
    setSelectedEmployees
}: {
    employees: Employee[],
    selectedEmployees: Employee[],
    setSelectedEmployees: React.Dispatch<React.SetStateAction<Employee[]>>
}) => {
    const isAllSelected = employees.length > 0 && selectedEmployees.length === employees.length;
    const isSomeSelected = selectedEmployees.length > 0 && selectedEmployees.length < employees.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees);
        }
    };

    const handleSelectOne = (employee: Employee) => {
        const isSelected = selectedEmployees.some(emp => emp.name === employee.name);
        if (isSelected) {
            setSelectedEmployees(prev => prev.filter(emp => emp.name !== employee.name));
        } else {
            setSelectedEmployees(prev => [...prev, employee]);
        }
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                    <tr>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(el: HTMLInputElement | null) => {
                                    if (el) el.indeterminate = isSomeSelected;
                                }}
                                onChange={handleSelectAll}
                                className="cursor-pointer"
                            />
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Employee
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Employee ID
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Designation
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Department
                        </th>
                        <th className="whitespace-nowrap border-r border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Email
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Current Office Location
                        </th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                    {employees.map((item: Employee) => {
                        const isItemSelected = selectedEmployees.some(emp => emp.name === item.name);
                        return (
                            <tr key={item.name} className={`hover:bg-primary-50 ${isItemSelected ? 'bg-primary-50/50' : ''}`}>
                                <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={isItemSelected}
                                        onChange={() => handleSelectOne(item)}
                                        className="cursor-pointer"
                                    />
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 flex gap-2 items-center border-0">
                                    <WrapperHoverCard employeeId={item.employee}>
                                        <Link to={`/webapp/employee-profile?target_user=${item?.employee}`} target="_blank">
                                            <div className="font-medium">
                                                {item.employee_name}
                                            </div>
                                        </Link>
                                    </WrapperHoverCard>
                                </td>
                                <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                    {item.employee}
                                </td>
                                <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                    {item.custom_designation_name}
                                </td>
                                <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                    {item.department}
                                </td>
                                <td className="whitespace-nowrap border-r border-gray-100 px-4 py-3 text-sm text-gray-700">
                                    {item.user_id}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                                    {item.branch}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeeTable;
