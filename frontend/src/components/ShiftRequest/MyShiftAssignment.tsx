import { useNavigate } from "react-router";
import { useMyCurrentShiftAssignment } from "../../hooks/useShift";

export default function MyShiftAssignment() {
  const navigatore = useNavigate();
  const handleshiftForm = () => {
    navigatore(`/webapp/shift-request/shift-change-form`);
  };

  const { data: shiftTypes, isLoading, error } = useMyCurrentShiftAssignment();

  if (isLoading) return <div>Loading shifts…</div>;
  if (error)
    return (
      <div className="text-red-600">Error loading shifts: {error.message}</div>
    );

  return (
    <div className=" flex flex-col mb-24 gap-2">
      {shiftTypes?.data.map((item, index) => (
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

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-md mx-auto p-4">
          <button
            onClick={handleshiftForm}
            className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Request Shift Change
          </button>
        </div>
      </div>

    </div>
  );
}
