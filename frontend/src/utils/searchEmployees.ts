// import EmployeeService from "../services/EmployeeService"; // adjust path
import EmployeeService from "../services/employeeService";
import { Employee } from "../types/employee";
import { FilterCondition } from "../types/frappe";

export interface Option {
  value: string;
  label: string;
}

export async function searchEmployeesByQuery(q: string): Promise<Option[]> {
  const query = (q || "").trim();
  if (query.length < 2) return []; // require min 2 chars

  const fields = [
    "name",
    "employee_name",
    "department",
    "designation",
    "image",
  ];

  // OR search: name LIKE %query% OR employee_name LIKE %query%
  const orFilters: FilterCondition[] = [
    ["name", "like", `%${query}%`],
    ["employee_name", "like", `%${query}%`],
  ];

  const employees: Employee[] = await EmployeeService.getAllEmployees(
    fields,
    [], // no AND filters
    orFilters // OR filters
  );

  return employees.map((e) => ({
    value: e.name,
    label: e.employee_name ? `${e.employee_name} (${e.name})` : e.name,
  }));
}
