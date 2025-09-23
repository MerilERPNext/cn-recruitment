import React from "react";
import { FileText } from "lucide-react";
import FrappeListView from "../ListView";

interface ToDo {
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

  return (
    <div className="flex items-center p-2 rounded-lg bg-gray-100 gap-3 mb-2">
      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-purple-600" />
      </div>
      <div className="flex w-full">
        <div className="flex w-full items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium">
            <div
              dangerouslySetInnerHTML={{
                __html: item.description || "Task",
              }}
            />
          </span>
          <div className="flex items-center justify-between w-full pr-8">
            {item.date && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                Due on {item.date}
              </span>
            )}
            {getStatusBadge(item.status)}
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  return (
    <div className="bg-white rounded-lg p-6 mb-2 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Tasks Awaiting You</h3>
      <FrappeListView
        doctype="ToDo"
        ItemComponent={MyToDoItem}
        isSearch={false}
        orderBy="date"
        pageSize={3}
        defaultFields={[
          "name",
          "description",
          "owner",
          "status",
          "reference_type",
          "reference_name",
          "date",
        ]}
        searchFields={["description", "owner", "status"]}
        showPagination={false}
      />
    </div>
  );
};

export default TasksAwaiting;
