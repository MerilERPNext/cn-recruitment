import React from "react";
import { Typography } from "../shared/atoms/Typography";
import Modal from "../shared/Modal";

interface ActivityDetail {
    label: string;
    value: string;
}

interface ActivityLogItem {
    titlePrefix: string;
    actor?: string;
    timestamp: string;
    details: ActivityDetail[];
}

const dummyActivityLogs: ActivityLogItem[] = [
    {
        titlePrefix: "Manager has been assigned by",
        actor: "Ritu ( PW 23035 )",
        timestamp: "15 : 14 pm , 12-05-2025",
        details: [
            { label: "Previous Manager", value: "Rahul Agarwal ( PW 20246 )" },
            { label: "Updated Manager", value: "Rahul Agarwal ( PW 20246 )" }
        ]
    },
    {
        titlePrefix: "Email - Notification to the Admin and Onboarding Admin after BGV is completed has been sent",
        timestamp: "15 : 14 pm , 12-05-2025",
        details: [
            {
                label: "Recepients :",
                value: "Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 ) , Ganesh Yadav ( PW 11309 ) , Ganesh Jadhav ( PW 11309 )"
            }
        ]
    },
    {
        titlePrefix: "Verification Partner has been assigned by",
        actor: "Payal ( PW 24037 )",
        timestamp: "15 : 14 pm , 12-05-2025",
        details: [
            { label: "Verification Partner", value: "OnGrid" },
            { label: "Verification Package", value: "Default Package - OnGrid" }
        ]
    }
];

interface ActivityLogProps {
    show: boolean;
    setShowActivityLog: (show: boolean) => void;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ show, setShowActivityLog }) => {

    return (
        <Modal isOpen={show} onClose={() => { }} size="md">
            <div className="flex flex-col bg-white w-full">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <Typography variant="h4" className="font-semibold text-slate-800">
                        Activity Logs
                    </Typography>
                    <button
                        onClick={() => setShowActivityLog(false)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">
                    {dummyActivityLogs.map((log, index) => (
                        <div key={index} className="flex flex-col gap-3">
                            <div className="flex flex-col gap-0.5">
                                <Typography variant="body" className="text-slate-800">
                                    {log.titlePrefix}
                                    {log.actor && (
                                        <span className="text-blue-500 ml-1">
                                            {log.actor}
                                        </span>
                                    )}
                                </Typography>
                                <Typography variant="bodySmall" className="text-slate-400">
                                    {log.timestamp}
                                </Typography>
                            </div>

                            <div className="bg-[#f8f9fc] p-5 rounded-xl flex flex-col gap-5">
                                <div className={`grid gap-y-6 gap-x-4 ${log.details.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                    {log.details.map((detail, idx) => (
                                        <div key={idx} className="flex flex-col gap-1">
                                            <Typography variant="bodySmall" className="font-semibold text-slate-800">
                                                {detail.label}
                                            </Typography>
                                            <Typography variant="bodySmall" className="text-slate-500 leading-relaxed">
                                                {detail.value}
                                            </Typography>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default ActivityLog;
