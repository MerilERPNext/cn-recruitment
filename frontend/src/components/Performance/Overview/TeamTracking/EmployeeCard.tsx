import { memo, ReactElement } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { ChevronRight } from "lucide-react";

interface EmployeeCardProps {
  emp: { id: string; label: string };
  onSelect: (id: string) => void;
}
export interface EmployeeOption {
  id: string;
  label: string;
}

export const EmployeeCard = memo(({ emp, onSelect }: EmployeeCardProps): ReactElement => (
  <Card
    className="p-4 border border-border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex justify-between items-center bg-card group"
    onClick={() => onSelect(emp.id)}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {(emp.label || "")
          .split(" ").filter(Boolean).map((n) => n.charAt(0)).join("")}
      </div>
    <div className="flex gap-3 items-center">
        <Typography
          variant="body"
          className="font-medium group-hover:text-primary transition-colors"
        >
          {emp.label}
          
        </Typography>
        {emp.id && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-500/10 text-text-body2 border border-border group-hover:bg-blue-500/10 group-hover:text-primary group-hover:border-primary/50 transition-colors">
            {emp.id}
          </span>
        )}
    </div>

    </div>
    <ChevronRight className="w-5 h-5 text-text-body2 group-hover:text-primary transition-colors" />
  </Card>
));

EmployeeCard.displayName = "EmployeeCard";