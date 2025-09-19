import React from "react";
import { useNavigate } from "react-router-dom"; // router navigation
import FrappeListView from "../ListView";

interface CNMicroapp {
  name: string;
  title?: string;
  content_route?: string;
  status?: string;
  icon?: string;
}

const MyMicroApp: React.FC<{
  item: CNMicroapp;
  index?: number;
}> = ({ item, index = 0 }) => {
  const navigate = useNavigate();

  const colors = [
    { bg: "bg-yellow-100", text: "text-yellow-600" },
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-green-100", text: "text-green-600" },
    { bg: "bg-red-100", text: "text-red-600" },
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
    { bg: "bg-orange-100", text: "text-orange-600" },
  ];

  const color = colors[index % colors.length];

  const handleClick = () => {
    if (item.content_route) {
      navigate(item.content_route);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="text-center cursor-pointer hover:scale-105 transition-transform"
    >
      <div
        className={`w-12 h-12 ${color.bg} rounded-lg mx-auto mb-2 flex items-center justify-center`}
      >
        {item.icon ? (
          <img src={item.icon} alt={item.title} className="w-6 h-6" />
        ) : (
          <span className={`${color.text} font-bold text-lg`}>
            {item.title ? item.title.charAt(0).toUpperCase() : "A"}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600">{item.title}</p>
    </div>
  );
};

const MicroAppInDashboard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Admin Apps</h3>
        <span className="text-blue-600 text-sm cursor-pointer">View All</span>
      </div>
      <div>
        <FrappeListView
          doctype="CN Microapp"
          ItemComponent={MyMicroApp}
          isSearch={false}
          layout="column"
          orderBy="creation"
          pageSize={8}
          defaultFields={["*"]}
          searchFields={["title", "status"]}
          showPagination={false}
        />
      </div>
    </div>
  );
};

export default MicroAppInDashboard;
