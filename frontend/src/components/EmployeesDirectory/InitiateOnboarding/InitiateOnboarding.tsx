import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Send,
    UserCheck,
    Laptop,
    FileText,
    Mail,
    Building2,
    Briefcase,
    Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

const ONBOARDING_TEMPLATES = [
    "Standard Employee Onboarding",
    "Engineering & Tech Onboarding",
    "Sales & Marketing Onboarding",
    "Product & Design Onboarding",
    "Executive & Leadership Onboarding",
];

const LAPTOP_OPTIONS = [
    "Apple MacBook Pro M3 (16-inch)",
    "Apple MacBook Air M3 (15-inch)",
    "Dell XPS 15 (Windows)",
    "ThinkPad X1 Carbon (Linux / Windows)",
    "BYOD (Bring Your Own Device)",
];

const SOFTWARE_OPTIONS = [
    { id: "email", label: "Google Workspace / Outlook", checked: true },
    { id: "slack", label: "Slack Communication", checked: true },
    { id: "github", label: "GitHub Enterprise", checked: true },
    { id: "jira", label: "Jira / Confluence", checked: false },
    { id: "figma", label: "Figma Pro", checked: false },
    { id: "notion", label: "Notion Workspace", checked: true },
];

const REQUIRED_DOCS = [
    { id: "gov_id", label: "Government ID / Passport / Aadhaar", checked: true },
    { id: "education", label: "Highest Educational Degree Certificate", checked: true },
    { id: "relieving", label: "Relieving Letter / Experience Letter", checked: true },
    { id: "bank", label: "Cancelled Cheque / Bank Account Details", checked: true },
    { id: "nda", label: "Signed NDA & Code of Conduct", checked: true },
];

