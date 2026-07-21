import React from "react";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import Modal from "../shared/Modal";

interface ReportData {
    title: string;
    verification_type: string;
    partner_name: string;
    assigned_on: string;
    last_updated_on?: string;
    report_status?: string;
    report?: string;
    comments?: string;
}

const dummyReportsData: ReportData[] = [
    {
        title: "Intermediate Report 1",
        verification_type: "Onboarding BGV",
        partner_name: "OnGrid",
        assigned_on: "30-07-2025",
        last_updated_on: "05-08-2025",
        report_status: "Verification Initiated",
        report: "—",
        comments: "BGV initiated for the candidate"
    },
    {
        title: "Report 1",
        verification_type: "Onboarding BGV",
        partner_name: "OnGrid",
        assigned_on: "30-07-2025",
    }
];

interface AllReportsProps {
    show: boolean;
    setShowAllReport: (show: boolean) => void;
}

const AllReports: React.FC<AllReportsProps> = ({ show, setShowAllReport }: AllReportsProps) => {
    // Note: Assuming state is controlled by parent, but keeping internal state so it opens initially

    return (
        <Modal isOpen={show} onClose={() => setShowAllReport(false)} size="md">
            <div className="flex flex-col bg-white w-full">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <Typography variant="h4" className="font-semibold text-slate-800">
                            All Reports
                        </Typography>
                        <StatusBadge status="In Progress" />
                    </div>
                    <button
                        onClick={() => setShowAllReport(false)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-8">
                    {dummyReportsData.map((report, index) => (
                        <div key={index} className="flex flex-col gap-3">
                            <Typography variant="body" className="font-medium text-slate-800">
                                {report.title}
                            </Typography>
                            <div className="bg-[#f8f9fc] p-5 rounded-xl flex flex-col gap-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-4">
                                    <div className="flex flex-col gap-1">
                                        <Typography variant="bodySmall" className="text-slate-500">
                                            Verification Type
                                        </Typography>
                                        <Typography variant="bodySmall" className="font-medium text-slate-900">
                                            {report.verification_type}
                                        </Typography>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Typography variant="bodySmall" className="text-slate-500">
                                            Partner Name
                                        </Typography>
                                        <Typography variant="bodySmall" className="font-medium text-slate-900">
                                            {report.partner_name}
                                        </Typography>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Typography variant="bodySmall" className="text-slate-500">
                                            Assigned On
                                        </Typography>
                                        <Typography variant="bodySmall" className="font-medium text-slate-900">
                                            {report.assigned_on}
                                        </Typography>
                                    </div>

                                    {report.last_updated_on && (
                                        <div className="flex flex-col gap-1">
                                            <Typography variant="bodySmall" className="text-slate-500">
                                                Last Updated on
                                            </Typography>
                                            <Typography variant="bodySmall" className="font-medium text-slate-900">
                                                {report.last_updated_on}
                                            </Typography>
                                        </div>
                                    )}
                                    {report.report_status && (
                                        <div className="flex flex-col gap-1">
                                            <Typography variant="bodySmall" className="text-slate-500">
                                                Report Status
                                            </Typography>
                                            <Typography variant="bodySmall" className="font-medium text-slate-900">
                                                {report.report_status}
                                            </Typography>
                                        </div>
                                    )}
                                    {report.report && (
                                        <div className="flex flex-col gap-1">
                                            <Typography variant="bodySmall" className="text-slate-500">
                                                Report
                                            </Typography>
                                            <Typography variant="bodySmall" className="font-medium text-slate-900">
                                                {report.report}
                                            </Typography>
                                        </div>
                                    )}
                                </div>
                                {report.comments && (
                                    <div className="flex flex-col gap-1 pt-1">
                                        <Typography variant="bodySmall" className="text-slate-500">
                                            Comments
                                        </Typography>
                                        <Typography variant="bodySmall" className="font-medium text-slate-900">
                                            {report.comments}
                                        </Typography>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default AllReports;
