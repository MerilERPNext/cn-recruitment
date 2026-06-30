import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderBar from "../../HeaderBar";
import { useGetFlowRequestById } from "../../../hooks/useFlows";
import ApprovalTracker from "../Separation/components/ApprovalTracker";
import ActivityLogDrawer from "../../shared/ActivityLogDrawer";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";
import { SeparationSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { ErrorView } from "../../shared/DetailViewErrorLoadingWrapper";
import NoDataFound from "../../shared/atoms/NoDataFound";

const SeparationRecord: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

    const { data: flowResponse, isLoading, isError, error } = useGetFlowRequestById(id || "");
    const flowRequestData = flowResponse?.data;

    if (isLoading) {
        return <SeparationSkeleton />;
    }

    if (isError) {
        return (
            <ErrorView
                onClose={() => navigate(-1)}
                label="Separation Record"
                error={error instanceof Error ? error : new Error("Failed to load separation record")}
            />
        );
    }

    if (!flowRequestData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <NoDataFound title="Separation Record Not Found" subtitle="We couldn't retrieve this separation record details." />
                <Button variant="outline" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </div>
        );
    }

    const forType =
        flowRequestData?.flow_name?.includes("Termination") ||
            flowRequestData?.category?.includes("Termination")
            ? "Employee Termination"
            : "Employee Separation";

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="max-md:fixed max-md:top-0 w-full">
                <HeaderBar
                    title="Separation Record"
                    showBackButton={true}
                    onBack={() => navigate(-1)}
                    rightSlot={
                        <Button
                            variant="outline"
                            onClick={() => setIsActivityLogOpen(true)}
                            className="flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm"
                        >
                            <span>Activity Log</span>
                        </Button>
                    }
                />
            </div>
            <div className="md:p-4 md:gap-4 flex-1 overflow-y-auto  max-md:mt-14">
                <div className="flex flex-col items-center justify-center md:mb-4 max-md:px-4 mb-4 text-center">
                    <Typography variant="bodySmall" color="body2">
                        View your separation record
                    </Typography>
                </div>
                <main className="mb-2">
                    <div className="max-w-full">
                        <ApprovalTracker
                            For={forType}
                            data={flowRequestData}
                            isLoading={isLoading}
                        />
                    </div>
                </main>
            </div>
            <ActivityLogDrawer
                open={isActivityLogOpen}
                onClose={() => setIsActivityLogOpen(false)}
                funnelActivityId={id || ""}
                title="Activity Log"
                size="xxl"
            />
        </div>
    );
};

export default SeparationRecord;
