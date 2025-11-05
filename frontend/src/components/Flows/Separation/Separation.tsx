import { BellDot } from "lucide-react";
import image from "../../../assets/welcome-sep.svg";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useChatAssistant, useDifinitaionName } from "../../../hooks/useFlows";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";

const Separation = () => {
  const { data: userId } = useLoggedInUser();
  const { data: employee_name } = useCurrentEmployeeAllDetails(userId || "");
  const doctype_name = "Employee";
  const document_name = employee_name?.name || "";
  const { data: definitionName } = useDifinitaionName();
  const definition_name = definitionName || "";
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
      window.trigger_chatnext_assistant(
       true,
       data?.session
      );
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
    }
  };

  return (
    <DesktopLayoutWrapper title="Separation">
   <div className="flex flex-col min-h-screen p-6 gap-4 bg-white">
    {/*list view of separation */}
    <div className="flex justify-between rounded items-center p-3 border bg-blue-50 border-blue-300">
      <span className="flex flex-row gap-2 items-center justify-center "><BellDot className="w-4 h-4 text-red-500"/><p className="text-[11px]">Draft request for separation</p></span>
      <div className="space-x-2">
        <button className="border px-4 py-2 rounded bg-white text-black font-semibold text-[12px] hover:bg-gray-100 ">EDIT FORM</button>
        <button className="border px-4 py-2 rounded bg-blue-500 text-white font-semibold  text-[12px] hover:bg-blue-600 ">DISCARD</button>
        </div>   
         </div>
    {/* Full screen container with centered card layout*/} 
   <div className="min-h-screen bg-gray-50 flex items-start justify-center">
        <div className="bg-gray-200 rounded-xl shadow-sm w-full max-w-full overflow-hidden">
          {/* Main content */}
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Left Section */}
            <div className="flex-1 p-10">
              <div className="bg-blue-200 text-black font-bold text-xl md:text-4xl leading-snug md:p-8 p-4 rounded-lg sm:w-fit ">
                <p className="md:max-w-[280px] w-full">WE’RE SAD TO SEE YOU GO</p>
              </div>
              <p className="mt-6 text-gray-700 text-sm md:text-base md:text-start text-center">
                Please connect with your HBRP once
              </p>
            </div>

            {/* Right Section (illustration) */}
            <div className="flex-1 flex justify-center p-10">
              <img
                src={image}
                alt="Goodbye illustration"
                className="max-h-64 object-contain"
              />
            </div>
          </div>

          {/* Button */}
          <div className="flex justify-center py-6">
            <button
              className="border border-gray-300 text-white bg-blue-500 font-semibold px-6 py-2 rounded-md hover:bg-blue-600 transition"
              onClick={handleTriggerChat}
            >
              INITIATE SEPARATION
            </button>
          </div>
        </div>
      </div>
   </div>
    </DesktopLayoutWrapper>
  );
};

export default Separation;
