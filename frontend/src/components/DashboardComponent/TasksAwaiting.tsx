import React from "react";
import { FileText } from "lucide-react";
import FrappeListView from "../ListView";
import DOMPurify from "dompurify";
import { ViewAll } from "../shared/atoms/ViewAll";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import { getDueStatus } from "./DueStatus";

interface ToDo {
  priority: string;
  custom_due_datetime: string;
  name: string;
  description?: string;
  owner?: string;
  status?: string;
  reference_type?: string;
  reference_name?: string;
  date?: string;
}

const MyToDoItem: React.FC<{
  item: ToDo;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  // Status condition with colors
  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    let bg = "bg-gray-100";
    let text = "text-gray-600";

    if (status.toLowerCase() === "open") {
      bg = "bg-red-100";
      text = "text-red-600";
    } else if (status.toLowerCase() === "closed") {
      bg = "bg-green-100";
      text = "text-green-600";
    }

    return (
      <span
        className={`px-2 py-1 rounded-lg flex items-center justify-center ${bg}`}
      >
        <p className={`text-xs font-medium ${text}`}>{status}</p>
      </span>
    );
  };

  // Priority color pills
  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    let bg = "bg-gray-100";
    let text = "text-gray-600";

    switch (priority.toLowerCase()) {
      case "low":
        bg = "bg-green-100";
        text = "text-green-600";
        break;
      case "medium":
        bg = "bg-yellow-100";
        text = "text-yellow-600";
        break;
      case "high":
        bg = "bg-orange-100";
        text = "text-orange-600";
        break;
      case "urgent":
        bg = "bg-red-100";
        text = "text-red-600";
        break;
      default:
        break;
    }

    return (
      <span
        className={`px-2 py-1 rounded-lg flex items-center justify-center ${bg}`}
      >
        <p className={`text-xs font-medium ${text}`}>{priority}</p>
      </span>
    );
  };

  return (
    <div className="flex items-center p-2 rounded-lg bg-gray-100 gap-3 mb-2">
      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex w-full">
        <div className="flex w-full items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium">
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(item.description || "Task"),
              }}
            />
          </span>
          <div className="flex items-center justify-between w-full pr-8">
            {item.date && (
              <span className={`flex items-center gap-1 text-xs bg-${getDueStatus(item.date).color}-100 text-${getDueStatus(item.date).color}-600 px-2 rounded`}>
             {getDueStatus(item.date).icon} <span>{getDueStatus(item.date).status}: {formatDateDDMonthYYYY(item.date)}</span>  
              </span>
            )}
            <div className="flex gap-2">
              {getPriorityBadge(item.priority)}
              {getStatusBadge(item.status)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  const handleTodoClick = () => {
    window.open(`/app/task_manager`);
  };
  return (
    <div className="bg-white rounded-lg p-6 mb-2 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Tasks Awaiting You</h3>
        <ViewAll title="Visit Todo" onClick={handleTodoClick} />
      </div>

      <div className="overflow-y-auto h-[25rem]">
        <FrappeListView
          doctype="ToDo"
          ItemComponent={MyToDoItem}
          isSearch={false}
          pageSize={15}
          orderBy="date desc"
          
          defaultFilters={{ status: "Open" }}
          defaultFields={[
            "name",
            "description",
            "owner",
            "status",
            "reference_type",
            "reference_name",
            "date",
            "priority",
          ]}
          searchFields={["description", "owner", "status"]}
          showPagination={false}
        />
      </div>
    </div>
  );
};

export default TasksAwaiting;
