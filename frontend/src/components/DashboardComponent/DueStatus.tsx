// dueStatus.tsx
import React from "react";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { IoWarningOutline } from "react-icons/io5";
import { MdOutlineWatchLater } from "react-icons/md";

export type DueResult = {
  status: string;
  color: "green" | "red" | "blue"|"orange";
  icon: React.ReactElement;
};

export function getDueStatus(dateString: string): DueResult {
  const inputDate = new Date(dateString);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  const diff = inputDate.getTime() - today.getTime();
  const dayDiff = diff / (1000 * 60 * 60 * 24);

  if (dayDiff === 1) {
    return {
      status: "Due Tomorrow",
      color: "orange",
      icon: <IoIosCheckmarkCircleOutline className="w-3 h-3 text-orange-500" />,
    };
  } else if (dayDiff === 0) {
    return {
      status: "Due Today",
      color: "green",
      icon: <MdOutlineWatchLater className="w-3 h-3 text-green-500" />,
    };
  } else if (dayDiff === -1) {
    return {
      status: "Overdue",
      color: "red",
      icon: <IoWarningOutline className="w-3 h-3 text-red-500" />,
    };
  } else if (dayDiff > 1) {
    return {
      status: "Upcoming",
      color: "blue",
      icon: <MdOutlineWatchLater className="w-3 h-3 text-blue-500" />,
    };
  } else {
    return {
      status: "Overdue",
      color: "red",
      icon: <IoWarningOutline className="w-3 h-3 text-red-500" />,
    };
  }
}
