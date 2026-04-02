import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoan } from "../../../hooks/useLoan";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { isActionEnabled } from "../../../utils/uiPermission";
import { Typography } from "../../shared/atoms/Typography";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import CreateLoanDialog from "./component/CreateLoanDailog";
import ListViewOfLoanForMobile from "./component/ListViewOfLoanForMobile";
import LoanList from "./component/LoanListView";

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { data: loanData, isLoading } = useLoan(employeeId || "");
  const [loanId, setLoanId] = useState<string | null>(null);
  const handleEdit = (docname: string) => {
    setLoanId(docname);
    setIsDialogOpen(true);
  };

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

  // UI Permission check
  const { data: uiPermission } = useGetUiPermission("Compensation");
  const canCreateLoan = isActionEnabled(
    uiPermission,
    "create_loan",
    "My Loan Requests",
  );

  // Register action button in central SalarySlipApp
  const { setActionButtonConfig, setIsModalOpen } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
    setIsModalOpen: (open: boolean) => void;
  }>();

  useEffect(() => {
    if (canCreateLoan) {
      setActionButtonConfig({
        label: "+ Request Loan",
        onClick: () => {
          setIsDialogOpen(true);
          setIsModalOpen(true);
        },
      });
    } else {
      setActionButtonConfig(null);
    }
    return () => setActionButtonConfig(null);
  }, [setActionButtonConfig, setIsModalOpen, canCreateLoan]);

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
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <div className="max-w-screen">
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <LoanList
              handleEdit={handleEdit}
              loans={filteredLoans}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="min-h-screen w-full py-4">
      {isLoading ? <CardSkeleton /> : <ListViewOfLoanForMobile />}
    </div>
  );

  return (
    <>
      {isDesktop ? DesktopLayout : <MobileLayout />}

      {isDialogOpen && (
        <CreateLoanDialog
          loanId={loanId}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setLoanId(null);
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}
