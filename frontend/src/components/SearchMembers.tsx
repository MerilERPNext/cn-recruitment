import { useNavigate } from "react-router-dom";

import HeaderBar from "./HeaderBar";

import { useAllEmployee } from "../hooks/useEmployee";

import { useEffect, useState } from "react";
import useDebounce from "../hooks/useDebounce";
import SearchCard, { Employee } from "./Employee/SearchCard";
//
// const ChevronRightIcon = () => (
//   <svg
//     fill="currentColor"
//     height="24"
//     viewBox="0 0 256 256"
//     width="24"
//     xmlns="http://www.w3.org/2000/svg"
//   >
//     <path d="m181.66,133.66-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
//   </svg>
// );
// interface MemberAvatarProps {
//   src?: string;
//   alt?: string;
//   size?: string; // e.g., "h-14 w-14"
//   fallback?: React.ReactNode; // Could be a fallback icon, initials, etc.
// }
// Member Avatar Component
// const MemberAvatar = ({
//   src,
//   alt,
//   size = "h-14 w-14",
//   fallback,
// }: MemberAvatarProps) => {
//   if (src) {
//     return (
//       <img
//         alt={alt}
//         className={`aspect-square rounded-full ${size} object-cover border border-gray-200 bg-white`}
//         src={src}
//       />
//     );
//   }
//   // Fallback: initials
//   return (
//     <div
//       className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase ${size}`}
//       style={{ minWidth: "3.5rem", minHeight: "3.5rem" }}
//     >
//       {fallback}
//     </div>
//   );
// };

// Member Card Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// const MemberCard = ({ item, onClick }: any) => {
//   const member = item;
//   // Prefer full name, fallback to first+last or name
//   const fullName =
//     member.employee_name ||
//     [member.first_name, member.last_name].filter(Boolean).join(" ") ||
//     member.name;
//   const initials = fullName
//     .split(" ")
//     .map((n: string) => n[0])
//     .join("")
//     .slice(0, 2)
//     .toUpperCase();
//   const designation = member.designation || "";
//   const department = member.department || "";
//   const status = member.status || "";
//   const phone = member.cell_number || "";
//   const email = member.company_email || member.personal_email || "";
//   // Status color
//   const statusColor =
//     status === "Active"
//       ? "bg-green-100 text-green-700"
//       : status === "Inactive"
//       ? "bg-gray-100 text-gray-500"
//       : status === "Suspended"
//       ? "bg-yellow-100 text-yellow-700"
//       : status === "Left"
//       ? "bg-red-100 text-red-700"
//       : "bg-gray-100 text-gray-500";

//   return (
//     <div
//       className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
//       onClick={() => onClick(member)}
//     >
//       <MemberAvatar src={member.image} alt={fullName} fallback={initials} />
//       <div className="flex-grow min-w-0">
//         <div className="flex items-center gap-2">
//           <p className="text-gray-900 text-base font-semibold truncate">
//             {fullName}
//           </p>
//           {status && (
//             <span
//               className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
//             >
//               {status}
//             </span>
//           )}
//         </div>
//         <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
//           {designation && <span>{designation}</span>}
//           {designation && department && <span className="mx-1">·</span>}
//           {department && <span>{department}</span>}
//         </div>
//         <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
//           {phone && <span>📞 {phone}</span>}
//           {email && <span>✉️ {email}</span>}
//         </div>
//       </div>
//       <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
//         <ChevronRightIcon />
//       </button>
//     </div>
//   );
// };

// Results Section Component

// Main App Component
const SearchMembersApp = () => {
  const [getRecentSearch, setgetRecentSearch] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const query = useDebounce(searchQuery, 350);
  const {
    data: employees,
    isLoading,
    error,
  } = useAllEmployee(
    ["employee_name", "image", "status", "department", "designation", "name"],
    [],
    [
      ["name", "like", `%${query}%`],
      ["employee_name", "like", `%${query}%`],
    ]
  );
  const navigate = useNavigate();

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (employees) {
      setAllEmployees(employees as Employee[]);
    }
  }, [employees]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmployees(allEmployees);
      const stored: Employee[] = JSON.parse(
        localStorage.getItem("recentSearches") || "[]"
      );
      setgetRecentSearch(stored);
      return;
    }

    const filtered = allEmployees.filter((emp) =>
      emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEmployees(filtered);

    const stored: Employee[] = JSON.parse(
      localStorage.getItem("recentSearches") || "[]"
    );
    const recentFiltered = stored.filter((emp) =>
      emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setgetRecentSearch(recentFiltered);
  }, [searchQuery, allEmployees]);

  function loadingState() {
    if (filteredEmployees.length > 0) {
      return (
        <div className="text-center text-gray-500 py-6">No recent searches</div>
      );
    } else {
      return (
        <div className="flex justify-center items-center py-10">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500">Loading...</span>
        </div>
      );
    }
  }

  function errorState() {
    return <p>Error loading employees</p>;
  }

  const onSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    try {
      const value = e.target.value.trim();
      setSearchQuery(value);
      if (!value) {
        return;
      }

      const filteredEmployees = allEmployees.filter((data) =>
        data.employee_name.toLowerCase().includes(value.toLowerCase())
      );

      setFilteredEmployees(filteredEmployees);
    } catch (error) {
      console.error("Error handling search input:", error);
    }
  };

  //localstorage items remove
  function removeItemsFromLocal(idx: number): void {
    const removeItem = [...getRecentSearch];
    removeItem.splice(idx, 1);
    localStorage.setItem("recentSearches", JSON.stringify(removeItem));
    setgetRecentSearch(removeItem);
  }

  //inputonclick function
  function onSearchQueryInputClick(): void {
    navigate("/webapp/search-members");
  }
  function employeeList() {
    if (isLoading) return loadingState();
    if (error) return errorState();

    // case 1: Input khali hai -> recent searches dikhao
    if (!searchQuery.trim()) {
      if (getRecentSearch.length > 0) {
        return (
          <SearchCard
            employees={getRecentSearch}
            setSearchQuery={setSearchQuery}
            onRemove={removeItemsFromLocal}
            showRemove={true}
          />
        );
      } else {
        return loadingState();
      }
    }

    if (filteredEmployees.length > 0) {
      return (
        <SearchCard
          employees={filteredEmployees}
          setSearchQuery={setSearchQuery}
        />
      );
    }

    return (
      <div className="text-center text-gray-500 py-6">No employees found</div>
    );
  }
  return (
    <div className="">
      <HeaderBar title="Search Members" onBack={() => navigate(-1)} />
      <div className="flex-grow h-screen w-full bg-white o p-4">
        <div className="relative w-1/2 mx-auto border min-w-fit  border-gray-300 bg-gray-200 rounded-lg ">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchInputChange(e)}
            placeholder="Search members..."
            onClick={() => onSearchQueryInputClick()}
            className="w-full pl-6 pr-4 py-2 min-w-[28rem] cursor-pointer bg-transparent  rounded-lg focus:outline-none ml-3   text-gray-900 placeholder-gray-500"
          />
        </div>
        <div className={` mt-4 mx-auto w-1/2`}>{employeeList()}</div>
      </div>
    </div>
  );
};

export default SearchMembersApp;
