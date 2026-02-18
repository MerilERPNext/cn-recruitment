// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useMemo, useState } from "react";
// import { Typography } from "../../../shared/atoms/Typography";
// import CardTable from "../../../shared/CardTable";
// import StatusBadge from "../../../shared/atoms/statusBadge";
// import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";

// // import { useITDeclarationListViewData } from "../../../../hooks/payroll/TeamApprovalITDeclaration";
// import { useNavigate } from "react-router-dom";
// import { Search } from "lucide-react";

// export default function ITDeclarationList() {
// //   const { data: ITDeclarationList, isLoading, isError } =
// //     useITDeclarationListViewData();

//   const navigate = useNavigate();

//   // 🔍 Search State
//   const [search, setSearch] = useState("");

//   // ------------------ CardTable Config ------------------
//   const titles = [
//     "No.",
//     "Name",
//     "Exemption sub category",
//     "Exemption category",
//     "Max limit",
//     "Actual amount",
//     "Status",
//   ];

//   const columnWidths = [
//     "40px",
//     "1fr",
//     "2fr",
//     "2fr",
//     "1fr",
//     "1fr",
//     "1fr",
//   ];

//   // ------------------ Filtered Data ------------------
//   const filteredList = useMemo(() => {
//     if (!search) return ITDeclarationList ?? [];

//     const value = search.toLowerCase();

//     return (ITDeclarationList ?? []).filter((row: any) =>
//       row.employee_name?.toLowerCase().includes(value) ||
//       row.custom_declaration_id?.toLowerCase().includes(value) ||
//       row.custom_tax_regime?.toLowerCase().includes(value) ||
//       row.custom_status?.toLowerCase().includes(value)
//     );
//   }, [search, ITDeclarationList]);

//   return (
//     <div className="flex flex-col p-2 h-full">



//       <CardTable titles={titles} columnWidths={columnWidths}>
//               {/* 🔍 Search Box */}
//       <div className="relative flex justify-start w-full">
//       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//         <input
//           type="text"
//           placeholder="Search..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className=" pl-10 pr-4 py-1 border border-gray-100  w-full"
//         />
//       </div>
//         {/* LOADING */}
//         {isLoading ? (
//           <CardSkeleton />
//         ) : isError ? (
//           <div className="p-4 text-center text-red-500">
//             Error loading data
//           </div>
//         ) : filteredList.length > 0 ? (
//           filteredList.map((row: any, index: number) => (
//             <div
//               key={row.name}
//               onClick={() =>
//                 navigate(
//                   `/webapp/salary-slip-app/team-approval-it-declaration/${row.name}`
//                 )
//               }
//               className="grid items-center gap-4 px-6 h-16 border-b border-gray-50
//                          hover:bg-primary/10 transition-colors cursor-pointer"
//               style={{
//                 gridTemplateColumns: columnWidths.join(" "),
//               }}
//             >
//               {/* No */}
//               <Typography variant="bodySmall" className="text-center">
//                 {index + 1}
//               </Typography>

//               {/* Name */}
//               <Typography variant="bodySmall" className="text-center">
//                 {row.employee_name}
//               </Typography>

//               {/* Sub Category */}
//               <Typography variant="bodySmall" className="text-center">
//                 {row.custom_declaration_id}
//               </Typography>

//               {/* Category */}
//               <Typography
//                 variant="bodySmall"
//                 className="text-gray-500 text-center"
//               >
//                 {row.custom_tax_regime}
//               </Typography>

//               {/* Max Limit */}
//               <Typography variant="bodySmall" className="text-center">
//                 ₹ 1,50,000.00
//               </Typography>

//               {/* Actual Amount */}
//               <Typography variant="bodySmall" className="text-center">
//                 ₹{" "}
//                 {Number(row.total_actual_amount || 0).toLocaleString("en-IN")}
//               </Typography>

//               {/* Status */}
//               <div className="flex justify-center text-center">
//                 <StatusBadge status={row.custom_status} />
//               </div>
//             </div>
//           ))
//         ) : (
//           <div className="p-4 text-center text-gray-500">
//             No records found.
//           </div>
//         )}
//       </CardTable>
//     </div>
//   );
// }
