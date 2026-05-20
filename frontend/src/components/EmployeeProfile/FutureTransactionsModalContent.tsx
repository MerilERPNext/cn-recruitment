import { useCallback } from "react";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import DataListView from "../DataListView";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import { ColumnSortConfig } from "../shared/CardTableContext";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { X } from "lucide-react";
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

interface FutureTransactionsModalContentProps {
  onClose: () => void;
}

const FutureTransactionsModalContent: React.FC<FutureTransactionsModalContentProps> = ({ onClose }) => {
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

  return (
    <div className="flex flex-col  h-full bg-white sm:max-h-[90vh]">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <Typography variant="h4" className="font-bold text-gray-900">
            Future Transactions
          </Typography>
          <Typography variant="bodySmall" color="secondary" className="mt-1">
            Employment Details Transactions
          </Typography>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* Table + DataListView */}
      <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
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
};

export default FutureTransactionsModalContent;
