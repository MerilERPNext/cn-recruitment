"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CreateLoanDialog from "./component/CreateLoanDailog";
import LoanList from "./component/LoanListView";
import ListViewOfLoanForMobile from "./component/ListViewOfLoanForMobile";
import { useLoan } from "../../../hooks/useLoan";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { data: loanData, isLoading } = useLoan(employeeId || "");

  // const filteredLoans = (loanData || []).filter((loan: { status: string }) =>
  //   loan.status?.toLowerCase().includes(searchTerm.toLowerCase())
  // )

  // const filteredLoans = useMemo(() => {
  //   if (!searchTerm.trim()){
  //     return loanData || []
  //   }
  //   const lowercasedSearchTerm = searchTerm.toLowerCase()
  //   return (loanData || []).filter(
  //     (loan) =>
  //     loan.loan_name?.toLowerCase().includes(lowercasedSearchTerm) ||
  //     loan.loan_type?.toLowerCase().includes(lowercasedSearchTerm) ||
  //     loan.status?.toLowerCase().includes(lowercasedSearchTerm),
  //   )
  // },[loanData, searchTerm]
  // )

  const filteredLoans = useMemo(() => {
    if (!loanData) return [];
    const lower = searchTerm.toLowerCase();
    return loanData.filter(
      (loan) =>
        loan.loan_name?.toLowerCase().includes(lower) ||
        loan.loan_type?.toLowerCase().includes(lower) ||
        loan.status?.toLowerCase().includes(lower),
    );
  }, [loanData, searchTerm]);

  // Desktop Layout
  const DesktopLayout = (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">My Loan Requests</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your loan requests
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4">My Loan Requests</Typography>
              </div>
            )}
            <Button size="md" onClick={() => setIsDialogOpen(true)}>
              Create Loans
            </Button>
          </div>
        </div>
      </div>

      <div className="pb-2 px-4 w-full">
        <div className="relative w-full ">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {/* Search */}

        <div className="max-w-screen">
          {isLoading ? (
            <CardSkeleton />
          ) : filteredLoans.length > 0 ? (
            <LoanList loans={filteredLoans} />
          ) : (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">
                No loans found matching your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="min-h-screen w-full px-4 py-4">
      {isLoading ? <CardSkeleton /> : <ListViewOfLoanForMobile />}
    </div>
  );

  return (
    <>
      {isDesktop ? DesktopLayout : <MobileLayout />}
      <CreateLoanDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
