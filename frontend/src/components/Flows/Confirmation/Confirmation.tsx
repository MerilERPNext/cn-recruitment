/* eslint-disable @typescript-eslint/no-explicit-any */
import { FaCheckCircle } from "react-icons/fa";
import img from "../../../assets/pngegg.png";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import {
  useChatAssistant,
  useDifinitaionNameForSeparation,
} from "../../../hooks/useFlows";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import {
  useConfirmation,
  useConfirmationEmployee,
} from "../../../hooks/useConfiremnation";
import Button from "../../shared/atoms/Button";

const ConfirmationWorkflow = () => {
  const { data: userId } = useLoggedInUser();
  const { data: employee_name } = useCurrentEmployeeAllDetails(userId || "");
  const doctype_name = "Employee";
  const document_name = employee_name?.name || "";
  const { data: definitionName } = useDifinitaionNameForSeparation();
  function getFunnelData(funnelName: string) {
    return Array.isArray(definitionName)
      ? definitionName.filter(
          (item: { funnel_name: string }) => item.funnel_name === funnelName
        )
      : [];
  }
  const confirmationCreationData = useConfirmation();
  const { data: confirmationListData } = useConfirmationEmployee();
  console.log(confirmationCreationData  , "asdasdasdasdconfirmationCreationData");
  //   const separationData = getFunnelData("Separation");
  const confirmationData = getFunnelData("Initiate Confirmation tool");
  const definition_name = confirmationData?.[0]?.name || "";
  const l = "true";

  const { data } = useChatAssistant(
    doctype_name,
    document_name,
    definition_name,
    l
  );

  const handleTriggerChat = () => {
    if (
      typeof window !== "undefined" &&
      typeof window.trigger_chatnext_assistant === "function"
    ) {
      window.trigger_chatnext_assistant(true, data?.session);
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
    }
  };

  return (
    <div>
      {confirmationListData?.data?.map((item: any) => (
        <div className=" bg-white  min-h-screen  p-8  text-gray-800  font-sans">
          {/* Header */}
          <div className=" flex  justify-between  items-start  mb-6">
            <div>
              <h2 className=" font-semibold  text-lg">
                {item.employee_name}'s Confirmation Workflow
              </h2>
              <div className=" text-sm  mt-2">
                <p>
                  <span className=" font-semibold">Date of Joining :</span>{" "}
                  {item.date_of_joining}
                </p>
                <p className=" mt-1">
                  <span className=" font-semibold">Status :</span> {item.status}
                </p>
              </div>
            </div>

            <div className=" text-sm">
              <p>
                <span className=" font-semibold">Probation End date :</span>{" "}
                {item.creation}
              </p>
            </div>
          </div>

          {/* Table Header */}
          <div className=" grid  grid-cols-3  border-b  bg-gray-100  text-sm  font-semibold  px-4  py-2">
            <div>STATUS</div>
            <div>EVENT DETAILS</div>
            <div>DATE</div>
          </div>

          {/* Table Rows */}

          <div className=" grid  grid-cols-3  items-center  border-b  text-sm  px-4  py-2 hover: bg-gray-50">
            <div className=" flex  items-center  gap-2">
              <FaCheckCircle className=" text-green-500" />
              <span className=" font-medium">{item.status}</span>
            </div>
            <div>{item.designation}</div>
            <div>{item.date_of_joining}</div>
          </div>

          <div className="   mt-2  min-h-auto  flex   flex-col   items-center   justify-center   rounded-xl      py-4">
            <div className="  flex   flex-col md:flex-row   items-center   justify-between   w-full   bg-[#eef4fd]   rounded-xl   p-6 md:p-12">
              {/* Left Text Section */}
              <div className="  flex-1   text-center md:text-left">
                <div className="  bg-[#6da8ff]   text-white   font-bold   text-3xl md:text-4xl   p-8   rounded-lg   inline-block">
                  WE'RE HAPPY TO CONFIRM YOU 🎉
                </div>
                <p className="  text-gray-600   mt-6   text-sm md:text-base">
                  Please connect with your HRBP for confirmation details.
                </p>
              </div>

              {/* Right Illustration */}
              <div className="  flex-1   flex   justify-center   mt-8 md:mt-0">
                <img
                  src={img}
                  alt="confirmation illustration"
                  className="  w-72 md:w-96   h-auto"
                />
              </div>
            </div>

            {item.status !== "Draft" && item.status !== "Confirmed" && (
              <Button
                onClick={handleTriggerChat}
                size="md"
                bgColor="blue-500"
                className="hover:bg-blue-600"
              >
                INITIATE CONFIRMATION
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConfirmationWorkflow;
