import React from "react";
import { EditIcon, TrashIcon } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";
import Tooltip from "../../shared/Tooltip";

interface LocationField {
  id: string;
  name: string;
}

interface EmploymentWorkLocationCardProps {
  from_date: string;
  to_date: string | null;
  is_current: boolean;

  work_location?: LocationField | null;
  office_area?: LocationField | null;
  country?: LocationField | null;
  state?: LocationField | null;
  city?: LocationField | null;

  onEdit?: () => void;
  onDelete?: () => void;
}

const EmploymentWorkLocationCard: React.FC<
  EmploymentWorkLocationCardProps
> = ({
  from_date,
  to_date,
  is_current,
  work_location,
  office_area,
  country,
  state,
  city,
  onEdit,
  onDelete,
}) => {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border hover:border-primary/40 p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px] transition-colors">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {is_current && (
            <span className="bg-success/10 text-success border border-success/30 text-xs font-medium px-3 py-1 rounded-xl">
              Current
            </span>
          )}

          {onEdit && (
            <IconButton
              onClick={() => onEdit?.()}
              icon={<EditIcon className="h-4 w-4" />}
              className="cursor-pointer"
              color="primary"
              variant="subtle"
              size="xs"
            />
          )}
          {onDelete && !is_current && (
            <IconButton
              onClick={() => onDelete?.()}
              icon={<TrashIcon className="h-4 w-4" />}
              className="cursor-pointer"
              color="error"
              variant="subtle"
              size="xs"
            />
          )}
        </div>

        <div className="space-y-4 pr-20">
          <div>
            <p className="text-xs text-gray-500">Work Location</p>
            <Tooltip content={work_location?.name || "-"}>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {work_location?.name || "-"}
              </p>
            </Tooltip>
          </div>

          <div>
            <p className="text-xs text-gray-500">Office Area</p>
            <Tooltip content={office_area?.name || "-"}>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {office_area?.name || "-"}
              </p>
            </Tooltip>
          </div>

          <div>
            <p className="text-xs text-gray-500">Country</p>
            <Tooltip content={country?.name || "-"}>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {country?.name || "-"}
              </p>
            </Tooltip>
          </div>

          <div>
            <p className="text-xs text-gray-500">State</p>
            <Tooltip content={state?.name || "-"}>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {state?.name || "-"}
              </p>
            </Tooltip>
          </div>

          <div>
            <p className="text-xs text-gray-500">City</p>
            <Tooltip content={city?.name || "-"}>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {city?.name || "-"}
              </p>
            </Tooltip>
          </div>

          <div>
            <p className="text-xs text-gray-500">From - To</p>
            <p className="font-semibold text-gray-900">
              {formatToIndianDate(from_date)} -{" "}
              {is_current
                ? "Present"
                : to_date
                  ? formatToIndianDate(to_date)
                  : "-"}
            </p>
          </div>
        </div>
      </div>
    );
  };

export default EmploymentWorkLocationCard;
