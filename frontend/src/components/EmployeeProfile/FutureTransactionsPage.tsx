import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import DataListView from "../DataListView";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import { ColumnSortConfig } from "../shared/CardTableContext";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import FutureTransactionRowItem, {
  type FutureTransaction,
} from "./FutureTransactionRowItem";

const COLUMN_WIDTHS = [
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
];

const COLUMN_TITLES = [
  "Type",
  "Change Requested From",
  "Change Requested To",
  "Effective Date",
  "Requested By",
  "Requested On",
  "Source Name",
  "Source ID",
  "Actions",
];

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "field_name",
    getValue: (item: FutureTransaction) => item.field_name || "",
  },
  { sortable: false },
  { sortable: false },
  {
    sortable: true,
    type: "date",
    field: "effective_date",
    getValue: (item: FutureTransaction) => item.effective_date || "",
  },
  { sortable: false },
  {
    sortable: true,
    type: "date",
    field: "created_on",
    getValue: (item: FutureTransaction) => item.created_on || "",
  },
  {
    sortable: true,
    type: "string",
    field: "source_type",
    getValue: (item: FutureTransaction) => item.source_name || "",
  },
  { sortable: false },
  { sortable: false },
];

const FutureTransactionsPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = targetEmployeeId || currentEmployee?.employee || "";

  const ItemComponent = useCallback(
    (props: { item: FutureTransaction }) => (
      <FutureTransactionRowItem item={props.item} />
    ),
    [],
  );

  const tableContent = (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Future Transactions</Typography>
            <Typography variant="bodySmall" color="body2">
              Employment Details Transactions
            </Typography>
          </div>
        </div>
      )}

      {/* Table + DataListView */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-6">
        <CardTable
          columnWidths={COLUMN_WIDTHS}
          titles={COLUMN_TITLES}
          columnSortConfig={COLUMN_SORT_CONFIG}
        >
          {employeeId ? (
            <DataListView<FutureTransaction>
              queryKey={["future-transactions", employeeId]}
              customAPI={{
                method:
                  "cn_hrms_core.cn_hrms_core.apis.employee_history.get_future_field_transactions",
                params: { employee: employeeId },
              }}
              ItemComponent={ItemComponent}
              SkeletonComponent={CardSkeleton}
              pageSize={10}
              isSearch={true}
              isFilter={false}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              showRefreshButton={false}
              enableUrlParams={false}
            />
          ) : (
            <></>
          )}
        </CardTable>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Future Transactions">
        <div className="flex flex-col h-full">{tableContent}</div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title="Future Transactions" onBack={() => navigate(-1)} />
      </header>
      <main className="flex-grow flex flex-col w-full max-w-full overflow-hidden">
        {tableContent}
      </main>
    </div>
  );
};

export default FutureTransactionsPage;
