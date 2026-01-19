import { useEffect, useRef, useState } from "react";
import { useTargetUser } from "../../context/ViewedUserContext";
import {
    useCurrentEmployeeAllDetails,
    useGetEmployeeDetailsByEmpIdForProfile,
    useGetEmployeeFieldPermissions,
} from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
    convertFieldsToSimpleTabbedData,
    convertToFormioWithTabMetadata,
    SimpleTab,
    TabWithSchema,
} from "./FrappeToFormIoConverterSepTabs";
import Button from "../shared/atoms/Button";
import EmployeeSidebarForm from "./EmployeeSidebarForm";
import ProfileGridSkeleton from "./ProfileSkeleton";
import { PencilIcon, FileText } from "lucide-react";
import usePermission from "../../hooks/usePermission";
import { Link } from "react-router-dom";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";

interface EditableField {
    key: string;
    label: string;
}
export default function EmployeeProfileSections() {
    const { targetEmployeeId } = useTargetUser();

    const { data: userId } = useLoggedInUser();
    const { data: currentUser, isLoading } =
        useCurrentEmployeeAllDetails(userId || "");

    const employeeId =
        targetEmployeeId || (isLoading ? null : currentUser?.employee) || "";

    const { data: employee, isLoading: employeeLoading, refetch: refetchEmployee } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formInstances = useRef<Record<string, any>>({});

    const { data: fieldPermissions, isLoading: fieldPermissionsLoading } = useGetEmployeeFieldPermissions({
        doctype: "Employee",
        docname: employeeId,
        all_fields: 0,
        detailed: 1,
        include_breaks: 1,
    });

    const [tabs, setTabs] = useState<SimpleTab[]>([]);
    const [activeTab, setActiveTab] = useState<string>("");
    const [edit, setEdit] = useState<EditableField | null>(null);

    const [formioTabs, setformioTabs] = useState<TabWithSchema[]>([]);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const can = usePermission();
    useEffect(() => {
        if (!fieldPermissions || !employee?.employee) return;

        const fetchData = async () => {
            const result = await convertFieldsToSimpleTabbedData(
                fieldPermissions,
                employee.employee
            );
            setTabs(result.tabs);
            setActiveTab(result.tabs[0]?.key || "");

            const formioResult = await convertToFormioWithTabMetadata(
                fieldPermissions,
                employee?.employee
            );
            setformioTabs(formioResult.tabs);
        };
        fetchData();
    }, [fieldPermissions, employee?.employee]);


    useEffect(() => {
        if (!tabs.length) return;
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveTab(entry.target.id);
                    }
                });
            },
            { rootMargin: "-40% 0px -50% 0px" }
        );

        tabs.forEach(tab => {
            const el = sectionRefs.current[tab.key];
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [tabs]);

    const scrollToSection = (key: string) => {
        sectionRefs.current[key]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };
    if (!employeeId || fieldPermissionsLoading || employeeLoading || !tabs.length) {
        return <ProfileGridSkeleton />;
    }
    return (
        <div>
            <div className="flex items-start justify-between">
                <div className="px-6 py-4">
                    <Typography variant="h3" className="font-bold text-gray-900 mb-1">
                        Personal Information
                    </Typography>
                    <Typography variant="bodyMedium" color="body2">
                        Comprehensive details and records.
                    </Typography>
                </div>
            </div>
            {tabs.length > 1 && (
                <div className="px-6 sticky top-12 md:top-16 bg-white z-10 flex-shrink-0 w-full max-w-full border-b border-gray-50 pb-2">
                    <div className="flex bg-white overflow-x-scroll scrollbar-hide gap-1 w-full py-2">
                        {tabs.map(tab => (
                            <Button
                                key={tab.key}
                                onClick={() => scrollToSection(tab.key)}
                                variant="subtle"
                                size="sm"
                                className={`rounded-full whitespace-nowrap px-4 py-1.5 text-xs font-semibold transition-all duration-200
                  ${activeTab === tab.key
                                        ? "bg-primary-50 text-header-active border-primary-100"
                                        : "border-transparent text-header-inactive hover:text-header-active"
                                    }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Scrollable Sections */}
            <div className="space-y-14 pb-6">
                {tabs.map(tab => (
                    <section
                        key={tab.key}
                        id={tab.key}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ref={el => (sectionRefs.current[tab.key] = el) as any}
                        className="scroll-mt-28"
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between mb-6 py-3 px-6 bg-gray-50/50 border-y border-gray-100/50">
                            <Typography variant="subheading" className="font-bold text-gray-800">
                                {tab.label}
                            </Typography>

                            {can({ app: "Profile", page: "Employee Profile", action: "Edit" }) && (
                                <Button
                                    variant="subtle"
                                    icon={<PencilIcon className="h-4 w-4" />}
                                    size="sm"
                                    onClick={() => setEdit({ key: tab.key, label: tab.label })}
                                    className="font-bold text-primary-600"
                                >
                                    Edit
                                </Button>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6 px-6">
                            {tab.fields
                                ?.filter(field => !field.hidden)
                                .map(field => {
                                    const isTable = Array.isArray(field.value);
                                    return (
                                        <div
                                            key={field.key}
                                            className={`${isTable ? "col-span-full mt-4" : "px-4 py-2 border-l border-gray-100 hover:border-primary-200 transition-colors"}`}
                                        >
                                            <Typography variant="label" color="disabled" className="font-bold text-[10px] uppercase tracking-widest mb-3 block">
                                                {field.label || "-"}
                                            </Typography>
                                            {
                                                field?.type === 'file' ? (
                                                    <Link to={field.value} target="_blank" className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors font-medium text-sm">
                                                        <FileText size={14} />
                                                        <span className="truncate max-w-[200px] inline-block">{field.value}</span>
                                                    </Link>
                                                ) : isTable ? (
                                                    <CardsRenderer items={field.value} />
                                                ) : (
                                                    <Typography variant="bodyMedium" className="font-bold text-gray-900">
                                                        {field?.value || "—"}
                                                    </Typography>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                        </div>
                    </section>
                ))}
            </div>
            <EmployeeSidebarForm
                edit={edit}
                setEdit={setEdit}
                formioTabs={formioTabs}
                formInstances={formInstances}
                employeeId={employeeId}
                refetchEmployee={() => { refetchEmployee() }}
                employeeIsLoading={employeeLoading}
            />
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CardsRenderer = ({ items }: { items: Record<string, any>[] }) => {
    if (!Array.isArray(items) || items.length === 0) {
        return <Typography variant="bodySmall" color="secondary" className="italic">No data available</Typography>;
    }
    return (
        <div className="flex overflow-x-auto gap-4 pb-2 w-full min-h-[calc(100vh-350px)] snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {items.map((item, index) => (
                <div key={item?.id || item?.name || index} className="min-w-[450px] max-w-[450px] h-fit flex-shrink-0 snap-start">
                    <GenericCard data={item} />
                </div>
            ))}
        </div>
    );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenericCard = ({ data }: { data: Record<string, any> }) => {
    if (!data || typeof data !== "object") return null;

    return (
        <Card shadow="none" radius="xl" padding="md" className="bg-gray-50/30 border border-gray-100 hover:border-primary-100 transition-all group/card h-full">
            <div className="space-y-4">
                {Object.entries(data).map(([key, field]) => {
                    const isStructured = field && typeof field === 'object' && 'value' in field;
                    const value = isStructured ? field.value : field;
                    const type = isStructured ? field.type : null;
                    const label = (isStructured && field.label) ? field.label : formatKey(key);

                    return (
                        <div
                            key={key}
                            className="flex items-center justify-between gap-6 border-b border-gray-100/50 pb-2 last:border-0 last:pb-0"
                        >
                            {/* Label */}
                            <Typography variant="label" color="disabled" className="font-bold text-[10px] uppercase tracking-widest">
                                {label}
                            </Typography>

                            {/* Value */}
                            <div className="max-w-[70%] text-right overflow-hidden">
                                {type === 'file' && value ? (
                                    <Link
                                        to={value}
                                        target="_blank"
                                        className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 transition-colors font-medium text-sm"
                                    >
                                        <FileText size={12} />
                                        <span className="truncate block max-w-[150px]">{value}</span>
                                    </Link>
                                ) : (
                                    <Typography variant="bodySmall" className="font-bold text-gray-800 break-words">
                                        {formatValue(value)}
                                    </Typography>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
const formatKey = (key: string) =>
    key
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatValue = (value: string | object | any[] | null | undefined) => {
    if (value === null || value === undefined || value === "")
        return "—";

    if (typeof value === "boolean")
        return value ? "Yes" : "No";

    if (Array.isArray(value))
        return value.length ? value.join(", ") : "—";

    if (typeof value === "object")
        return JSON.stringify(value, null, 2);

    return String(value);
};
