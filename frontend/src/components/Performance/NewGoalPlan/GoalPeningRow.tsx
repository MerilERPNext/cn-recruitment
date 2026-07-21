import React, { useState } from "react";
import DropdownMenu from "../../shared/DropDownMenu";
import { ChevronDown, Edit, MoreVertical, Trash2 } from "lucide-react";
import type { GroupGoalItem, SubGoal } from "../../../types/goal";
import SubGoalRow from "./SubGoalRow";
import CreateGoalDialog from "./CreateGoalDialog";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface GoalPeningRowProps {
  gtc: string;
  data: GroupGoalItem;
  isLastItem: boolean;
}

const GoalPeningRow: React.FC<GoalPeningRowProps> = ({
  gtc,
  data,
  isLastItem,
}) => {
  const statusColors: Record<string, string> = {
    "Not Started": "bg-gray-200 text-gray-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    "On Hold": "bg-yellow-100 text-yellow-700",
    Delayed: "bg-orange-100 text-orange-700",
    "At Risk": "bg-red-100 text-red-700",
  };
  const [showEditModel, setShowEditModel] = useState(false);
  const [showSubGoals, setShowSubGoals] = useState(false);
  return (
    <div className="flex flex-col">
      <div
        className="grid grid-cols-4 items-center gap-4 px-4 bg-white py-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer "
        style={{
          gridTemplateColumns: gtc,
        }}
        onClick={() => setShowSubGoals((prev) => !prev)}
      >
        <div className="text-sm font-medium text-gray-700 text-start truncate flex">
          {data.subgoals.length > 0 ? (
            <ChevronDown className={`mr-2 ${showSubGoals && "rotate-180"}`} />
          ) : (
            <div className="mr-r ml-8" />
          )}
          <div>
            <span className="text-sm font-medium text-gray-700 text-start truncate">
              {data.goal}
            </span>
            <br />
            <span className="text-xs text-gray-600">
              {formatToIndianDate(data.start_date)} -{" "}
              {formatToIndianDate(data.end_date)}
            </span>
          </div>
        </div>
        <span
          className={`w-fit h-fit rounded-xl px-2 text-sm ${statusColors[data.status] || "bg-gray-100 text-gray-700"}`}
        >
          {data.status}
        </span>
        <span className="text-sm font-medium text-gray-700 text-start truncate">
          {data.achievement} %
        </span>
        <span className="text-sm font-medium text-gray-700 text-start truncate">
          {data.weightage} %
        </span>
        <span>
          <DropdownMenu
            placement={
              isLastItem && (!showSubGoals || data.subgoals.length == 0)
                ? "center-left"
                : "bottom-left"
            }
            items={[
              {
                label: "Edit",
                icon: <Edit className="h-4 w-4" />,
                onClick: () => setShowEditModel(true),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4 text-red-500" />,
                onClick: () => console.log("Delete"),
              },
            ]}
          >
            <button className="p-2 border-1 rounded-lg hover:bg-gray-200" aria-label={`Open actions for ${data.goal}`}>
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenu>
        </span>
      </div>
      <div>
        {showSubGoals &&
          data.subgoals.map((subgoal: SubGoal, index: Number) => (
            <SubGoalRow
              gtc={gtc}
              data={subgoal}
              isLastSubGoal={index === data.subgoals.length - 1}
            />
          ))}
      </div>
      {showEditModel && (
        <CreateGoalDialog
          actionType="Update"
          defaultData={data}
          isOpen={showEditModel}
          onClose={() => setShowEditModel(false)}
        />
      )}
    </div>
  );
};

export default GoalPeningRow;
