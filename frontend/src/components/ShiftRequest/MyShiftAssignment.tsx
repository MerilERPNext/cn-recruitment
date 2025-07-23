import { Plus } from "lucide-react";
import { useNavigate } from "react-router";

const myShiftData = {
  currentShift: {
    title: "Morning Shift (09:00 - 17:00)",
    from: "01-10-2024",
    to: "31-10-2024",
  },
};

export default function MyShiftAssignment() {
  const navigatore = useNavigate();
  const handleshiftForm = () => {
    navigatore(`/webapp/shift-request/shift-change-form`);
  };
  return (
    <div className="">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-0">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Current Shift
          </h3>
          <h2 className="text-[15px] font-bold text-gray-900 mb-2">
            {myShiftData.currentShift.title}
          </h2>
        </div>

        <div className="space-y-2 mb-2">
          <div className="flex justify-start gap-2">
            <span className="text-gray-600">From:</span>
            <span className="font-medium">{myShiftData.currentShift.from}</span>
          </div>
          <div className="flex justify-start gap-2">
            <span className="text-gray-600">To: </span>
            <span className="font-medium">{myShiftData.currentShift.to}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full p-4 flex justify-center items-center bg-white border-t border-gray-200">
        <button
          onClick={handleshiftForm}
          className="w-[90%] flex items-center justify-center gap-2 py-3 px-4 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Plus size={18} />
          Request Shift Change
        </button>
      </div>
    </div>
  );
}
