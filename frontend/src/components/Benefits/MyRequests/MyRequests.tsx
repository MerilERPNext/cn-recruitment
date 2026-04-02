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
import CardTable from "../../shared/CardTable";
import CustomDropdown from "../../shared/CustomDropdown";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { getCurrentPeriod } from "../shared/logic";
import BenefitRequestForm from "./BenefitsRequestForm";

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

  const [benefitId, setBenefitId] = useState<string | null>(null);
  const handleEdit = (BenefitId: string) => {
    setBenefitId(BenefitId);
    setShowBenefitForm(true);
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
            <div className="flex items-center justify-between gap-2 w-full md:w-auto">
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {LockRequestMessage}
        <CardTable
          titles={[
            "Employee Name",
            "Company",
            "Claim Benefit For",
            "Claim Date",
            "Claimed Amount",
            "Taxable Amount",
            "Non Taxable Amount",
            "Status",
            "Actions",
          ]}
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
              },
            }}

            ItemComponent={(props: { item: BenefitPayslip }) => {
              return (
                <BenefitSlipItem
                  handleEdit={handleEdit}
                  item={props?.item}
                  maskAmounts={maskAmounts}
                />
              );
            }}
            isLoading={YearsLoading || EmployeeIdCardLoading}
            SkeletonComponent={CardSkeleton}
            // refetchTrigger={refetchAttendance}
            isSearch={false}
            isFilter={false}
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
                onSuccess={() => {
                  // setRefetch(true);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const BenefitSlipItem = ({
  item,
  maskAmounts,
  handleEdit,
}: {
  item: BenefitPayslip;
  maskAmounts: boolean;
  handleEdit: (benefitId: string) => void;
}) => {
  const { isDesktop } = useScreenSize();

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
        {item?.company}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {item?.earning_component}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item?.claim_date || "")}
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
        <StatusBadge status={item?.custom_status} />
      </div>

      <div className="flex items-center justify-center">
        <MyApprovalActionPill
          isPending={item.custom_status === "Pending"}
          canEdit={!!item.can_edit}
          onEdit={() => handleEdit(item.name)}
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
              <StatusBadge status={item?.custom_status} />
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
          <div className="mt-4">
            <MyApprovalActionPill
              isPending={item.custom_status === "Pending"}
              canEdit={!!item.can_edit}
              canReplace={true}
              variant="buttons"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRequests;
