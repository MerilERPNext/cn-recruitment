import { Check, Clock, Hourglass, X } from "lucide-react";

export const statusConfig = {
  completed: {
    icon: Check,
    bg: "bg-green-500",
    line: "bg-green-500",
  },
  pending: {
    icon: Clock,
    bg: "bg-gray-400",
    line: "bg-gray-400",
  },
  action_required: {
    icon: Hourglass,
    bg: "bg-yellow-500",
    line: "bg-yellow-500",

  },
  rejected: {
    icon: X,
    bg: "bg-red-500",
    line: "bg-gray-500",
  },
  default : {
    icon: Clock,
    bg: "bg-gray-400",
    line: "bg-gray-400",
  }
};