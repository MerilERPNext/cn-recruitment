/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";

import { FaRegEye } from "react-icons/fa";
import SalarySlipPDFModal from "../../Compansation/SalarySlipPDFModal";
import CardTable from "../../shared/CardTable";
import { BenefitPayslip, useGetBenefitSlipHTML } from "../../../hooks/useBenefit";
import { useCurrentEmployeeIdCard } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import DropdownMenu from "../../shared/DropDownMenu";
import BenefitSlipPDFMOdel from "./BenefitSlipPDFModel";
import { createPortal } from "react-dom";
import formatToIndianDate from "../../../utils/formatToIndianDate";


const BenefitsSlips = () => {
    const [selectedYear, setSelectedYear] = useState("");
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [modalHtmlContent, setModalHtmlContent] = useState<string>("");
    const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
        name: string;
        date: string;
    } | null>(null);


    const yearPeriod = (!selectedYear ? "" : `${selectedYear}-${parseInt(selectedYear) + 1}`);
    const { data: employeeIdCard } = useCurrentEmployeeIdCard();

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) =>
        (currentYear - i).toString()
    );

    return (
        <div className="px-4 pt-2">
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
            <>
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-xs">
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
                </div>
            </>

            <CardTable
                titles={[
                    "Claim Date",
                    "Status",
                    "Actions"
                ]}
                columnWidths={["1fr", "1fr", "50px"]}
            >
                <DataListView
                    queryKey={["benefit-sips", employeeIdCard?.id || "", employeeIdCard?.company || "", yearPeriod || ""]}
                    customAPI={{
                        method: "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.benefit_payslip_list_view",
                        params: {
                            employee: employeeIdCard?.id || "",
                            company: employeeIdCard?.company || "",
                            payroll_period: yearPeriod,
                        },
                    }}


                    defaultFilters={{
                        status: "Approved",
                    }}
                    getItemKey={(item: any, _: number) => item.name}
                    ItemComponent={BenefitSlipItem}
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
                    // onRefetchComplete={() => setRefetchAttendance(false)}
                    isSearch={false}
                    isFilter={false}
                    showRefreshButton={false}
                    // orderBy="creation desc"
                    // pageSize={10}
                    // infiniteScroll={true}
                    // showPagination={true}
                    loadMorePagination={false}
                />
            </CardTable>
        </div>
    );
};

export default BenefitsSlips;

const BenefitSlipItem = ({ item }: { item: BenefitPayslip }) => {

    const { data, isLoading } = useGetBenefitSlipHTML(item.name);
    const [showPDF, setShowPDF] = useState<boolean>(false);
    const benefitSlipDate = item?.claim_date;

    return <div className="px-6 grid grid-cols-[1fr_1fr_50px] items-center gap-4 border-b border-gray-200 h-14  cursor-pointer relative ">
        <span className="text-sm font-medium text-gray-700 text-start truncate">{formatToIndianDate(benefitSlipDate || "")}</span>
        <span> <StatusBadge status={item?.custom_status} /></span>
        <DropdownMenu
            placement="center-left"
            items={[
                { label: "View", icon: <FaRegEye className="h-4 w-4" />, onClick: () => setShowPDF(true) }
            ]}
        >
            <button className="p-2 border-1 rounded-lg hover:bg-gray-200">
                <MoreVertical className="h-5 w-5" />
            </button>
        </DropdownMenu>
        {data && !isLoading && createPortal(
            <BenefitSlipPDFMOdel isOpen={showPDF} onClose={() => setShowPDF(false)} htmlContent={data.html} key={item.name} benefitSlipName={item.name}
                benefitSlipDate={benefitSlipDate || ""} />, document.body
        )
        }
    </div>
}


const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { bg: string; text: string; borderColor: string }> = {
        Pending: { bg: "bg-yellow-100", text: "text-yellow-800", borderColor: "border-yellow-300" },
        Cancelled: { bg: "bg-gray-100", text: "text-gray-800", borderColor: "border-gray-300" },
        Rejected: { bg: "bg-red-100", text: "text-red-800", borderColor: "border-red-300" },
        Approved: { bg: "bg-green-100", text: "text-green-800", borderColor: "border-green-300" },
    };

    const config = statusConfig[status] || statusConfig.Pending;

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium border ${config.bg} ${config.text} ${config.borderColor}`}>
            {status}
        </span>
    );
};