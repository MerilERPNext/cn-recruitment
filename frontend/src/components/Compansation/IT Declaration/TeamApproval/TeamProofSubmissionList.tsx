/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FileText } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useScreenSize } from "../../../../hooks/useScreenSize";
import ApprovalList from "../../../shared/ApprovalList";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
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
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <FileText className="w-10 h-10 mx-auto text-blue-400 mb-3" />
        <Typography variant="h4">No Proof Requests</Typography>
        <Typography variant="bodySmall">
          No proof submission requests available.
        </Typography>
      </div>
    </div>
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
