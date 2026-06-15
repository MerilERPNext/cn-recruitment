"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { Link, useOutletContext } from "react-router-dom";
import { useTargetUser } from "../../../context/ViewedUserContext";
import {
  BenefitPayslip,
  useGetBenefitClaimLockingPeriod,
  useGetBenefitRequestLockView,
  useGetSalaryComponentFilters,
  useGetYearFilterOptions,
} from "../../../hooks/useBenefit";
import {
  useCurrentEmployeeIdCard,
  useEmployee,
} from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { formatCurrency } from "../../../utils/currency";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { isActionEnabled } from "../../../utils/uiPermission";
import DataListView from "../../DataListView";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import CustomDropdown from "../../shared/CustomDropdown";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { getCurrentPeriod } from "../shared/logic";
import BenefitRequestForm from "./BenefitsRequestForm";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import { TodoType } from "../../../types/todos";
import { useRevokeEvent } from "../../../hooks/userApprovalList";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { queryClient } from "../../../providers/QueryProvider";
import { getAssignedUsersCell } from "../../../utils/getAssignedUsersCell";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: false,
  },
  {
    sortable: false,
  },
  {
    sortable: true,
    type: "date",
    field: "earning_component",
    getValue: (item: BenefitPayslip) =>
      item.earning_component ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "claim_date",
    getValue: (item: BenefitPayslip) =>
      item?.claim_date ?? "",
  }, {
    sortable: true,
    type: "date",
    field: "claimed_amount",
    getValue: (item: BenefitPayslip) =>
      item?.claimed_amount ?? "",
  },
  {
    sortable: true,
    field: "custom_taxable_amount",
    getValue: (item: BenefitPayslip) => item.custom_taxable_amount ?? 0,
  },
  {
    sortable: true,
    field: "custom_non_taxable_amount",
    getValue: (item: BenefitPayslip) => item.custom_non_taxable_amount ?? 0,
  },
  {
    sortable: false,
  },
  {
    sortable: false,
  },
];

