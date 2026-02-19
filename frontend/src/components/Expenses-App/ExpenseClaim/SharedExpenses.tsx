import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DataListView from "../../DataListView";
import HeaderBar from "../../HeaderBar";
import CardTable from "../../shared/CardTable";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Draft":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const SharedExpenseCard: React.FC<{ item: any }> = ({ item }) => {
  const formattedSanctioned = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.total_sanctioned_amount ?? 0);

  const postingDate = item?.posting_date
    ? new Date(item.posting_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  return (
    <div className="rounded-xl my-1 border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <p className="card-title">Shared by</p>
          <p className="card-subtitle">{item.employee_name}</p>
        </div>

        <div className="text-right flex flex-col gap-1">
          <p className="card-title">Sanctioned</p>
          <p className="card-subtitle">{formattedSanctioned}</p>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex flex-col gap-1">
          <p>
            <span className="card-title">Posting:</span>
            <span className="pl-2">{postingDate}</span>
          </p>
          <p>
            <span className="card-title pr-2">Status:</span>
            <span
              className={`px-2 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(
                item.status,
              )}`}
            >
              {item.status === "Draft" ? "Pending" : item.status}
            </span>
          </p>
        </div>

        <div className="text-right">
          <p>
            <span className="card-title">Share:</span>
            <span className="pl-2 card-subtitle">
              {item.participant_info?.percentage ?? "-"}%
            </span>
          </p>
          <p>
            <span className="card-title">Amount:</span>
            <span className="pl-2 card-subtitle">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(item.participant_info?.allocated_amount ?? 0)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

const SharedExpensesRow: React.FC<{ item: any }> = ({ item }) => {
  const postingDate = item?.posting_date
    ? new Date(item.posting_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";
  const expenseDate = item?.expenses[0]?.expense_date
    ? new Date(item.posting_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
    >
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
  const { data: currentEmployee } = useCurrentEmployee();

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Shared Expense Claims</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your shared expense claims
            </Typography>
          </div>
        </div>
      )}

      {!isDesktop && (
        <div className="flex-shrink-0">
          <div className="py-1">
            <HeaderBar
              title="Shared Expense Claims"
              onBack={() => navigate(-1)}
              className="shadow"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Shared By",
            "Posting Date",
            "Expense Date",
            "Status",
            "Sanctioned Amount",
            "% Share",
            "Allocated Amount",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]}
        >
          <DataListView
            queryKey={["shared-expenses", currentEmployee?.name ?? ""]}
            customAPI={{
              method:
                "chatnext_expense_trips.expense_claim.get_shared_expenses_for_employee",
            }}
            // Removed click handlers: rows/cards are no longer clickable
            ItemComponent={(props: { item: any }) => {
              const row = props.item?.message?.data
                ? props.item.message.data
                : props.item;
              const doc = Array.isArray(row) ? row[0] : row;
              return isDesktop ? (
                <SharedExpensesRow item={doc} />
              ) : (
                <SharedExpenseCard item={doc} />
              );
            }}
            SkeletonComponent={CardSkeleton}
            onRefetchComplete={() => setRefetchAttendance(false)}
            refetchTrigger={refetchAttendance}
            isSearch={false}
            isFilter={false}
            showRefreshButton={false}
            orderBy="posting_date desc"
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
          />
        </CardTable>
      </div>
    </div>
  );
};

export default SharedExpenses;
