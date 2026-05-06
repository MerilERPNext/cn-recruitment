/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useTargetUser } from "../../context/ViewedUserContext";
import {
    useCurrentEmployeeDetails,
    useGetEmployeeDetailsByEmpIdForProfile,
    useGetEmployeeFieldPermissions,
} from "../../hooks/useEmployee";

import {
    convertFieldsToSimpleTabbedData,
    convertToFormioWithTabMetadata,
    SimpleTab,
    SimpleSection,
    SimpleColumn,
    TabWithSchema,
} from "./FrappeToFormIoConverterSepTabs";
import Button from "../shared/atoms/Button";
import EmployeeSidebarForm from "./EmployeeSidebarForm";
import { PencilIcon, FileText } from "lucide-react";
import usePermission from "../../hooks/usePermission";
import { Link } from "react-router-dom";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import ProfileSkeleton from "../shared/molecules/Skeletons/ProfileSkeleton";

interface EditableField {
    key: string;
    label: string;
    fieldname?: string;
    rowIndex?: number;
}
export default function EmployeeProfileSections() {
    const { targetEmployeeId } = useTargetUser();

    const { data: currentUser, isLoading } =
        useCurrentEmployeeDetails({ logged_in_employee_details: true });

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
        return <ProfileSkeleton />;
    }
    return (
        <div>
            <div className="flex items-start justify-between">
                <div className="px-0 md:px-6 py-6">
                    <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-xl sm:text-2xl">
                        Personal Information
                    </Typography>
                    <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
                        Comprehensive details and records.
                    </Typography>
                </div>
            </div>
            {tabs.length > 1 && (
                <div className="px-0 md:px-6 sticky top-12 md:top-14 bg-white z-10 flex-shrink-0 w-full max-w-full pb-2">
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
            <div className="space-y-2 md:space-y-6 pb-6">
                {tabs.map(tab => {
                    const allFields = tab.sections.flatMap(s => s.columns.flatMap(c => c.fields));
                    const allEditable = allFields.filter(f => !f.hidden).every(f => f.readOnly);
                    return (
                        <section
                            key={tab.key}
                            id={tab.key}
                            ref={el => { sectionRefs.current[tab.key] = el; }}
                            className="scroll-mt-28"
                        >
                            {/* Tab Header */}
                            <div className="flex items-center rounded-xl justify-between mb-3 md:mb-6 py-2 max-sm:px-4 px-6 bg-gray-50/50 mx-0 md:mx-6 border border-gray-100/50">
                                <Typography variant="h4" className="font-bold text-gray-800 max-sm:text-md">
                                    {tab.label}
                                </Typography>
                                {can({ app: "Profile", page: "Employee Profile", action: "Edit" }) && (
                                    <Button
                                        variant="subtle"
                                        icon={<PencilIcon className="h-4 w-4" />}
                                        size="sm"
                                        disabled={allEditable}
                                        onClick={() => setEdit({ key: tab.key, label: tab.label })}
                                        className={`font-bold ${allEditable ? "text-gray-400 opacity-50 cursor-not-allowed" : "text-primary-600"}`}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>

                            {/* Sections */}
                            <div className="space-y-6 px-0 md:px-6">
                                {tab.sections.map((section: SimpleSection) => {
                                    const allVisibleFields = section.columns.flatMap((col: SimpleColumn) => col.fields.filter(f => !f.hidden));
                                    if (!allVisibleFields.length) return null;

                                    const colCount = Math.min(section.columns.length, 4);
                                    const gridClass = colCount > 1
                                        ? `grid grid-cols-1 sm:grid-cols-2 ${colCount === 3 ? "lg:grid-cols-3" : colCount >= 4 ? "lg:grid-cols-4" : ""} gap-x-6 gap-y-4`
                                        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 md:gap-y-8 gap-x-6";

                                    return (
                                        <div key={section.key}>
                                            {section.label && (
                                                <Typography variant="bodySmall" className="font-semibold text-gray-500 uppercase tracking-widest text-[10px] mb-3 block px-4 py-2 border-b">
                                                    {section.label}
                                                </Typography>
                                            )}
                                            <div className={gridClass}>
                                                {colCount > 1 ? (
                                                    section.columns.map((column: SimpleColumn) => {
                                                        const visibleFields = column.fields.filter(f => !f.hidden);
                                                        if (!visibleFields.length) return null;

                                                        return (
                                                            <div key={column.key} className="space-y-4">
                                                                {visibleFields.map(field => {
                                                                    const isTable = Array.isArray(field.value);
                                                                    return (
                                                                        <FieldCell
                                                                            key={field.key}
                                                                            field={field}
                                                                            tabKey={tab.key}
                                                                            tabLabel={tab.label}
                                                                            canEdit={can({ app: "Profile", page: "Employee Profile", action: "Edit" })}
                                                                            isTable={isTable}
                                                                            onEdit={setEdit}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    allVisibleFields.map(field => {
                                                        const isTable = Array.isArray(field.value);
                                                        return (
                                                            <FieldCell
                                                                key={field.key}
                                                                field={field}
                                                                tabKey={tab.key}
                                                                tabLabel={tab.label}
                                                                canEdit={can({ app: "Profile", page: "Employee Profile", action: "Edit" })}
                                                                isTable={isTable}
                                                                onEdit={setEdit}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
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

interface FieldCellProps {
    field: import("./FrappeToFormIoConverterSepTabs").SimpleField;
    tabKey: string;
    tabLabel: string;
    canEdit: boolean;
    isTable: boolean;
    onEdit: (v: { key: string; label: string; fieldname?: string; rowIndex?: number }) => void;
}

const FieldCell = ({ field, tabKey, tabLabel, canEdit, isTable, onEdit }: FieldCellProps) => (
    <div className={isTable ? "col-span-full mt-4" : "px-4 py-2 hover:border-primary-200 transition-colors"}>
        <div className="flex items-center justify-between mb-3">
            <Typography variant="label" color="disabled" className="font-bold text-[10px] uppercase tracking-widest block">
                {field.label || "-"}
            </Typography>
            {canEdit && !field.readOnly && !isTable && (
                <button
                    onClick={() => onEdit({ key: tabKey, label: field.label || tabLabel, fieldname: field.key })}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors group/edit"
                    title={`Edit ${field.label}`}
                >
                    <PencilIcon className="h-3 w-3 text-primary-600 opacity-0 group-hover/editing:opacity-100 transition-opacity" />
                </button>
            )}
        </div>
        {field.type === "file" ? (
            field.value ? (<Link to={field.value} target="_blank" className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors font-medium text-sm">
                <FileText size={14} />
                <span className="truncate max-w-[200px] inline-block">{field.value}</span>
            </Link>) : "—"
        ) : isTable ? (
            <CardsRenderer
                items={field.value}
                canEdit={canEdit && !field.readOnly}
                onEdit={(index) => onEdit({ key: tabKey, label: field.label || tabLabel, fieldname: field.key, rowIndex: index })}
            />
        ) : (
            <Typography variant="bodyMedium" className="font-bold text-gray-900">
                {field.value || "—"}
            </Typography>
        )}
    </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CardsRenderer = ({ items, onEdit, canEdit }: { items: Record<string, any>[], onEdit?: (index: number) => void, canEdit: boolean }) => {
    if (!Array.isArray(items) || items.length === 0) {
        return <Typography variant="bodySmall" color="secondary" className="italic">No data available</Typography>;
    }

    const getStartDateValue = (item: Record<string, any>) => {
        for (const [key, field] of Object.entries(item)) {
            const isStructured = field && typeof field === 'object' && 'value' in field;
            const label = (isStructured && field.label) ? field.label : formatKey(key);
            if (label === "Start Date") {
                return isStructured ? field.value : field;
            }
        }
        return null;
    };

    const sortedItemsWithOriginalIndex = items
        .map((item, index) => ({ item, originalIndex: index }))
        .sort((a, b) => {
            const aDateStr = getStartDateValue(a.item);
            const bDateStr = getStartDateValue(b.item);

            if (!aDateStr && !bDateStr) return 0;
            if (!aDateStr) return 1;
            if (!bDateStr) return -1;

            const parseDate = (dateStr: any) => {
                if (!dateStr) return 0;
                if (typeof dateStr === 'string' && dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3 && parts[0].length === 2) {
                        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                    }
                }
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? 0 : date.getTime();
            };

            const aTime = parseDate(aDateStr);
            const bTime = parseDate(bDateStr);

            return bTime - aTime; // Newest first
        });

    return (
        <div className="flex overflow-x-auto gap-4 pb-2 w-full min-h-fit snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {sortedItemsWithOriginalIndex.map(({ item, originalIndex }) => (
                <div key={item?.id || item?.name || originalIndex} className="min-w-[100%] max-w-[100%] md:min-w-[400px] md:max-w-[400px] h-fit flex-shrink-0 snap-start">
                    <GenericCard data={item} onEdit={() => onEdit?.(originalIndex)} canEdit={canEdit} />
                </div>
            ))}
        </div>
    );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenericCard = ({ data, onEdit, canEdit }: { data: Record<string, any>, onEdit?: () => void, canEdit: boolean }) => {
    if (!data || typeof data !== "object") return null;
    // console.log(data, "data------------------------------------")
    return (
        <Card shadow="none" radius="xl" padding="md" className="bg-gray-50/30 border border-gray-100 hover:border-primary-100 transition-all group/card h-full relative">
            {canEdit && (
                <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1.5 bg-white border border-gray-100 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-gray-50 shadow-sm transition-all"
                        title="Edit entry"
                    >
                        <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
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
                            <Typography variant="label" color="disabled" className="font-bold text-[10px] uppercase tracking-widest trim line-clamp-1 border-b">
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