const MyRequests: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data: userUiPermission } = useGetUiPermission("Benefits");
  const canRequestBenefit = isActionEnabled(
    userUiPermission,
    "request_benefit",
    "My Requests",
  );



  const { data: employeeIdCard, isLoading: EmployeeIdCardLoading } = useCurrentEmployeeIdCard();
  const { data: employee } = useCurrentEmployeeIdCard();
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  const effectiveEmployee = isViewingOtherUser ? targetEmployee : employee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployee?.name
    : employee?.id;

  const [refetchCounter, setRefetchCounter] = useState(0);

  const handleCloseModal = () => {
    setShowBenefitForm(false);
    setBenefitId(null);
  };

  const { setActionButtonConfig } = useOutletContext<{
    setActionButtonConfig: (
      config: { label: string; onClick: () => void; disabled?: boolean } | null,
    ) => void;
  }>();

  const { data: optionYearsData, isLoading: YearsLoading } =
    useGetYearFilterOptions(effectiveEmployee?.company || "");

  const optionYears = useMemo(() => {
    if (YearsLoading || !optionYearsData) return [];
    else
      return optionYearsData?.map((data) => ({
        label: data?.name,
        value: data?.name,
      }));
  }, [optionYearsData, YearsLoading]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [benefitId, setBenefitId] = useState<string | null>(null);
  const handleEdit = (BenefitId: string) => {
    setBenefitId(BenefitId);
    setShowBenefitForm(true);
  };

  const handleRefetch = () => {
    setTimeout(() => {
      setRefetchCounter((prev) => prev + 1);
    }, 1000);
    queryClient.invalidateQueries({ queryKey: ["benefit_request_list"] });
  };

  useEffect(() => {
    setSelectedYear(() => getCurrentPeriod(optionYears));
  }, [optionYears]);

  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useGetBenefitRequestLockView(
    effectiveEmployeeId || "",
    selectedYear,
    today,
  );
  const [customStatus, setCustomStatus] = useState("All");
  const { data: benefitClaimLock, isLoading: benefitClaimLockLoading } =
    useGetBenefitClaimLockingPeriod(
      effectiveEmployeeId || "",
      selectedYear,
      today,
    );
  const showBenefitRequestButton =
    canRequestBenefit &&
    !benefitClaimLockLoading &&
    benefitClaimLock?.status === "success";

  useEffect(() => {
    if (showBenefitRequestButton) {
      setActionButtonConfig({
        label: "+ Request Benefit",
        onClick: () => {
          setShowBenefitForm(true);
        },
      });
    } else {
      setActionButtonConfig(null);
    }
    return () => setActionButtonConfig(null);
  }, [setActionButtonConfig, showBenefitRequestButton]);

  const LockRequestMessage = useMemo(() => {
    if (!data || isLoading) return null;
    return (
      <div
        className={` text-sm rounded-lg p-4 mt-2 mb-4 ${data?.status === "success" ? "bg-green-300/40" : "bg-red-300/40"
          }`}
      >
        {data?.message}
      </div>
    );
  }, [data, isLoading]);

  const { data: salaryComponentFilters, isLoading: salaryComponentFiltersLoading } = useGetSalaryComponentFilters(
    effectiveEmployeeId || "",
    today,
  );
  const componentArray = salaryComponentFilters?.component_array?.map((item) => ({
    label: item,
    value: item,
  })) ?? [];

  const filterStatusMap = {
    "Open": "Pending",
    "Approved": "Approved",
    "Rejected": "Rejected",
    "Cancelled": "Revoked",
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop && (
              <div>
                <Typography variant="h4">
                  My Benefits Requests for FY {selectedYear}
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your benefits requests
                </Typography>
              </div>
            )}
            <div className="flex items-center flex-wrap lg:justify-between justify-end gap-2 w-full md:w-auto">
              <button
                onClick={() => setMaskAmounts(!maskAmounts)}
                className="my-btn-secondary"
                title={maskAmounts ? "Show amounts" : "Hide amounts"}
              >
                {maskAmounts ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Show Amounts
                    </span>
                    <BsToggleOff className="w-5 h-5 text-gray-400" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Hide Amounts
                    </span>
                    <BsToggleOn className="w-5 h-5 text-primary" />
                  </>
                )}
              </button>
              <CustomDropdown
                position="bottom-left"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event?.target.value)}
                options={optionYears}
              />
              <CustomDropdown
                position="bottom-left"
                value={selectedComponent}
                onChange={(event) => setSelectedComponent(event?.target.value)}
                options={componentArray}

              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {LockRequestMessage}
        <CardTable
          titles={[
            "Employee Name",
            "Assigned To",
            "Company",
            "Claim Benefit For",
            "Claim Date",
            "Created At",
            "Claimed Amount",
            "Taxable Amount",
            "Non Taxable Amount",
            "Status",
            "Actions",
          ]}
          columnSortConfig={COLUMN_SORT_CONFIG}
        >
          <DataListView
            queryKey={[
              "mybenefit-request",
              employeeIdCard?.id || "",
              employeeIdCard?.company || "",
              selectedYear || "",
            ]}
            customAPI={{
              method:
                "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.benefit_data_list_view",
              params: {
                employee: employeeIdCard?.id || "",
                company: employeeIdCard?.company || "",
                payroll_period: selectedYear,
                earning_component: selectedComponent,
                custom_status: customStatus,
              },
            }}
            isFilter={true}
            filterFields={[
              {
                fieldname: "custom_status",
                label: "Status",
                fieldtype: "Select",
                options: [
                  {
                    label: "Pending",
                    key: "Open",
                    value: "Open",
                  },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                  {
                    label: "Revoked",
                    value: "Revoked",
                    excludeFieldFromFilters: true,
                    customAPIParams: { todo_status: "Cancelled" },
                    additionalFilters: {
                      docstatus: 2,
                      custom_allow_revoke: 1,
                    },
                  },
                ],
                emptyValueConfig: {
                  filterValue: ["!=", "Cancelled"],
                },
              },
            ]}
            onFiltersChange={(filter) => setCustomStatus(filterStatusMap[filter.custom_status as "Open" | "Approved" | "Rejected" | "Cancelled"])}
            clientFilterFn={(list) =>
              list.filter(
                (item) =>
                  Array.isArray(item?.todo_list) && item.todo_list.length > 0,
              )
            }
            ItemComponent={(props: { item: BenefitPayslip }) => {
              return (
                <BenefitSlipItem
                  handleEdit={handleEdit}
                  item={props?.item}
                  maskAmounts={maskAmounts}
                  handleRefetch={handleRefetch}
                />
              );
            }}
            isLoading={YearsLoading || EmployeeIdCardLoading || salaryComponentFiltersLoading}
            SkeletonComponent={CardSkeleton}
            refetchTrigger={refetchCounter}
            isSearch={true}
            showRefreshButton={false}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            getItemKey={(item) => item.name}
          />
        </CardTable>
      </div>
      {showBenefitForm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className={
                isDesktop
                  ? "relative bg-white rounded-xl shadow-xl w-[70%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                  : "relative bg-white w-full h-full flex flex-col overflow-hidden"
              }
            >
              <BenefitRequestForm
                docname={benefitId}
                isOpen={showBenefitForm}
                onClose={handleCloseModal}
                onSuccess={handleRefetch}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const MY_REQUESTS_UI_PERMISSION = {
  app: "Benefits",
  page: "My Requests",
  actionKeysMap: {
    edit: "edit",
    revoke: "revoke",
    nudge: "nudge"
  }
};

const BenefitSlipItem = ({
  item,
  maskAmounts,
  handleEdit,
  handleRefetch
}: {
  item: BenefitPayslip;
  maskAmounts: boolean;
  handleEdit: (benefitId: string) => void;
  handleRefetch: () => void;
}) => {
  const { isDesktop } = useScreenSize();
  const todo: TodoType | null = (Array.isArray(item.todo_list) && item.todo_list.length > 0) ? item.todo_list[0] : null;
  const [isActed, setIsActed] = useState(false);

  const canEdit = todo?.can_edit === true && !isActed;
  const canRevoke =
    todo?.custom_allow_revoke === 1 &&
    item?.custom_status === "Pending" &&
    !isActed;
  const badgeStatus =
    todo?.custom_allow_revoke &&
      item?.custom_status === "Cancelled" &&
      todo?.todo_status?.toLowerCase?.() === "cancelled"
      ? "Revoked"
      : item?.custom_status;
  const revokeEventMutation = useRevokeEvent();
  const loading = useLoadingOverlay();
  const formattedCreationDate = formatToIndianDate(item?.todo_list?.[0].reference_document?.creation ?? "");

  const handleRevokeClick = () => {
    if (todo?.todo_id) {
      loading?.show("Revoking Request...");
      revokeEventMutation.mutate(
        {
          docname: todo?.reference_name,
          doctype: todo?.reference_type,
          todo: todo?.todo_id,
        },
        {
          onSuccess: () => {
            setIsActed(true);
            setTimeout(() => {
              handleRefetch();
            }, 2000);
            toast.success("Benefit Request Revoked Successfully!");
          },
          onError: (error) => {
            const formatedError = errorResponseFormater(error);
            toast.error(formatedError);
          },
          onSettled: () => {
            loading?.hide();
          },
        },
      );
    }
  };

  return isDesktop ? (
    <div className="grid grid-cols-9 max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer">
      <Link
        to={`/webapp/employee-profile?target_user=${item?.employee}`}
        target="_blank"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          <WrapperHoverCard employeeId={item?.employee}>
            {item?.employee_name}
          </WrapperHoverCard>
        </Typography>
      </Link>
      <Typography variant="bodySmall" className="font-medium text-center">
        {getAssignedUsersCell(item?.todo_list?.[0])}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.company}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.earning_component}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item?.claim_date || "")}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedCreationDate}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        <span className={`${maskAmounts ? "blur-[3px]" : ""}`}>
          {maskAmounts ? "₹#####" : formatCurrency(item?.claimed_amount ?? 0)}
        </span>
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        <span className={` ${maskAmounts ? "blur-[3px]" : ""}`}>
          {formatCurrency(maskAmounts ? "#####" : item?.custom_taxable_amount)}
        </span>
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        <span className={`${maskAmounts ? "blur-[3px]" : ""}`}>
          {formatCurrency(
            maskAmounts ? "#####" : item?.custom_non_taxable_amount,
          )}
        </span>
      </Typography>

      <div className="flex items-center justify-center">
        <AllocatedToTooltip
          position="left"
          users={item?.todo_list[0]?.allocated_to}
          RoleAssignedUsers={item?.todo_list[0]?.role_assigned_users}
          roles={item?.todo_list[0]?.allocated_roles}
          role={item?.todo_list[0]?.role ?? ""}
        >
          <StatusBadge status={badgeStatus} />
        </AllocatedToTooltip>
      </div>

      <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
        <MyApprovalActionPill
          uiPermission={MY_REQUESTS_UI_PERMISSION}
          canEdit={canEdit}
          canRevoke={canRevoke}
          onRevoke={handleRevokeClick}
          onEdit={() => handleEdit(item.name)}
          todoId={item?.todo_list[0]?.todo_id}
          isPendingStatus={badgeStatus === "Pending"}
        />
      </div>
    </div>
  ) : (
    <div className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mt-2 w-full">
      <div className="p-4 flex items-start gap-3 w-full">
        <div className="w-full">
          {/* Header: Benefit For + Status */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0 flex-1 mr-3">
              <Typography variant="mobileCardLabel" className="block">
                Benefit For
              </Typography>
              <Typography variant="mobileCardTitle" className="break-words">
                {item?.earning_component}
              </Typography>
            </div>
            <div className="shrink-0">
              <StatusBadge status={badgeStatus} />
            </div>
          </div>

          {/* Row: Employee Name + Company */}
          <div className="flex justify-between mt-4">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="block">
                Employee Name
              </Typography>
              <Link
                to={`/webapp/employee-profile?target_user=${item?.employee}`}
                target="_blank"
              >
                <Typography variant="mobileCardValue">
                  {item?.employee_name}
                </Typography>
              </Link>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel" className="block">
                Company
              </Typography>
              <Typography variant="mobileCardValue">
                {item?.company}
              </Typography>
            </div>
          </div>

          {/* Row: Claim Date + Claim Amount */}
          <div className="flex justify-between mt-4">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="block">
                Claim Date
              </Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(item?.claim_date || "")}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel" className="block">
                Claim Amount
              </Typography>
              <Typography
                variant="mobileCardValue"
                className={maskAmounts ? "blur-[3px]" : ""}
              >
                {maskAmounts
                  ? "#####"
                  : formatCurrency(item?.claimed_amount ?? 0)}
              </Typography>
              <Typography variant="mobileCardLabel" className="block">
                Assigned To
              </Typography>
              <Typography
                variant="mobileCardValue"
                className={maskAmounts ? "blur-[3px]" : ""}
              >
                {getAssignedUsersCell(item?.todo_list?.[0])}

              </Typography>
            </div>
          </div>

          {/* Row: Taxable Amount + Non Taxable Amount */}
          <div className="flex justify-between mt-4">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="block">
                Taxable Amount
              </Typography>
              <Typography
                variant="mobileCardValue"
                className={maskAmounts ? "blur-[3px]" : ""}
              >
                {maskAmounts
                  ? "#####"
                  : formatCurrency(item?.custom_taxable_amount ?? 0)}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel" className="block">
                Non Taxable Amount
              </Typography>
              <Typography
                variant="mobileCardValue"
                className={maskAmounts ? "blur-[3px]" : ""}
              >
                {maskAmounts
                  ? "#####"
                  : formatCurrency(item?.custom_non_taxable_amount ?? 0)}
              </Typography>
            </div>
          </div>

          {/* Actions */}
          <div className={`mt-4 ${isActed ? "pointer-events-none opacity-50" : ""}`}>
            <MyApprovalActionPill
              uiPermission={MY_REQUESTS_UI_PERMISSION}
              canEdit={canEdit}
              canRevoke={canRevoke}
              onRevoke={handleRevokeClick}
              onEdit={() => handleEdit(item.name)}
              variant="buttons"
              todoId={item?.todo_list[0]?.todo_id}
              isPendingStatus={badgeStatus === "Pending"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRequests;
