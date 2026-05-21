import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { Typography } from "./shared/atoms/Typography";
import {
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoClipboardOutline,
  IoInformationCircleOutline,
  IoHomeOutline,
} from "react-icons/io5";
import { useScreenSize } from "../hooks/useScreenSize";
import { useMandatoryTasks } from "../hooks/useMandatoryTasks";
import type { MandatoryTask } from "../types/mandatoryTasks";
import { sanitizeToPlainText } from "../utils/sanitizeToPlainText";
import { ROUTES } from "../constants/routes";
import formatToIndianDate from "../utils/formatToIndianDate";

const SESSION_MANDATORY_HR_REDIRECT_TO_KEY = "mandatory_hr_redirect_to";
const SESSION_MANDATORY_HR_CURRENT_TASK_KEY = "mandatory_hr_current_task";

const MandatoryTaskItemSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm animate-pulse mb-3">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3" />
        <div className="h-4 bg-gray-100 rounded-md w-1/3" />
      </div>
      <div className="h-8 bg-gray-200 rounded-xl w-24 ml-4" />
    </div>
    <div className="h-10 bg-gray-200 rounded-lg w-full" />
  </div>
);

interface MandatoryTaskItemProps {
  item: MandatoryTask;
}

const MandatoryTaskItem: React.FC<MandatoryTaskItemProps> = ({ item }) => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

  const title =
    sanitizeToPlainText(item.custom_subject || item.description) ||
    "Mandatory action";
  const isOpen = item.status === "Open";

  const handleTakeAction = () => {
    sessionStorage.setItem(SESSION_MANDATORY_HR_CURRENT_TASK_KEY, item.name);
    navigate(`${ROUTES.TODO}#/${item.name}`);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 mb-3 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`p-1.5 rounded-lg ${
                isOpen
                  ? "bg-primary-50 text-primary-600"
                  : "bg-success-50 text-success-600"
              }`}
            >
              <IoClipboardOutline size={18} />
            </div>
            <Typography
              variant={isMobile ? "bodyMedium" : "h4"}
              className="text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2"
            >
              {title}
            </Typography>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1 pl-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
              Mandatory
            </span>
            {item.reference_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                {item.reference_type}
              </span>
            )}
            {item.date && isOpen && (
              <Typography variant="caption" className="text-gray-500">
                Due: {formatToIndianDate(item.date)}
              </Typography>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
            isOpen
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-success-50 text-success-700 border-success-200"
          }`}
        >
          {isOpen ? (
            <IoInformationCircleOutline size={14} />
          ) : (
            <IoCheckmarkCircleOutline size={14} />
          )}
          {isOpen ? "Pending" : "Completed"}
        </div>
      </div>

      <button
        type="button"
        onClick={handleTakeAction}
        disabled={!isOpen}
        className={`ml-auto sm:w-[200px] w-full font-brand font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
          !isOpen
            ? "bg-gray-100 text-gray-800 cursor-not-allowed border border-gray-200"
            : "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
        }`}
      >
        {!isOpen ? (
          <>
            <IoCheckmarkCircleOutline size={18} />
            Completed
          </>
        ) : (
          "Take Action"
        )}
      </button>
    </div>
  );
};

const MandatoryHrProcessEnforced: React.FC = () => {
  const navigate = useNavigate();
  const [mandatoryTasksExpanded, setMandatoryTasksExpanded] = useState(true);
  const { data: currentEmployee, isLoading: isCurrentEmployeeLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const {
    data: mandatoryResponse,
    isLoading: isMandatoryListLoading,
    isError,
  } = useMandatoryTasks({ enabled: !!currentEmployee });
  const { isMobile } = useScreenSize();

  const mandatoryTasks = mandatoryResponse?.data ?? [];
  const hasMandatoryTasks = mandatoryTasks.length > 0;
  const isMandatoryCheckLoading = isMandatoryListLoading;
  const isListLoading = isCurrentEmployeeLoading || isMandatoryListLoading;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-3xl mx-auto text-center">
          <Typography
            variant={isMobile ? "bodySmall" : "body"}
            className="text-white/80 max-w-xl text-center"
          >
            Complete mandatory HR process actions before continuing. Select a
            task below to review and take action.
          </Typography>

          {!isMandatoryCheckLoading && !hasMandatoryTasks && (
            <button
              type="button"
              onClick={() => {
                const redirectTo =
                  sessionStorage.getItem(SESSION_MANDATORY_HR_REDIRECT_TO_KEY) ||
                  "/webapp/";
                navigate(redirectTo);
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-medium text-sm transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
            >
              <IoHomeOutline size={18} />
              Go to Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {!isMandatoryCheckLoading && hasMandatoryTasks && (
          <div className="bg-white rounded-xl shadow-lg border-l-4 border-l-red-500 p-5 mb-8 animate-fadeIn">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-red-50 p-2 rounded-full">
                <IoWarningOutline className="w-6 h-6 text-red-500" />
              </div>
              <div className="ml-4">
                <Typography
                  variant={isMobile ? "bodyMedium" : "h4"}
                  className="text-gray-900 mb-1"
                >
                  Action Required
                </Typography>
                <Typography
                  variant={isMobile ? "caption" : "bodySmall"}
                  className="text-gray-600 leading-relaxed"
                >
                  You must complete all{" "}
                  <span className="font-semibold text-red-600">
                    mandatory HR process actions
                  </span>
                  . Timely completion is required to maintain system access.
                </Typography>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
          <button
            type="button"
            onClick={() => setMandatoryTasksExpanded(!mandatoryTasksExpanded)}
            className={`w-full group flex items-center justify-between p-4 bg-white transition-all duration-200 ${
              mandatoryTasksExpanded
                ? "border-b border-gray-100 bg-gray-50/50"
                : "hover:bg-gray-50/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  mandatoryTasksExpanded
                    ? "bg-primary-100 text-primary-700"
                    : "bg-primary-50 text-primary-600 group-hover:bg-primary-100"
                }`}
              >
                <IoClipboardOutline size={20} />
              </div>
              <div className="text-left">
                <Typography
                  variant={isMobile ? "bodyMedium" : "h4"}
                  className="text-gray-900"
                >
                  Mandatory HR Actions
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  Tasks requiring your immediate attention
                </Typography>
              </div>
            </div>
            <div
              className={`p-1.5 rounded-full transition-all duration-300 ${
                mandatoryTasksExpanded
                  ? "rotate-180 bg-primary-100 text-primary-700"
                  : "bg-gray-50 text-gray-400 group-hover:text-primary-600 group-hover:bg-primary-50"
              }`}
            >
              <IoChevronDownOutline size={20} />
            </div>
          </button>

          {mandatoryTasksExpanded && (
            <div className="bg-gray-50/30 p-4 animate-slideDown">
              {isListLoading && (
                <div>
                  <MandatoryTaskItemSkeleton />
                  <MandatoryTaskItemSkeleton />
                </div>
              )}

              {!isListLoading && isError && (
                <Typography
                  variant="bodySmall"
                  className="text-red-600 text-center py-6"
                >
                  Unable to load mandatory actions. Please refresh the page.
                </Typography>
              )}

              {!isListLoading && !isError && mandatoryTasks.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <IoCheckmarkCircleOutline
                    className="mx-auto text-success-500 mb-3"
                    size={40}
                  />
                  <Typography variant="h4" className="text-gray-900 mb-1">
                    All caught up
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-500">
                    No mandatory HR process actions are pending.
                  </Typography>
                </div>
              )}

              {!isListLoading &&
                !isError &&
                mandatoryTasks.map((task) => (
                  <MandatoryTaskItem key={task.name} item={task} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MandatoryHrProcessEnforced;
