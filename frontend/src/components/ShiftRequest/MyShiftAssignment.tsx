import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useMyCurrentShiftAssignment } from "../../hooks/useShift";

export default function MyShiftAssignment() {
  const navigatore = useNavigate();
  const handleshiftForm = () => {
    navigatore(`/webapp/shift-request/shift-change-form`);
  };

  const { data: shiftTypes, isLoading, error } = useMyCurrentShiftAssignment();
  console.log(shiftTypes, "<<<<<<<<<<<<<<<<<<<<<<<");

  if (isLoading) return <div>Loading shifts…</div>;
  if (error)
    return (
      <div className="text-red-600">Error loading shifts: {error.message}</div>
    );

  return (
    <div className=" flex flex-col gap-2">
      {shiftTypes?.data.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="mb-0">
            {item.status === "Active" ? (
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Current Shift
              </h3>
            ) : (
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Past Shift
              </h3>
            )}

            <h2 className="text-[15px] font-bold text-gray-900 mb-2">
              {item.shift_type}
            </h2>
          </div>

          <div className="space-y-2 mb-2">
            <div className="flex justify-start gap-2">
              <span className="text-gray-600">From:</span>
              <span className="font-medium">{item.start_date}</span>
            </div>
            <div className="flex justify-start gap-2">
              <span className="text-gray-600">To:</span>
              <span className="font-medium">{item.end_date}</span>
            </div>
          </div>
        </div>
      ))}

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
