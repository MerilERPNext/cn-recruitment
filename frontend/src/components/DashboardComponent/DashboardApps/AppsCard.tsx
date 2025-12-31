import React from "react";
import { useNavigate } from "react-router-dom";
import { useDrag, useDrop } from "react-dnd";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useGetUnreadNotificationCount } from "../../../hooks/useNotification";

export const ItemTypes = {
    APP: "app",
} as const;

export interface DragItem {
    index: number;
}

export interface CNMicroapp {
    display_order: number;
    is_visible: unknown;
    name: string;
    title?: string;
    content_route?: string;
    status?: string;
    icon?: string;
}
interface MyMicroAppProps {
    item: CNMicroapp;
    index: number;
    notificationCount?: number;
    moveApp: (from: number, to: number) => void;
}

const MyMicroApp: React.FC<MyMicroAppProps> = ({
    item,
    index,
    moveApp,
}) => {
    const { data: currentUser } = useCurrentUser();
    const { data: notificationData } = useGetUnreadNotificationCount(
        currentUser?.name
    );


    const getNotificationCount = (title?: string) => {
        return 10
        if (!title || !notificationData?.apps) return 0;

        // return notificationData.apps.find((app) => app.title === title)?.count ?? 10;
    };
    const navigate = useNavigate();

    /* -------------------- DND -------------------- */
    const [{ isDragging }, dragRef] = useDrag<
        DragItem,
        void,
        { isDragging: boolean }
    >({
        type: ItemTypes.APP,
        item: { index },
        collect: monitor => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, dropRef] = useDrop<DragItem>({
        accept: ItemTypes.APP,
        hover(dragged) {
            if (dragged.index === index) return;

            moveApp(dragged.index, index);
            dragged.index = index;
        },
    });

    /* -------------------- UI -------------------- */

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

    const isSvg =
        item.icon?.toLowerCase().endsWith(".svg") ||
        item.icon?.toLowerCase().includes(".svg?");

    return (
        <div
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={node => dragRef(dropRef(node)) as any}
            onClick={handleClick}
            className={`text-center cursor-move hover:scale-105 transition-transform mb-2
        ${isDragging ? "opacity-40" : ""}`}
        >
            <div
                className={`w-16 h-16 ${color.bg} rounded-lg mx-auto mb-2 flex items-center justify-center shadow-md relative`}
            >
                {getNotificationCount(item.title) > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] size-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {getNotificationCount(item.title)}
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

export default MyMicroApp;
