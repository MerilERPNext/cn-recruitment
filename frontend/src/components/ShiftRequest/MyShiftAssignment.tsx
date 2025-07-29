import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useMyCurrentShiftAssignment } from "../../hooks/useShift";
import { useCurrentEmployeeAllDetails} from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";

export default function MyShiftAssignment() {
  const navigatore = useNavigate();
  const { data: user_id } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(user_id || "");
  const employee_id = user?.employee;
  const { data: shiftTypes, isLoading, error } = useMyCurrentShiftAssignment(employee_id || "");
  
  const handleshiftForm = () => {
    navigatore(`/webapp/shift-request/shift-change-form`);
  };

  // Centered loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading shifts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading shifts</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!shiftTypes?.data || shiftTypes.data.length === 0) {
    return (
      <div className="flex flex-col min-h-[50vh]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No shift assignments found</h3>
            <p className="text-gray-600">You don't have any shift assignments yet.</p>
          </div>
        </div>
        
        {/* Fixed bottom button */}
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

  // Data available - render shift list
  return (
    <div className="flex flex-col mb-24 gap-2">
      {shiftTypes.data.map((item, index) => (
        <div
          key={`shift-${item.name || item.shift_type || index}`}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="mb-0">
            {item.status === "Active" ? (
              <h3 className="text-sm font-semibold text-green-600 mb-2">
                Current Shift
              </h3>
            ) : (
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Past Shift
              </h3>
            )}

            <h2 className="text-[15px] font-bold text-gray-900 mb-2">
              {item.shift_type}
            </h2>
          </div>

          <div className="flex items-center justify-between">
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

      {/* Fixed bottom button */}
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