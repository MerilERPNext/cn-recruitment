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
    useEffect(() => {
        if (!fieldPermissions || !employee?.data) return;

        const result = convertFieldsToSimpleTabbedData(
            fieldPermissions,
            employee.data
        );

        const formioResult = convertToFormioWithTabMetadata(
            fieldPermissions,
            employee?.data
        );
        setTabs(result.tabs);
        setActiveTab(result.tabs[0]?.key || "");
        setformioTabs(formioResult.tabs);
    }, [fieldPermissions, employee?.data]);


    /* 🔍 Scroll Spy (unchanged) */
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
    if (fieldPermissionsLoading || employee.isLoading) {
        return <ProfileGridSkeleton />;
    }
    console.log(tabs, "tabs");

    return (
        <div>
            {tabs.length > 1 && (
                <div className=" px-6 sticky top-12 md:top-16 z-10 bg-white flex-shrink-0 w-full max-w-full border-b-2 border-gray-200">
                    <div className="flex bg-white overflow-x-scroll scrollbar-hide gap-2 w-full py-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => scrollToSection(tab.key)}
                                className={`whitespace-nowrap px-2 py-1 rounded-[32px] text-sm font-medium transition-all duration-200
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
            <div className="space-y-14 mt-6 py-6">
                {tabs.map(tab => (
                    <section
                        key={tab.key}
                        id={tab.key}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ref={el => (sectionRefs.current[tab.key] = el) as any}
                        className="scroll-mt-28"
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between mb-5 border-b border-gray-200 px-6 pb-2">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {tab.label}
                            </h2>

                            <Button
                                size="md"
                                onClick={() => setEdit({ key: tab.key, label: tab.label })}
                            // className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                Edit
                            </Button>
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
                                        <p className="text-sm font-medium text-gray-900">
                                            {typeof field.value === "object" ? field.value?.[0]?.doctype_name : field?.value || "—"}
                                        </p>
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
            />
        </div>
    );
};

export default EmployeeProfileSections;
