"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Modal from "../CommonModel";
import BenefitRequestForm from "./BenefitsRequestForm";
import CardTable from "../../shared/CardTable";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import Button from "../../shared/atoms/Button";
import {
  useCurrentEmployeeIdCard,
  useEmployee,
} from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { createPortal } from "react-dom";
import {
  BenefitPayslip,
  useGetBenefitClaimLockingPeriod,
  useGetBenefitRequestLockView,
  useGetYearFilterOptions,
} from "../../../hooks/useBenefit";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CustomDropdown from "../../shared/CustomDropdown";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { Typography } from "../../shared/atoms/Typography";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { Link } from "react-router-dom";
import { getCurrentPeriod } from "../shared/logic";
import StatusBadge from "../../shared/atoms/statusBadge";
import { formatCurrency } from "../../../utils/currency";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";

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

  // const [refetch, setRefetch] = useState(false);
  const handleRequestBenefit = () => {
    setShowBenefitForm(true);
  };

  const { data: employeeIdCard } = useCurrentEmployeeIdCard();
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
              {showBenefitRequestButton && (
                <Button
                  bgColor="blue-600"
                  size="md"
                  className="hover:bg-blue-700 py-[0.55rem] font-semibold px-4 text-white"
                  onClick={handleRequestBenefit}
                >
                  Request Benefit
                </Button>
              )}
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
            SkeletonComponent={CardSkeleton}
            // refetchTrigger={refetchAttendance}
            isSearch={false}
            isFilter={false}
            showRefreshButton={false}
            // orderBy="creation desc"
            pageSize={10}
            infiniteScroll={true}
            showPagination={true}
            // loadMorePagination={false}
            getItemKey={(item) => item.name}
          />
        </CardTable>
      </div>
      {showBenefitForm &&
        createPortal(
          <Modal onClose={handleCloseModal}>
            <BenefitRequestForm
              docname={benefitId}
              isOpen={showBenefitForm}
              onClose={handleCloseModal}
              onSuccess={() => {
                // setRefetch(true);
              }}
            />
          </Modal>,
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
    <div className="px-6 flex flex-col items-center cursor-pointer border-t border-gray-300 pt-2 mt-4">
      <div className="flex w-full items-center">
        <div className="flex flex-col">
          <Link
            to={`/webapp/employee-profile?target_user=${item?.employee}`}
            target="_blank"
          >
            <span className="text-sm font-medium text-gray-700 text-start truncate">
              {item?.employee_name}
            </span>
          </Link>
          <span className="text-sm font-medium text-gray-700 text-start truncate">
            {item?.company}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={item?.custom_status} />
          <MyApprovalActionPill
            isPending={item.custom_status === "Pending"}
            canEdit={!!item.can_edit}
            onEdit={() => handleEdit(item.name)}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 w-full mt-2">
        <div className="flex flex-col">
          <label className="text-gray-500 text-sm">Benefit For</label>
          <span className="text-sm justify-self-center font-medium text-gray-700 text-start truncate">
            {item?.earning_component}
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <label className="text-gray-500 text-center text-sm">
            Claime Date
          </label>
          <span className="text-sm justify-self-center font-medium text-gray-700 text-center truncate">
            {formatToIndianDate(item?.claim_date || "")}
          </span>
        </div>
        <div className="flex ml-auto flex-col">
          <label className="text-gray-500 text-sm">Claim Amount</label>
          <span
            className={`text-sm justify-self-end font-medium text-gray-700 text-end truncate ${maskAmounts ? "blur-[3px]" : ""
              }`}
          >
            {formatCurrency(
              maskAmounts ? "#####" : (item?.claimed_amount ?? 0),
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MyRequests;
