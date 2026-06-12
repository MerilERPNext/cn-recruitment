import React from "react";
import { EditIcon, TrashIcon } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";

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
      <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift  max-w-[90vw] min-w-[90vw]  md:min-w-[400px] md:max-w-[400px]">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {is_current && (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-xl">
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
            <p className="font-semibold text-gray-900">
              {work_location?.name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Office Area</p>
            <p className="font-semibold text-gray-900">
              {office_area?.name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Country</p>
            <p className="font-semibold text-gray-900">
              {country?.name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">State</p>
            <p className="font-semibold text-gray-900">
              {state?.name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">City</p>
            <p className="font-semibold text-gray-900">
              {city?.name || "-"}
            </p>
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