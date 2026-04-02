/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceApprovalCard from "./AdvanceApprovalCard";
import TeamAdvanceDetailView from "./TeamAdvanceDetailView";

const TeamAdvanceExpenseList = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const [activeStatus, setActiveStatus] = useState("Pending");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");
  const status = searchParams.get("status");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        const computedStatus =
          request.todo_status === "Closed" &&
          request.reference_document.custom_final_status !== "Rejected"
            ? "Approved"
            : request.reference_document.custom_final_status;

        setSearchParams({
          requestId: request.todo_id,
          reference_name: request?.reference_document?.name || "",
          status: computedStatus,
        });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const { isDesktop } = useScreenSize();
  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Advance ID",
        "Employee",
        "Department",
        "Advance Amount",
        "Due Date",
        "Status",
        ...(activeStatus === "Approved" ? ["Paid Status"] : []),

        "ACTIONS",
      ]
    : [
        "Advance ID",
        "Employee",
        "Department",
        "Advance Amount",
        "Due Date",
        "Status",
        ...(activeStatus === "Approved" ? ["Paid Status"] : []),

        "ACTIONS",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? activeStatus === "Approved"
      ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
      : ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : activeStatus === "Approved"
      ? ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
      : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const noRecordsScreen = (filters: Record<string, any>) => {
    if (isDesktop) return null;

    const getEmptyStateMessage = () => {
      const status = filters.status;
      const messages: Record<string, { title: string; description: string }> = {
        Pending: {
          title: "No Pending Requests",
          description: "You have no team advance requests to review.",
        },
        Approved: {
          title: "No Approved Advances",
          description: "There are no approved advance requests.",
        },
        Rejected: {
          title: "No Rejected Advances",
          description: "There are no rejected advance requests.",
        },
      };

      return (
        messages[status] || {
          title: "No Advance Requests",
          description: "No advance requests match your filters.",
        }
      );
    };

    const message = getEmptyStateMessage();

    return <NoDataFound title={message.title} subtitle={message.description} />;
  };

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance expense requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          {currentUser?.name && (
            <ApprovalList
              doctype={"Employee Advance"}
              refetch={refetchApprovalList}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              isSearch={true}
              isFilter={true}
              columnWidths={tableColumnWidths}
              onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
              filterFields={[
                {
                  fieldname: "custom_final_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    {
                      label: "Pending",
                      key: "Pending",
                      value: "Pending",
                      customAPIParams: { todo_status: "Open" },
                    },
                    {
                      label: "Approved",
                      key: "Approved",
                      value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                      customAPIParams: { todo_status: "Closed" },
                    },
                    {
                      label: "Rejected",
                      key: "Rejected",
                      value: "Rejected",
                    },
                  ],
                  emptyValueConfig: {
                    filterValue: ["!=", "Cancelled"],
                  },
                },
              ]}
              defaultFilters={{ custom_final_status: "Pending" }}
              orderBy="posting_date desc"
              SkeletonComponent={CardSkeleton}
              onActiveFiltersChange={(filters) => {
                setActiveStatus(filters?.custom_final_status || "Pending");
              }}
              noRecordsScreen={noRecordsScreen}
              renderCardContent={(item) => {
                if (
                  item?.data?.custom_selected_doctype_action === "Send Back"
                ) {
                  return null;
                }

                return (
                  <AdvanceApprovalCard
                    data={item?.data}
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    loadingAction={item?.loadingAction}
                    isBulkSelectEnabled={isBulkSelectEnabled}
                    onClick={(request: any) => handleRequestClick(request)}
                    onAction={item?.onAction}
                    activeStatus={activeStatus}
                  />
                );
              }}
            />
          )}
        </CardTable>
      </div>
      {(requestId || referenceName) && (
        <TeamAdvanceDetailView
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Employee Advance"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
          status={status || undefined}
        />
      )}
    </div>
  );
};

export default TeamAdvanceExpenseList;
