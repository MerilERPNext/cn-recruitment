import { User } from "lucide-react";
import { useNavigate } from "react-router";
import { useTeamShiftAssignment } from "../../hooks/useShift";
import RequestShiftChangeButton from "./RequestShiftChangeButton";

export default function TeamShift() {
  const navigate = useNavigate();
  const { data: shiftTypes } = useTeamShiftAssignment();

  const handleShiftForm = () => {
    navigate("/webapp/shift-request/shift-change-form");
  };

  const mappedShiftData = shiftTypes?.data?.map((item, index) => ({
    id: index,
    name: item.employee_name || "N/A",
    shiftType: item.shift_type || "No shift type",
    duration: item.start_date && item.end_date
      ? `${item.start_date} to ${item.end_date}`
      : item.start_date
        ? `${item.start_date} to -`
        : "No date info"
  })) || [];

  return (
    <div className="pb-24">
      <div className="space-y-4">
        {mappedShiftData.map((member) => (
          <div key={member.id} className="bg-white border-gray-200 p-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <User size={24} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <p className="text-gray-700 font-medium mb-1">{member.shiftType}</p>
                <p className="text-sm text-gray-500">{member.duration}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RequestShiftChangeButton onClick={handleShiftForm} />
    </div>
  );
}
