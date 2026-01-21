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

const MyRequests: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
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

  useEffect(() => {
    if (optionYears.length > 0 && !selectedYear) {
      setSelectedYear(optionYears[0].value);
    }
  }, [optionYears, selectedYear]);

  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useGetBenefitRequestLockView(
    effectiveEmployeeId || "",
    selectedYear,
    today
  );
  const { data: benefitClaimLock, isLoading: benefitClaimLockLoading } =
    useGetBenefitClaimLockingPeriod(
      effectiveEmployeeId || "",
      selectedYear,
      today
    );
  const showBenefitRequestButton =
    !benefitClaimLockLoading && benefitClaimLock?.status === "success";
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
    <div>
      <div className="flex flex-row items-center flex-wrap justify-between md:justify-end gap-4 mb-2">
        <div className="flex md:flex-row flex-col w-full gap-2 justify-between border-b border-gray-200 px-2">
          <div className="flex flex-col mb-2">
            <Typography variant="h4">
              My Benefits Requests for FY {selectedYear}
            </Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your benefits requests
            </Typography>
          </div>

          <div className="flex items-center gap-2 justify-between mb-2">
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

        {showBenefitRequestButton && (
          <Button
            bgColor="blue-600"
            size="md"
            className="hover:bg-blue-700 py-[0.65rem] font-semibold px-4 text-white"
            onClick={handleRequestBenefit}
          >
            Request Benefit
          </Button>
        )}
      </div>
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
              <BenefitSlipItem item={props?.item} maskAmounts={maskAmounts} />
            );
          }}
          SkeletonComponent={() => (
            <div className="rounded-xl bg-gray-100 animate-pulse my-4">
              <div className="px-4 py-2 flex justify-between">
                <div>
                  <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-300 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
              </div>
            </div>
          )}
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
      {showBenefitForm &&
        createPortal(
          <Modal onClose={handleCloseModal}>
            <BenefitRequestForm
              isOpen={showBenefitForm}
              onClose={handleCloseModal}
              onSuccess={() => {
                // setRefetch(true);
              }}
            />
          </Modal>,
          document.body
        )}
    </div>
  );
};

const BenefitSlipItem = ({
  item,
  maskAmounts,
}: {
  item: BenefitPayslip;
  maskAmounts: boolean;
}) => {
  const { isDesktop } = useScreenSize();

  return isDesktop ? (
    <div className="px-6 grid grid-cols-8 items-center gap-4 border-b hover:bg-blue-50 border-gray-200 py-4 cursor-pointer relative ">
      <span className="text-sm font-medium text-gray-700 text-start truncate">
        <WrapperHoverCard employeeId={item?.employee}>
          <Link to={`/webapp/employee-profile?target_user=${item?.employee}`} target="_blank">
            {item?.employee_name}
          </Link>
        </WrapperHoverCard>
      </span>
      <span className="text-sm font-medium text-gray-700 text-start truncate">
        {item?.company}
      </span>
      <span>{item?.earning_component}</span>
      <span className="text-sm font-medium text-gray-700 text-start truncate">
        {formatToIndianDate(item?.claim_date || "")}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${maskAmounts ? "blur-[3px]" : ""
          }`}
      >
        ₹{maskAmounts ? "#####" : item?.claimed_amount}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${maskAmounts ? "blur-[3px]" : ""
          }`}
      >
        ₹{maskAmounts ? "#####" : item?.custom_taxable_amount}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${maskAmounts ? "blur-[3px]" : ""
          }`}
      >
        ₹{maskAmounts ? "#####" : item?.custom_non_taxable_amount}
      </span>
      <span>
        {" "}
        <StatusBadge status={item?.custom_status} />
      </span>
    </div>
  ) : (
    <div className="px-6 flex flex-col items-center cursor-pointer border-t border-gray-300 pt-2 mt-4">
      <div className="flex w-full">
        <div className="flex flex-col">
          <Link to={`/webapp/employee-profile?target_user=${item?.employee}`} target="_blank">
            <span className="text-sm font-medium text-gray-700 text-start truncate">
              {item?.employee_name}
            </span>
          </Link>
          <span className="text-sm font-medium text-gray-700 text-start truncate">
            {item?.company}
          </span>
        </div>
        <span className="ml-auto">
          {" "}
          <StatusBadge status={item?.custom_status} />
        </span>
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
            ₹{maskAmounts ? "#####" : item?.claimed_amount}
          </span>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<
    string,
    { bg: string; text: string; borderColor: string }
  > = {
    Pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      borderColor: "border-yellow-300",
    },
    Cancelled: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      borderColor: "border-gray-300",
    },
    Rejected: {
      bg: "bg-red-100",
      text: "text-red-800",
      borderColor: "border-red-300",
    },
    Approved: {
      bg: "bg-green-100",
      text: "text-green-800",
      borderColor: "border-green-300",
    },
  };

  const config = statusConfig[status] || statusConfig.Pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-medium border ${config.bg} ${config.text} ${config.borderColor}`}
    >
      {status}
    </span>
  );
};

export default MyRequests;
