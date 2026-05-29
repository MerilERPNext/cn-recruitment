import React from "react";
import { Pencil } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";

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
}) => {
    return (
      <div className="bg-white rounded-xl p-6 relative max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px]">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {is_current && (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-xl">
              Current
            </span>
          )}

          {onEdit && (
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={onEdit}
            >
              <Pencil className="w-4 h-4" />
            </button>
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