"use client";

import type React from "react";
import { useMemo, useState } from "react";
import Modal from "../CommonModel";
import BenefitRequestForm from "./BenefitsRequestForm";
import CardTable from "../../shared/CardTable";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import Button from "../../shared/atoms/Button";
import { useCurrentEmployeeIdCard } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { createPortal } from "react-dom";
import {
  BenefitPayslip,
  useGetBenefitClaimLockingPeriod,
  useGetBenefitRequestLockView,
} from "../../../hooks/useBenefit";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

const MyRequests: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  // const [refetch, setRefetch] = useState(false);
  const handleRequestBenefit = () => {
    setShowBenefitForm(true);
  };

  const { data: employeeIdCard } = useCurrentEmployeeIdCard();

  const handleCloseModal = () => {
    setShowBenefitForm(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    currentYear.toString().slice(2)
  );

  const yearPeriod = !selectedYear
    ? ""
    : `${selectedYear}-${parseInt(selectedYear) + 1}`;
  const { data: employee } = useCurrentEmployeeIdCard();
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useGetBenefitRequestLockView(
    employee?.id || "",
    yearPeriod,
    today
  );
  const { data: benefitClaimLock, isLoading: benefitClaimLockLoading } =
    useGetBenefitClaimLockingPeriod(employee?.id || "", yearPeriod, today);
  const showBenefitRequestButton =
    !benefitClaimLockLoading && benefitClaimLock?.status === "success";
  const LockRequestMessage = useMemo(() => {
    if (!data || isLoading) return null;
    return (
      <div
        className={` text-sm rounded-lg p-4 mt-2 mb-4 ${
          data?.status === "success" ? "bg-green-300/40" : "bg-red-300/40"
        }`}
      >
        {data?.message}
      </div>
    );
  }, [data, isLoading]);

  return (
    <div className="px-4 pt-2">
      <div className="flex flex-col sm:flex-row items-center justify-between md:justify-end gap-4 mb-2">
        <div className="flex-1 sm:min-w-60 min-w-full">
          <select
            id="yearFilter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="my-form-input"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year.slice(2)}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full flex gap-4">
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
                <BsToggleOff className="w-6 h-6 text-gray-400" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Hide Amounts
                </span>
                <BsToggleOn className="w-6 h-6 text-primary" />
              </>
            )}
          </button>
          {!showBenefitRequestButton && (
            <Button
              bgColor="blue-600"
              size="md"
              className="hover:bg-blue-700 py-[0.65rem] font-semibold px-4"
              onClick={handleRequestBenefit}
            >
              Request Benefit
            </Button>
          )}
        </div>
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
            yearPeriod || "",
          ]}
          customAPI={{
            method:
              "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.benefit_data_list_view",
            params: {
              employee: employeeIdCard?.id || "",
              company: employeeIdCard?.company || "",
              payroll_period: yearPeriod,
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
      <WrapperHoverCard employeeId={item?.employee}>
        <span className="text-sm font-medium text-gray-700 text-start truncate">
          {item?.employee_name}
        </span>
      </WrapperHoverCard>
      <span className="text-sm font-medium text-gray-700 text-start truncate">
        {item?.company}
      </span>
      <span>{item?.earning_component}</span>
      <span className="text-sm font-medium text-gray-700 text-start truncate">
        {formatToIndianDate(item?.claim_date || "")}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${
          maskAmounts ? "blur-[3px]" : ""
        }`}
      >
        ₹{maskAmounts ? "#####" : item?.claimed_amount}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${
          maskAmounts ? "blur-[3px]" : ""
        }`}
      >
        ₹{maskAmounts ? "#####" : item?.custom_taxable_amount}
      </span>
      <span
        className={`text-sm font-medium text-gray-700 text-start truncate ${
          maskAmounts ? "blur-[3px]" : ""
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
          <span className="text-md font-semibold text-gray-700 text-start truncate">
            {item?.employee_name}
          </span>
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
            className={`text-sm justify-self-end font-medium text-gray-700 text-end truncate ${
              maskAmounts ? "blur-[3px]" : ""
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
