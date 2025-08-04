import { useNavigate } from "react-router";
import { useMyCurrentShiftAssignment } from "../../hooks/useShift";
import RequestShiftChangeButton from "./RequestShiftChangeButton";

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

      <RequestShiftChangeButton onClick={handleshiftForm} />
    </div>
  );
}
