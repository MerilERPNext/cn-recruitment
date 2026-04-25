import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DataListView from "../../DataListView";
import HeaderBar from "../../HeaderBar";
import CardTable from "../../shared/CardTable";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import Button from "../../shared/atoms/Button";
import { FileText } from "lucide-react";

export const SharedExpenseCard: React.FC<{ item: any }> = ({ item }) => {
  const formattedSanctioned = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.total_sanctioned_amount ?? 0);

  const formattedAllocated = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.participant_info?.allocated_amount ?? 0);

  const postingDate = item?.posting_date
    ? formatToIndianDate(item?.posting_date)
    : "—";

  return (
    <div className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl">
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Row 1: Shared by + Status */}

        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Shared by</Typography>
            <Typography variant="mobileCardValue">
              {`${item.employee_name} (${item.employee})`}
            </Typography>
          </div>
          <StatusBadge
            status={item.status === "Draft" ? "Pending" : item.status}
          />
        </div>

        {/* Row 2: Posting Date + Sanctioned */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Posting Date</Typography>
            <Typography variant="mobileCardValue">{postingDate}</Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Sanctioned</Typography>
            <Typography variant="mobileCardValue">
              {formattedSanctioned}
            </Typography>
          </div>
        </div>

        {/* Row 3: Share % + Allocated Amount */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Share</Typography>
            <Typography variant="mobileCardValue">
              {item.participant_info?.percentage ?? "—"}%
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Allocated Amount</Typography>
            <Typography variant="mobileCardValue">
              {formattedAllocated}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SharedExpensesRow: React.FC<{ item: any }> = ({ item }) => {
  const expenseDate = item?.expenses[0]?.expense_date
    ? formatToIndianDate(item?.expenses[0]?.expense_date)
    : "—";

  const postingDate = item?.posting_date
    ? formatToIndianDate(item?.posting_date)
    : "—";
    
  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
    >
      <Typography
        variant="bodySmall"
        className="font-medium text-center truncate block w-full"
      >
        {item.employee}
      </Typography>
      <Link
        to={`/webapp/employee-profile?target_user=${item.employee}`}
        target="_blank"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          <WrapperHoverCard employeeId={item.employee}>
            {item.employee_name}
          </WrapperHoverCard>
        </Typography>
      </Link>
      <Typography variant="bodySmall" className="font-medium text-center">
        {postingDate}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {expenseDate}
      </Typography>

      <div className="flex items-center justify-center">
        <StatusBadge status={item.status} />
      </div>

      <Typography variant="bodySmall" className="font-medium text-center">
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(item.total_sanctioned_amount ?? 0)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.participant_info?.percentage ?? "-"}%
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(item.participant_info?.allocated_amount ?? 0)}
      </Typography>
    </div>
  );
};

const SharedExpenses: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails();

  return (
    <div className="flex flex-col min-h-screen">
      {isDesktop && (
        <div className="flex-shrink-0 flex items-center justify-between">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Shared Expense Claims</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your shared expense claims
            </Typography>
          </div>
          <Button
            icon={<FileText size={16} />}
            variant="outline"
            size="md"
            className="rounded-xl hover:bg-blue-100 py-1"
            onClick={() => navigate(-1)}
          >
            My Expense
          </Button>
        </div>
      )}

      {!isDesktop && (
        <div className="sticky top-0 z-50 bg-white flex-shrink-0">
          <HeaderBar
            title="Shared Expense Claims"
            onBack={() => navigate(-1)}
            className="shadow"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-5 md:pb-20">
        {isDesktop ? (
          <CardTable
            titles={[
              "Employee ID",
              "Shared By",
              "Posting Date",
              "Expense Date",
              "Status",
              "Sanctioned Amount",
              "% Share",
              "Allocated Amount",
            ]}
            columnWidths={[
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
            ]}
          >
            <DataListView
              queryKey={["shared-expenses", currentEmployee?.name ?? ""]}
              customAPI={{
                method:
                  "chatnext_expense_trips.expense_claim.get_shared_expenses_for_employee",
              }}
              ItemComponent={(props: { item: any }) => {
                const row = props.item?.message?.data
                  ? props.item.message.data
                  : props.item;
                const doc = Array.isArray(row) ? row[0] : row;
                return <SharedExpensesRow item={doc} />;
              }}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
              showRefreshButton={false}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
            />
          </CardTable>
        ) : (
          <div className="space-y-3 px-3 pt-3">
            <DataListView
              queryKey={["shared-expenses", currentEmployee?.name ?? ""]}
              customAPI={{
                method:
                  "chatnext_expense_trips.expense_claim.get_shared_expenses_for_employee",
              }}
              ItemComponent={(props: { item: any }) => {
                const row = props.item?.message?.data
                  ? props.item.message.data
                  : props.item;
                const doc = Array.isArray(row) ? row[0] : row;
                return <SharedExpenseCard item={doc} />;
              }}
              SkeletonComponent={CardSkeleton}
              onRefetchComplete={() => setRefetchAttendance(false)}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
              showRefreshButton={false}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedExpenses;
