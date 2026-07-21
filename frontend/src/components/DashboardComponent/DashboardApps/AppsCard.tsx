import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDrag, useDrop } from "react-dnd";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useGetUnreadNotificationCount } from "../../../hooks/useNotification";
import IconButton from "../../shared/atoms/IconButton";
import { useScreenSize } from "../../../hooks/useScreenSize";

export const ItemTypes = { APP: "app" } as const;

export interface CNMicroapp {
  display_order: number;
  name: string;
  title?: string;
  content_route: string;
  icon: string;
  is_visible: boolean;
  custom_label?: string;
  redirect_to_new_tab?: boolean;
  is_pinned?: boolean;
  is_favorite?: boolean;
}

interface MyMicroAppProps {
  item: CNMicroapp;
  index: number;
  moveApp: (from: number, to: number) => void;
  onDragEnd: () => void;
}

const COLOR_ROTATION = [
  "primary",
  "secondary",
  "success",
  "warning",
  "info",
  "error",
] as const;

const MyMicroApp: React.FC<MyMicroAppProps> = ({
  item,
  index,
  moveApp,
  onDragEnd,
}) => {
  const { data: currentUser } = useCurrentUser();
  const { data: notificationData } = useGetUnreadNotificationCount(
    currentUser?.name,
  );

  const { isDesktop } = useScreenSize();

  const [iconLoadError, setIconLoadError] = useState(false);

  useEffect(() => {
    setIconLoadError(false);
  }, [item.icon]);

  const getNotificationCount = (title?: string) => {
    if (!title || !Array.isArray(notificationData)) return 0;

    const app = notificationData.find((app) => app.title === title);
    if (!app) return 0;

    return app.doctypes.reduce(
      (sum, dt) => sum + (dt.self || 0) + (dt.allocated || 0),
      0,
    );
  };

  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.APP,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: onDragEnd,
  });

  const [, dropRef] = useDrop({
    accept: ItemTypes.APP,
    hover(dragged: { index: number }) {
      if (dragged.index === index) return;
      moveApp(dragged.index, index);
      dragged.index = index;
    },
  });

  const color = COLOR_ROTATION[index % COLOR_ROTATION.length];

  const isSvg =
    item.icon?.toLowerCase().endsWith(".svg") ||
    item.icon?.toLowerCase().includes(".svg?");

  const iconNode = item.icon && !iconLoadError ? (
    isSvg ? (
      <div
        className="w-8 h-8"
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
      <img
        src={item.icon}
        alt={item.title}
        className="w-8 h-8 rounded-md"
        onError={() => setIconLoadError(true)}
      />
    )
  ) : (
    <span className="font-bold text-lg">
      {item.title ? item.title.charAt(0).toUpperCase() : "A"}
    </span>
  );

  return (
    <Link
      to={item.content_route}
      target={
        isDesktop ? (item.redirect_to_new_tab ? "_blank" : "_self") : "_self"
      }
    >
      <div
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={(node) => dragRef(dropRef(node)) as any}
        className={`text-center cursor-move hover:scale-105 transition-transform mb-2 ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <div className="relative inline-block">
          <IconButton
            icon={iconNode}
            label={item?.custom_label || item.title || ""}
            color={color}
            variant="subtle"
            disabled={!item.is_visible}
            className="relative"
          />

          {getNotificationCount(item.title) > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
              {getNotificationCount(item.title)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MyMicroApp;
