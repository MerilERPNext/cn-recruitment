/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useScreenSize } from "../../../../hooks/useScreenSize";
import ApprovalList from "../../../shared/ApprovalList";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import TeamProofApprovalCard from "./TeamProofApprovalCard";

const TeamProofSubmissionList = () => {
  const [refetch, setRefetch] = useState(false);

  const navigate = useNavigate();

  const { isDesktop } = useScreenSize();

  // ---------------- Row Click ----------------
  const handleRowClick = useCallback(
    (row: any) => {
      const referenceId = row?.reference_document?.name || row?.todo_id;

      if (referenceId) {
        navigate(
          `/webapp/salary-slip-app/team-approval-it-declaration/${referenceId}`,
        );
      }
    },
    [navigate],
  );

  const titles = [
    "Employee",
    "Category",
    "Regime Type",
    "Actual Amount",
    "Status",
    "Actions",
  ];

  const columnWidths: string[] = ["1fr", "2fr", "2fr", "1fr", "1fr", "1fr"];

  // ---------------- Empty Screen ----------------
  const noRecordsScreen = () => (
    <NoDataFound
      title="No Proof Requests"
      subtitle="No proof submission requests available."
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {isDesktop && (
        <div className="px-6 py-4">
          <Typography variant="h4">Team Proof Approval Requests</Typography>
          <Typography variant="bodySmall" color="body2">
            Review and manage proof submissions
          </Typography>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-20">
        <CardTable titles={titles} columnWidths={columnWidths}>
          <ApprovalList
            doctype="Employee Tax Exemption Proof Submission"
            refetch={refetch}
            setRefetch={setRefetch}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            isSearch
            isFilter
            filterFields={[
              {
                fieldname: "status",
                label: "Status",
                fieldtype: "Select",
                options: ["Draft", "Approved", "Rejected"],
              },
            ]}
            defaultFilters={{ status: "Draft" }}
            columnWidths={columnWidths}
            SkeletonComponent={CardSkeleton}
            noRecordsScreen={noRecordsScreen}
            bulkSelectVisible={false}
            renderCardContent={(item) => (
              <TeamProofApprovalCard
                data={item.data}
                loadingAction={item.loadingAction}
                onAction={item.onAction}
                onClick={handleRowClick}
              />
            )}
          />
        </CardTable>
      </div>
    </div>
  );
};

export default TeamProofSubmissionList;
