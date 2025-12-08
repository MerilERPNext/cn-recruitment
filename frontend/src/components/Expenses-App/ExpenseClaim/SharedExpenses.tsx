import React from "react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DataListView from "../../DataListView";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

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
                item.status
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
      className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 0.7fr 0.7fr" }}
    >
      <span>{item.employee_name || "-"}</span>
      <span>{postingDate}</span>
      <span>{expenseDate}</span>

      <span
        className={`px-2 py-1 rounded-2xl w-fit text-xs font-medium text-center ${getStatusBadgeClasses(
          item.status
        )}`}
      >
        {item.status === "Draft" ? "Pending" : item.status}
      </span>

      <span>
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(item.total_sanctioned_amount ?? 0)}
      </span>
      <span>{item.participant_info?.percentage ?? "-"}%</span>
      <span>
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(item.participant_info?.allocated_amount ?? 0)}
      </span>
    </div>
  );
};

const SharedExpenses: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2 flex justify-between">
        <div>
          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
        <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
      </div>
    </div>
  );

  return (
    <div
      className="relative flex size-full flex-col group/design-root md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-200">
        {!isDesktop ? (
          <div className="flex w-full pb-2 justify-between items-center">
            <button onClick={() => navigate(-1)}>
              <ChevronLeft className="text-gray-500" />
            </button>

            <h2 className="base-title pb-1">Shared Expense Claims</h2>
            <div className="min-w-8"></div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-gray-800 pb-1">
            Shared Expense Claims
          </h2>
        )}
      </div>

      <div className="bg-white h-full px-0 md:pt-2 pt-0 mb-20">
        {currentEmployee?.name && (
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
            columnWidths={[
              "1.5fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "0.7fr",
              "0.7fr",
            ]}
          >
            <DataListView
              queryKey={["shared-expenses", currentEmployee?.name]}
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
              infiniteScroll={true}
              showPagination={true}
              loadMorePagination={false}
            />
          </CardTable>
        )}
      </div>
    </div>
  );
};

export default SharedExpenses;
