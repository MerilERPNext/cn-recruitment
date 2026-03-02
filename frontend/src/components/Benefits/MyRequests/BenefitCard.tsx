import { format } from "date-fns";
import { useScreenSize } from "../../../hooks/useScreenSize";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";

const BenefitCard = ({
    data,
    isMasked,
}: {
    data: {
        claim_date: string;
        custom_status: string;
        employee_name: string;
        earning_component: string;
        currency: string;
        claimed_amount: number;
        max_amount_eligible: number;
    };
    isMasked: boolean;
}) => {
    const { isDesktop } = useScreenSize();


    const formattedClaimDate = data?.claim_date
        ? format(new Date(data?.claim_date), "dd/MM/yyyy")
        : "N/A";

    const status = {
        label: data?.custom_status || "N/A",
        statusColor:
            data?.custom_status === "Approved"
                ? "bg-green-100 text-green-800"
                : data?.custom_status === "Rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800",
    };

    return (
        <>
            {isDesktop ? (
                <div
                    className={`w-full  grid grid-cols-6 items-center gap-4 px-6 min-h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer`}
                >
                    <div className="font-medium">{data?.employee_name}</div>
                    <div className=" text-start relative group inline-block overflow-visible">
                        <StatusBadge status={status?.label} />
                        {/* Tooltip */}
                        <div
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
               opacity-0 invisible group-hover:opacity-100 group-hover:visible
               transition-all duration-150 ease-out pointer-events-none
               bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap
               shadow-lg z-50"
                        >
                            {data?.employee_name}
                        </div>
                    </div>
                    <div className="text-start">{data?.earning_component}</div>
                    <div className=" text-start">{formattedClaimDate}</div>
                    <div
                        className={
                            isMasked ? "text-start blur-sm select-none" : "text-start"
                        }
                    >
                        {data?.claimed_amount} {data?.currency}
                    </div>
                    <div
                        className={
                            isMasked ? "text-start blur-sm select-none" : "text-start"
                        }
                    >
                        {data?.max_amount_eligible} {data?.currency}
                    </div>
                </div>
            ) : (
                <div className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-2xl w-full my-2">
                    <div className="p-4 flex items-start w-full">
                        <div className="flex flex-col gap-1 w-full text-start">
                            <Typography variant="mobileCardTitle">
                                {data?.employee_name}
                            </Typography>

                            <div className="flex items-center gap-2 mt-1">
                                <Typography variant="mobileCardLabel">
                                    {data?.earning_component}
                                </Typography>
                                <StatusBadge status={status?.label} />
                            </div>

                            <div className="mt-1">
                                <Typography variant="mobileCardLabel">
                                    {formattedClaimDate}
                                </Typography>
                            </div>

                            <div className={isMasked ? "blur-sm select-none mt-1" : "mt-1"}>
                                <Typography variant="mobileCardLabel">
                                    Claimed Amount: <span className="text-gray-800 font-semibold">{data?.claimed_amount} {data?.currency}</span>
                                </Typography>
                            </div>

                            <div className={isMasked ? "blur-sm select-none" : ""}>
                                <Typography variant="mobileCardLabel">
                                    Max Amount Eligible: <span className="text-gray-800 font-semibold">{data?.max_amount_eligible} {data?.currency}</span>
                                </Typography>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BenefitCard;
