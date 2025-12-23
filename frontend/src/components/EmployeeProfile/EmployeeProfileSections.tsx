import { useEffect, useRef, useState } from "react";
import { useTargetUser } from "../../context/ViewedUserContext";
import {
    useCurrentEmployeeAllDetails,
    useGetEmployeeDetailsByEmpId,
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
import { PencilIcon } from "lucide-react";
import usePermission from "../../hooks/usePermission";
import { Link } from "react-router-dom";

interface EditableField {
    key: string;
    label: string;
}
const EmployeeProfileSections = () => {
    const { targetEmployeeId } = useTargetUser();

    const { data: userId } = useLoggedInUser();
    const { data: currentUser, isLoading } =
        useCurrentEmployeeAllDetails(userId || "");

    const employeeId =
        targetEmployeeId || (isLoading ? null : currentUser?.employee) || "";

    const employee = useGetEmployeeDetailsByEmpId(employeeId);
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
        if (!fieldPermissions || !employee?.data) return;

        const fetchData = async () => {
            const result = await convertFieldsToSimpleTabbedData(
                fieldPermissions,
                employee.data
            );
            setTabs(result.tabs);
            setActiveTab(result.tabs[0]?.key || "");

            const formioResult = await convertToFormioWithTabMetadata(
                fieldPermissions,
                employee?.data
            );
            setformioTabs(formioResult.tabs);
        };
        fetchData();
    }, [fieldPermissions, employee?.data]);


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
    if (!employeeId || fieldPermissionsLoading || employee.isLoading || !tabs.length) {
        return <ProfileGridSkeleton />;
    }
    return (
        <div>
            <div className="flex items-start justify-between">
                <div className="border-gray-200 px-6 my-2 pb-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Personal Information
                    </h2>
                    <p className="text-gray-600">
                        Your personal information
                    </p>
                </div>
            </div>
            {tabs.length > 1 && (
                <div className=" px-6 sticky top-12 md:top-16 z-10 bg-white flex-shrink-0 w-full max-w-full shadow-sm mb-2">
                    <div className="flex bg-white overflow-x-scroll scrollbar-hide gap-2 w-full py-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => scrollToSection(tab.key)}
                                className={`whitespace-nowrap px-2 py-1 rounded-md text-sm font-medium transition-all duration-200
                  ${activeTab === tab.key
                                        ? "bg-blue-100 text-blue-600"
                                        : "border-transparent text-gray-600 hover:text-blue-600"
                                    }`}
                            >
                                {tab.label}
                            </button>
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
                        <div className="flex items-center justify-between mb-5 py-1 px-6 bg-gray-100">
                            <h2 className="text-lg font-md font-semibold text-gray-900">
                                {tab.label}
                            </h2>

                            {can({ app: "Profile", page: "Employee Profile", action: "Edit" }) && (
                                <Button
                                    variant="subtle"
                                    icon={<PencilIcon className="h-4 w-4" />}
                                    size="md"
                                    onClick={() => setEdit({ key: tab.key, label: tab.label })}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6">
                            {tab.fields
                                ?.filter(field => !field.hidden)
                                .map(field => (
                                    <div
                                        key={field.key}
                                        className="rounded-lg  px-4 py-3"
                                    >
                                        <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                                            {field.label || "-"}
                                        </p>
                                        {
                                            field?.type === 'file' ? <Link to={field.value} target="_blank"

                                            >{field.value}</Link> :
                                                <p className="text-sm font-medium text-gray-900">
                                                    {Array.isArray(field.value) ? <CardsRenderer items={field.value} /> : field?.value || "—"}
                                                </p>
                                        }
                                    </div>
                                ))}
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
                refetchEmployee={() => { employee.refetch() }}
                employeeIsLoading={employee.isLoading}
            />
        </div>
    );
};

export default EmployeeProfileSections;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CardsRenderer = ({ items }: { items: Record<string, any>[] }) => {
    if (!Array.isArray(items) || items.length === 0) {
        return <p className="text-gray-500">No data available</p>;
    }
    return (
        <div className="w-full">
            {items.map((item, index) => (
                <GenericCard key={item?.id || item?.name || index} data={item} />
            ))}
        </div>
    );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenericCard = ({ data }: { data: Record<string, any> }) => {
    if (!data || typeof data !== "object") return null;

    return (
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 mb-2">
            <div className="space-y-3">
                {Object.entries(data).map(([key, field]) => {
                    const isStructured = field && typeof field === 'object' && 'value' in field;
                    const value = isStructured ? field.value : field;
                    const type = isStructured ? field.type : null;
                    const label = (isStructured && field.label) ? field.label : formatKey(key);

                    return (
                        <div
                            key={key}
                            className="flex items-start justify-between gap-6 border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                        >
                            {/* Label */}
                            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                {label}
                            </span>

                            {/* Value */}
                            <div className="max-w-[65%] text-sm font-semibold text-gray-900 text-right break-words leading-relaxed">
                                {type === 'file' && value ? (
                                    <Link
                                        to={value}
                                        target="_blank"
                                    >
                                        {value}
                                    </Link>
                                ) : (
                                    formatValue(value)
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
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
