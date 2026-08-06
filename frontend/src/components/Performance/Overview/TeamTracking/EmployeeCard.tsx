import { memo } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { ChevronRight } from "lucide-react";

interface EmployeeCardProps {
  emp: { id: string; label: string };
  onSelect: (id: string) => void;
}

export const EmployeeCard = memo(({ emp, onSelect }: EmployeeCardProps) => (
  <Card
    className="p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-center bg-white group"
    onClick={() => onSelect(emp.id)}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
        {(emp.label || "")
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <Typography
        variant="body"
        className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors"
      >
        {emp.label}
      </Typography>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
  </Card>
));

EmployeeCard.displayName = "EmployeeCard";