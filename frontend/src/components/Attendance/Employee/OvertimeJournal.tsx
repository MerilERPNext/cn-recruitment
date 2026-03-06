import { useState } from "react";
import Button from "../../shared/atoms/Button";
import TableSkeleton from "../../shared/molecules/Skeletons/TableSkeleton";
import SideDrawer from "../../shared/SideDrawer";
import NavigationTabs, { Tab } from "../../NavigationTab";
import { KeyValueItem, OvertimeJournalData, PolicyItem } from "../../../types/attendance";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";



interface Props {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: OvertimeJournalData;
    date: string;
}

const OvertimeJournal = ({
    isLoading,
    isError,
    error,
    data,
    date,
}: Props) => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overtime");

    const tabs: Tab[] = [
        { key: "overtime", label: "Overtime Details" },
        { key: "compOff", label: "Comp Off Details" },
        { key: "policy", label: "Policy Details" },
    ];

    const renderKeyValueTable = (rows?: KeyValueItem[]) => {
        if (!rows || rows.length === 0) {
            return (
                <div className="text-sm text-gray-500 p-4">
                    No data available.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <tbody className="bg-white divide-y divide-gray-100">
                        {rows.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="w-1/2 px-4 py-3 font-medium text-gray-700">
                                    {item.label}
                                </td>
                                <td className="w-1/2 px-4 py-3 text-gray-800">
                                    {item.value ?? "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderPolicyTable = (rows?: PolicyItem[]) => {
        if (!rows || rows.length === 0) {
            return (
                <div className="text-sm text-gray-500 p-4">
                    No policy data available.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                Policy Attribute
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                Description
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-100">
                        {rows.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700">
                                    {item.policy_attribute}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`px-2 py-1 rounded-lg text-xs font-medium ${item.status === "Yes"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {item.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case "overtime":
                return renderKeyValueTable(data?.overtime_details);
            case "compOff":
                return renderKeyValueTable(data?.comp_off_details);
            case "policy":
                return renderPolicyTable(data?.policy_details);
            default:
                return null;
        }
    };

    return (
        <>
            <Button
                variant="subtle"
                className="whitespace-nowrap"
                size="sm"
                onClick={() => setOpen(true)}
            >
                Overtime Journal
            </Button>

            <SideDrawer
                open={open}
                onClose={() => setOpen(false)}
                side="right"
                title={"Overtime Journal - " + date}
                size="xxl"
                className="pt-0"
            >
                {/* Make drawer body flex column so tabs stay attached */}
                <div className="flex flex-col h-full">

                    {/* Loading / Error */}
                    {isLoading && (
                        <div className="p-6">
                            <div className="animate-pulse mb-2">
                                <div className="h-8 w-1/2 bg-gray-200 rounded-lg" />
                            </div>
                            <TableSkeleton columns={3} rows={12} />
                        </div>
                    )}

                    {isError && (
                        <div className="p-6">
                            <div className="rounded-md border border-red-200 bg-red-50 text-sm text-red-700 p-4">
                                Failed to load overtime journal.
                                <div className="mt-1 text-xs text-red-600">
                                    {errorResponseFormater(error) || "Something went wrong"}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && !isError && data && (
                        <>
                            {/* Sticky Tabs */}
                            <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
                                <NavigationTabs
                                    tabs={tabs}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    variant="subtle"
                                    bgColor="text"
                                />
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {renderActiveTab()}
                            </div>
                        </>
                    )}

                    {!isLoading && !isError && !data && (
                        <div className="p-6 text-sm text-gray-500">
                            No data available.
                        </div>
                    )}
                </div>
            </SideDrawer>
        </>
    );
};

export default OvertimeJournal;