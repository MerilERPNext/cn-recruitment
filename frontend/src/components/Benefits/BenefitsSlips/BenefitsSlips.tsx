/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";

import { FaRegEye } from "react-icons/fa";
import SalarySlipPDFModal from "../../Compansation/SalarySlipPDFModal";
import CardTable from "../../shared/CardTable";
import {
  BenefitPayslip,
  useGetBenefitSlipHTML,
  useGetYearFilterOptions,
} from "../../../hooks/useBenefit";
import {
  useCurrentEmployeeIdCard,
  useEmployee,
} from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import DropdownMenu from "../../shared/DropDownMenu";
import BenefitSlipPDFMOdel from "./BenefitSlipPDFModel";
import { createPortal } from "react-dom";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CustomDropdown from "../../shared/CustomDropdown";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { Typography } from "../../shared/atoms/Typography";
import { getCurrentPeriod } from "../shared/logic";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

const BenefitsSlips = () => {
  const { data: employeeIdCard } = useCurrentEmployeeIdCard();
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const { isDesktop } = useScreenSize();

  const uiPermission = useMemo(() => ({
    app: "Benefits",
    page: "Benefit Slips",
    actionKey: "view_slip",
  }), []);
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const viewSlipEnabled = isActionEnabled(
    uiPermissionData,
    uiPermission?.actionKey ?? "",
    uiPermission?.page,
  );

  const effectiveEmployee = isViewingOtherUser
    ? targetEmployee
    : employeeIdCard;
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
    setSelectedYear(() => getCurrentPeriod(optionYears));
  }, [optionYears]);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalHtmlContent, setModalHtmlContent] = useState<string>("");
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
    name: string;
    date: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">
                  My Benefit Slips for FY {selectedYear}
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your benefits slips
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4"> My Benefit Slips</Typography>
              </div>
            )}
            <CustomDropdown
              position="bottom-left"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event?.target.value)}
              options={optionYears}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={["Claim Date", "Status", "Actions"]}
          columnWidths={["1fr", "1fr", "1fr"]}
        >
          <DataListView
            queryKey={[
              "benefit-sips",
              employeeIdCard?.id || "",
              employeeIdCard?.company || "",
              selectedYear || "",
            ]}
            customAPI={{
              method:
                "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.benefit_payslip_list_view",
              params: {
                employee: employeeIdCard?.id || "",
                company: employeeIdCard?.company || "",
                payroll_period: selectedYear,
              },
            }}
            getItemKey={(item: any, _: number) => item.name}
            ItemComponent={(props: { item: BenefitPayslip }) => (
              <BenefitSlipItem item={props?.item} viewSlipEnabled={viewSlipEnabled} />
            )}
            SkeletonComponent={CardSkeleton}
            // refetchTrigger={refetchAttendance}
            // onRefetchComplete={() => setRefetchAttendance(false)}
            isSearch={false}
            isFilter={false}
            showRefreshButton={false}
            // pageSize={10}
            infiniteScroll={true}
            // showPagination={true}
            loadMorePagination={false}
          />
        </CardTable>
      </div>
      {/* PDF Modal */}
      {selectedSalarySlip && (
        <SalarySlipPDFModal
          isOpen={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false);
            setSelectedSalarySlip(null);
            setModalHtmlContent("");
          }}
          salarySlipName={selectedSalarySlip?.name || ""}
          salarySlipDate={selectedSalarySlip?.date || ""}
          htmlContent={modalHtmlContent}
        />
      )}
    </div>
  );
};

export default BenefitsSlips;

const BenefitSlipItem = ({ item, viewSlipEnabled }: { item: BenefitPayslip, viewSlipEnabled: boolean }) => {
  const { data, isLoading } = useGetBenefitSlipHTML(item.name);
  const [showPDF, setShowPDF] = useState<boolean>(false);
  const benefitSlipDate = item?.claim_date;
  const { isDesktop } = useScreenSize();

  return (
    <>
      {isDesktop ? (
        <div className="grid grid-cols-3 max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer">
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(benefitSlipDate || "")}
          </Typography>
          <div className="flex items-center justify-center">
            <StatusBadge status={item?.custom_status} />
          </div>
          <div className="flex items-center justify-center">
            {viewSlipEnabled && (
              <DropdownMenu
                placement="center-left"
                items={[
                  {
                    label: "View",
                    icon: <FaRegEye className="h-4 w-4" />,
                    onClick: () => setShowPDF(true),
                  },
                ]}
              >
                <button className="p-2 border-1 rounded-lg hover:bg-gray-200">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenu>
            )}
          </div>
        </div>
      ) : (
        <div className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mt-2 w-full">
          <div className="p-4 flex items-start gap-3 w-full">
            <div className="w-full">
              {/* Header: Claim Date + Status */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Claim Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(benefitSlipDate || "")}
                  </Typography>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={item?.custom_status} />
                </div>
              </div>
              {/* Action */}
              <div className="mt-4 flex justify-end">
                {viewSlipEnabled && (
                  <button
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    onClick={() => setShowPDF(true)}
                  >
                    <FaRegEye className="h-4 w-4" />
                    View Slip
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {data &&
        !isLoading &&
        createPortal(
          <BenefitSlipPDFMOdel
            isOpen={showPDF}
            onClose={() => setShowPDF(false)}
            htmlContent={data.html}
            key={item.name}
            benefitSlipName={item.name}
            benefitSlipDate={benefitSlipDate || ""}
          />,
          document.body,
        )}
    </>
  );
};
