import React from "react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "../ListView";
import { ViewAll } from "../shared/atoms/ViewAll";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useGetUnreadNotificationCount } from "../../hooks/useNotification";

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
  notificationCount?: number;
}> = ({ item, index = 0, notificationCount = 0 }) => {
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

  // Check if the icon is an SVG
  const isSvg =
    item.icon?.toLowerCase().endsWith(".svg") ||
    item.icon?.toLowerCase().includes(".svg?");

  return (
    <div
      onClick={handleClick}
      className="text-center cursor-pointer hover:scale-105 transition-transform mb-2"
    >
      <div
        className={`w-16 h-16 ${color.bg} rounded-lg mx-auto mb-2 flex items-center justify-center shadow-md relative`}
      >
        {notificationCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] size-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {notificationCount}
          </span>
        )}

        {item.icon ? (
          isSvg ? (
            <div
              className={`w-8 h-8 ${color.text}`}
              style={{
                backgroundColor: "currentColor",
                maskImage: `url(${item.icon})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskImage: `url(${item.icon})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
            />
          ) : (
            <img src={item.icon} alt={item.title} className="w-8 h-8" />
          )
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
  const { data: currentUser } = useCurrentUser();
  const { data: notificationData } = useGetUnreadNotificationCount(
    currentUser?.name
  );

  const getNotificationCount = (title?: string) => {
    if (!title || !notificationData?.apps) return 0;

    return notificationData.apps.find((app) => app.title === title)?.count ?? 0;
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-[rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Admin Apps</h3>
        <ViewAll title="View All" />
      </div>
      <div>
        <FrappeListView
          doctype="CN Microapp"
          ItemComponent={(props) => (
            <MyMicroApp
              {...props}
              notificationCount={getNotificationCount(props.item.title)}
            />
          )}
          isSearch={false}
          layout="column"
          orderBy="creation"
          pageSize={50}
          defaultFields={["*"]}
          searchFields={["title", "status"]}
          showPagination={false}
        />
      </div>
    </div>
  );
};

export default MicroAppInDashboard;
