import { useScreenSize } from "../../../hooks/useScreenSize";
import { FlowRequestItem } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { truncateByChars } from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";


interface FlowRequestCardProps {
    request: FlowRequestItem;
    handleShowDetails: (data: FlowRequestItem) => void;
}
const FlowRequestCard: React.FC<FlowRequestCardProps> = ({
    request,
    handleShowDetails,
}) => {
    const { isDesktop } = useScreenSize();

    if (!isDesktop) {
        return (
            <div className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary p-6 transition-shadow duration-200 flex flex-col gap-5 bg-white cursor-pointer" onClick={() => handleShowDetails(request)}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col gap-2">
                        <Typography variant="mobileCardLabel" className="block">
                            Flow Name
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.flow_name}
                        </Typography>
                    </div>
                    <StatusBadge status={request.approval_status} />
                </div>

                <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                        <Typography variant="mobileCardLabel" className="block">
                            Category
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.category}
                        </Typography>
                    </div>

                    <div className="flex flex-col gap-2 text-right">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated On
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {formatToIndianDate(request.initiated_on)}
                        </Typography>
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated By
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.initiated_by}
                        </Typography>
                    </div>

                    <div className="flex flex-col gap-2 text-right">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated For
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.initiated_for}
                        </Typography>
                    </div>
                </div>

                <div>
                    <div className="h-[1px] w-full bg-gray-100 mb-4" />
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <Typography variant="caption" className="text-gray-500">
                                Workflow Status
                            </Typography>
                            <StatusBadge status={request.workflow_status} />
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <Typography variant="caption" className="text-gray-500">
                                Overall Status
                            </Typography>
                            <StatusBadge status={request.overall_flow_status} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-4 grid grid-cols-[1fr_1fr_150px_150px_150px_150px_150px_150px] gap-4 text-center cursor-pointer hover:bg-blue-50" onClick={() => handleShowDetails(request)}>
            <div>  <Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.flow_name}>{truncateByChars(request.flow_name, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.category}>{truncateByChars(request.category, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center">{formatToIndianDate(request.initiated_on)}</Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.initiated_by}>{truncateByChars(request.initiated_by, 15)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.initiated_for}>{truncateByChars(request.initiated_for, 15)}</Tooltip></Typography></div>
            <div> <StatusBadge status={request.approval_status} /></div>
            <div><StatusBadge status={request.workflow_status} /></div>
            <div><StatusBadge status={request.overall_flow_status} /></div>
        </div>
    );
};

export default FlowRequestCard;