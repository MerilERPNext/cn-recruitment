/* eslint-disable @typescript-eslint/no-explicit-any */
import img from "../../../assets/pngegg.png";
import { useCurrentEmployeeAllDetails, useEmployee } from "../../../hooks/useEmployee";
import {
  useChatAssistant,
  useDifinitaionNameForSeparation,
} from "../../../hooks/useFlows";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import {
  useConfirmationAndseparation,
  // useConfirmationEmployee,
} from "../../../hooks/useConfiremnation";
import Button from "../../shared/atoms/Button";
import ApprovalTracker from "./Component/ApprovalTracker";
import { Loader2 } from "lucide-react";
import { useTargetUser } from "../../../context/ViewedUserContext";

const ConfirmationWorkflow = () => {
  const { data: userId } = useLoggedInUser();
  const { data: employee_name } = useCurrentEmployeeAllDetails(userId || "");
  const { targetEmployeeId, isViewingOtherUser } =
    useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  const doctype_name = "Employee";
  const doctype = "Employee Confirmation";
  const document_name = isViewingOtherUser ? targetEmployee?.name || "" : employee_name?.name || "";
  const { data: definitionName, refetch } = useDifinitaionNameForSeparation();
  const triggerRefetch = () => { refetch(); };
  function getFunnelData(trigger_category: string) {
    return Array.isArray(definitionName)
      ? definitionName.filter(
        (item: any) =>
          item?.trigger_category?.name === trigger_category
      )
      : [];
  }
  const { data: confirmationCreationData, isLoading } = useConfirmationAndseparation(doctype);
  const item = confirmationCreationData?.[0];
  const confirmationData = getFunnelData("Confirmation");
  const definition_name = confirmationData?.[0]?.name || "";
  const l = "true";

  console.log("confirmationData", confirmationData)

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

  /* -------------------- LOADING Spinner -------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }
  /* ---------------------------------------------------------- */

  return (
    <div className=" bg-white  min-h-screen  p-8  text-gray-800  font-sans">
      {/* Header */}
      {item ?
        <main className="min-h-full bg-background mb-2">
          <div className="max-w-full">
            <ApprovalTracker triggerRefetch={triggerRefetch} data={item} />
          </div>
        </main>
        :
        <div className=" items-start  mb-6">
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


            <Button
              onClick={handleTriggerChat}
              size="md"
              bgColor="blue-500"
              className="hover:bg-blue-600"
            >
              INITIATE CONFIRMATION
            </Button>

          </div>
        </div>
      }
    </div>
  );
};

export default ConfirmationWorkflow;
