import { User } from "lucide-react";
import { useNavigate } from "react-router";
import RequestShiftChangeButton from "./RequestShiftChangeButton"; 

const teamShiftData = [
  {
    id: 1,
    name: "Jane Doe",
    shiftType: "Morning Shift (09:00 - 17:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 2,
    name: "John Smith",
    shiftType: "Night Shift (21:00 - 05:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 3,
    name: "Peter Jones",
    shiftType: "Evening Shift (16:00 - 00:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 4,
    name: "Susan Lee",
    shiftType: "General Shift (10:00 - 18:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 4,
    name: "Susan Lee",
    shiftType: "General Shift (10:00 - 18:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 4,
    name: "Susan Lee",
    shiftType: "General Shift (10:00 - 18:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 4,
    name: "Susan Lee",
    shiftType: "General Shift (10:00 - 18:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
  {
    id: 4,
    name: "Susan Lee",
    shiftType: "General Shift (10:00 - 18:00)",
    duration: "01-10-2024 to 31-10-2024",
  },
];

export default function TeamShift() {
  const navigate = useNavigate();

  const handleShiftForm = () => {
    navigate("/webapp/shift-request/shift-change-form");
  };

  return (
    <div className=" pb-24">
      <div className="space-y-4">
        {teamShiftData.map((member) => (
          <div key={member.id} className="bg-white border-gray-200 p-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <User size={24} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 ">{member.name}</h3>
                <p className="text-gray-700 font-medium mb-1">
                  {member.shiftType}
                </p>
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
