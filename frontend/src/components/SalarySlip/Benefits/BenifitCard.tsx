import { StatusBadge } from "../../ShiftRequest/AllShiftsDashboard";
import { format } from "date-fns";
import { useScreenSize } from "../../../hooks/useScreenSize";

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
          className={`w-full  grid grid-cols-6 items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer`}
        >
          <div className="font-medium">{data?.employee_name}</div>
          <div className="font-medium">
            <StatusBadge status={status?.label} />
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
        <div className="w-full px-2 my-1 flex border border-gray-200 items-center justify-between bg-white rounded-xl cursor-pointer hover:shadow-md transition-shadow">
          <div className="p-2 w-full">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-1 flex-col">
                <div className="font-bold">{data?.employee_name}</div>
                <div className="flex gap-2">
                  {data?.earning_component}
                  <StatusBadge status={status?.label} />
                </div>
                <div className="text-sm text-gray-500">
                  {formattedClaimDate}
                </div>
                <div
                  className={
                    isMasked ? "text-start blur-sm select-none" : "text-start"
                  }
                >
                  Claimed Amount: {data?.claimed_amount} {data?.currency}
                </div>
                <div
                  className={
                    isMasked ? "text-start blur-sm select-none" : "text-start"
                  }
                >
                  Max Amount Eligible: {data?.max_amount_eligible}{" "}
                  {data?.currency}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BenefitCard;
