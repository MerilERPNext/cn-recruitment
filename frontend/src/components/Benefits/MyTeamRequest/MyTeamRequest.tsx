"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { BenefitRequestDetailModal } from "../BenefitRequestDetailModal";
import BenefitRequestItem from "./BenefitRequestItem";
import { ColumnSortConfig } from "../../shared/CardTable";
import { BenefitType } from "../../../types/benefit";

const BASE_COLUMN_SORT_CONFIG_TEAM: ColumnSortConfig[] = [
  { sortable: false },
  {
    sortable: true,
    type: "string",
    field: "earning_component",
    getValue: (item: BenefitType) =>
      item.reference_document?.earning_component ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "claimed_amount",
    getValue: (item: BenefitType) =>
      item.reference_document?.claimed_amount ?? 0,
  },
  {
    sortable: true,
    type: "number",
    field: "custom_max_amount",
    getValue: (item: BenefitType) =>
      item.reference_document?.custom_max_amount ?? 0,
  },
  {
    sortable: true,
    type: "date",
    field: "claim_date",
    getValue: (item: BenefitType) => item?.reference_document?.claim_date ?? "",
  },
  { sortable: false },
  { sortable: false },
];

const MyTeamRequest: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request?.reference_document?.name || "",
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
  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee Name",
      "Claim Benefit For",
      "Claimed Amount",
      "Max Amount Eligible",
      "Claim Date",
      "Status",
      "Actions",
    ]
    : [
      "Employee Name",
      "Claim Benefit For",
      "Claimed Amount",
      "Max Amount Eligible",
      "Claim Date",
      "Status",
      "Actions",
    ];

  const finalColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const columnSortConfig = useMemo<ColumnSortConfig[]>(
    () =>
      isBulkSelectEnabled
        ? [{ sortable: false }, ...BASE_COLUMN_SORT_CONFIG_TEAM]
        : BASE_COLUMN_SORT_CONFIG_TEAM,
    [isBulkSelectEnabled],
  );


  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Benefit Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team benefit requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={finalColumnWidths}
          columnSortConfig={columnSortConfig}
        >
          <ApprovalList
            doctype={"Employee Benefit Claim"}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            isSearch={true}
            isFilter={true}
            columnWidths={finalColumnWidths}
            onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
            filterFields={[
              {
                fieldname: "custom_status",
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
            defaultFilters={{ custom_status: "Pending" }}
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item) => {
              if (item?.data?.custom_selected_doctype_action === "Send Back") {
                return null;
              }
              return (
                <BenefitRequestItem
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={(request) => handleRequestClick(request)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              );
            }}
          />
        </CardTable>
      </div>
      {(requestId || referenceName) && (
        <BenefitRequestDetailModal
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Benefit Request"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default MyTeamRequest;
