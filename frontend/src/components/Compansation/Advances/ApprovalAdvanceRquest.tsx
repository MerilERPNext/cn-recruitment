/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceDetailsModal from "./Component/AdvanceViewDetailsModel";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";
import { useNavigate, useSearchParams } from "react-router-dom";

const TeamAdvanceRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback((item: any) => {
    const todo_id = item?.data?.todo_id ;
    const document_name = item?.data?.reference_document?.name ;
    navigate(`?todo_id=${todo_id}&document_name=${document_name}`);
  }, [navigate]);
  

  useEffect(() => {
    const todo_id = searchParams.get("todo_id");
    const document_name = searchParams.get("document_name");
  
    if (!todo_id && !document_name) return;
  
    const fetchData = async () => {
      try {
        if (document_name) {
          const res = await fetch(`/api/method/cn_hrms_core.api.get_reference_doc?todo_id=${undefined}&reference_name=${document_name}`);
          const data = await res.json();
  
          setSelectedItem({
            data: data.data,
            onAction: () => {},
            loadingAction: false,
          });
        }
        else if (todo_id) {
          const res = await fetch(`/api/method/cn_hrms_core.api.get_reference_doc?todo_id=${todo_id}&reference_name=${undefined}`);
          const data = await res.json();
          setSelectedItem({
            data: data.message,
            onAction: () => {},
            loadingAction: false,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
  
    fetchData();
  }, [searchParams]);



const handleClose = () => {
  setSelectedItem(null);
  navigate("");
};

  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employee Name",
        "Advance Type",
        "Amount",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ]
    : [
        "Employee Name",
        "Advance Type",
        "Amount",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0 px-2">
          <div className="px-4 py-1 md:py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          <ApprovalList
            status="Pending"
            doctype={"Employee Advance"}
            pageSize={10}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            isSearch={true}
            isFilter={true}
            columnWidths={tableColumnWidths}
            onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
            filterFields={[
              {
                fieldname: "status",
                label: "Status",
                fieldtype: "Select",
                options: [
                  { label: "Pending", value: "Pending" },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                ],
              },
            ]}
            defaultFilters={{ status: "Pending" }}
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item: any) => (
              <ApprovalRejectionAdvanceList
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                onClick={() => handleRequestClick(item)}
                loadingAction={item?.loadingAction}
                isBulkSelectEnabled={isBulkSelectEnabled}
              />
            )}
          />
        </CardTable>
      </div>

      <AdvanceDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={handleClose}
      />
    </div>
  );
};

export default TeamAdvanceRequest;