const InitiateOnboarding: React.FC = () => {
    const { isDesktop } = useScreenSize();
    const navigate = useNavigate();
    const location = useLocation();

    const stateData = (location.state as any) || {};
    const recruit = stateData?.recruit || {};
    const formData = stateData?.formData || {};

    const employeeName =
        formData.first_name ||
        recruit.first_name ||
        recruit.employee_name ||
        formData.employee_name ||
        "New Recruit";
    const employeeEmail =
        formData.personal_email ||
        formData.company_email ||
        recruit.personal_email ||
        recruit.company_email ||
        "candidate@example.com";
    const department =
        formData.department_title ||
        formData.department ||
        recruit.department ||
        "Engineering";
    const designation =
        formData.designation_title ||
        formData.designation ||
        recruit.designation ||
        "Software Engineer";

    const [template, setTemplate] = useState(ONBOARDING_TEMPLATES[0]);
    const [buddyName, setBuddyName] = useState("");
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [laptopOption, setLaptopOption] = useState(LAPTOP_OPTIONS[0]);
    const [softwareAccess, setSoftwareAccess] = useState<Record<string, boolean>>(() =>
        SOFTWARE_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.checked }), {})
    );
    const [documents, setDocuments] = useState<Record<string, boolean>>(() =>
        REQUIRED_DOCS.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.checked }), {})
    );
    const [welcomeMessage, setWelcomeMessage] = useState(
        `Welcome to the team! We are thrilled to have you join us. Please follow the onboarding checklist below to get started on your first day.`
    );
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleToggleSoftware = (id: string) => {
        setSoftwareAccess((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleToggleDoc = (id: string) => {
        setDocuments((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleInitiate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API initiation
        setTimeout(() => {
            setIsSubmitting(false);
            toast.success(`Onboarding initiated for ${employeeName}!`);
            navigate("/webapp/employees-directory");
        }, 800);
    };

    const content = (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 bg-white px-5 py-4 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/webapp/employees-directory")}
                        className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Employee Directory"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Typography variant="h3" color="title">
                                Initiate Employee Onboarding
                            </Typography>
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Step 2: Onboarding Setup
                            </span>
                        </div>
                        <Typography variant="bodySmall" color="secondary">
                            Configure onboarding workflows, provision equipment, and assign mentors for the recruit.
                        </Typography>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="subtle"
                        size="md"
                        onClick={() => navigate("/webapp/employees-directory")}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contain"
                        size="md"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={handleInitiate}
                        loading={isSubmitting}
                    >
                        Initiate Onboarding
                    </Button>
                </div>
            </div>

            {/* Employee Quick Info Card */}
            <div className="bg-gradient-to-r from-primary-50/50 via-white to-primary-50/30 border border-primary-100 p-5 rounded-xl shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <Typography variant="h4" color="title" className="font-bold">
                                {employeeName}
                            </Typography>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
                                <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    {employeeEmail}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                    {designation}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                    {department}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleInitiate} className="space-y-6">
                {/* Section 1: Workflow & Mentorship */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <UserCheck className="w-5 h-5 text-primary" />
                        <Typography variant="h4" color="title" className="font-semibold">
                            1. Onboarding Workflow & Mentorship
                        </Typography>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Onboarding Template <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                            >
                                {ONBOARDING_TEMPLATES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Assigned Buddy / Mentor
                            </label>
                            <input
                                type="text"
                                placeholder="Search or enter buddy name..."
                                value={buddyName}
                                onChange={(e) => setBuddyName(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Target Start Date <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Equipment & IT Access */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Laptop className="w-5 h-5 text-primary" />
                        <Typography variant="h4" color="title" className="font-semibold">
                            2. Hardware & IT Access Provisions
                        </Typography>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Assigned Workstation / Laptop
                            </label>
                            <select
                                value={laptopOption}
                                onChange={(e) => setLaptopOption(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                            >
                                {LAPTOP_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Software & Tool Accounts to Provision
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {SOFTWARE_OPTIONS.map((item) => (
                                    <label
                                        key={item.id}
                                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${softwareAccess[item.id]
                                            ? "border-primary-200 bg-primary-50/40 text-primary-900 font-medium"
                                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!softwareAccess[item.id]}
                                            onChange={() => handleToggleSoftware(item.id)}
                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary-500"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Document Verification */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <Typography variant="h4" color="title" className="font-semibold">
                            3. Required Document Checklists
                        </Typography>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {REQUIRED_DOCS.map((doc) => (
                            <label
                                key={doc.id}
                                className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${documents[doc.id]
                                    ? "border-primary-200 bg-primary-50/40 text-primary-900 font-medium"
                                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={!!documents[doc.id]}
                                    onChange={() => handleToggleDoc(doc.id)}
                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary-500"
                                />
                                <span>{doc.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Section 4: Welcome Message */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Send className="w-5 h-5 text-primary" />
                        <Typography variant="h4" color="title" className="font-semibold">
                            4. Welcome Email & Notes
                        </Typography>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Welcome Note & Orientation Message
                        </label>
                        <textarea
                            rows={4}
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed"
                        />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 font-medium pt-1">
                        <input
                            type="checkbox"
                            checked={sendWelcomeEmail}
                            onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span>Send automated Welcome Email to employee upon initiation</span>
                    </label>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
                    <Button
                        variant="subtle"
                        size="md"
                        icon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => navigate("/webapp/employees-directory")}
                    >
                        Back to Directory
                    </Button>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button
                            variant="contain"
                            size="md"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            type="submit"
                            loading={isSubmitting}
                        >
                            Initiate Onboarding
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );

    if (isDesktop) {
        return (
            <DesktopLayoutWrapper title="Initiate Onboarding">
                <div className="max-w-5xl mx-auto w-full p-6">{content}</div>
            </DesktopLayoutWrapper>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <HeaderBar
                title="Initiate Onboarding"
                showBackButton={true}
                onBack={() => navigate("/webapp/employees-directory")}
            />
            <main className="flex-grow p-4 max-w-2xl mx-auto w-full">{content}</main>
        </div>
    );
};

export default InitiateOnboarding;
