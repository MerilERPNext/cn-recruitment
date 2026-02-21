import { Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import RequestTypeCard from "./RequestTypeCard";
import HeaderBar from "../../HeaderBar";
import { useNavigate, useLocation } from "react-router-dom";
import { useFlowConfigSelfTriggerList, useFlowConfigOthersTriggerList } from "../../../hooks/useFlows";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUserRoles } from "../../../hooks/useAttendance";
import Button from "../../shared/atoms/Button";
import { EmployeeService } from "../../../services/employeeService";
import { useQuery } from "@tanstack/react-query";
import { Employee } from "../../../types/employee";

interface InitiateFlowProps {
  handleCloseModel?: () => void;
}

/* ---------------- Skeleton Components ---------------- */

const SearchSkeleton = () => (
  <div className="relative mt-2 w-full max-w-[48rem]">
    <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
  </div>
);

const CardSkeleton = () => (
  <div className="w-72 h-32 rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
    <div className="h-4 w-3/4 bg-gray-200 rounded" />
    <div className="h-3 w-full bg-gray-200 rounded" />
    <div className="h-3 w-2/3 bg-gray-200 rounded" />
  </div>
);

const CardsSkeletonGrid = () => (
  <div className="flex flex-wrap gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/* ---------------------------------------------------- */

const InitiateFlow: React.FC<InitiateFlowProps> = ({
  handleCloseModel = () => void 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handlGoBack = () => {
    if (location.pathname === "/webapp/flow-app/initiate-flow") {
      navigate(-1);
    } else {
      handleCloseModel();
    }
  };

  useEffect(() => {
    const handleChatClose = () => {
      handleCloseModel();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [handleCloseModel]);

  const [isForOthers, setIsForOthers] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  // Fetch user roles to determine if Self/Others tabs should show
  const { data: userRoles } = useGetUserRoles();

  // Fetch reportees for employee selector (only when on "Others" tab)
  const { data: reportees, isLoading: isReporteesLoading } = useQuery<Employee[]>({
    queryKey: ["employeeReportees"],
    queryFn: () => EmployeeService.getEmployeeReportees(),
    enabled: isForOthers,
  });

  // Self trigger list
  const { data: selfTriggerList, isLoading: isSelfLoading } = useFlowConfigSelfTriggerList();

  // Others trigger list (only fetched when an employee is selected)
  const { data: othersTriggerList, isLoading: isOthersLoading } = useFlowConfigOthersTriggerList(selectedEmployee);

  // Determine active trigger list and loading state
  const triggerList = isForOthers ? othersTriggerList : selfTriggerList;
  const isLoading = isForOthers ? (isOthersLoading || (!selectedEmployee)) : isSelfLoading;

  const [inputSearch, setInputSearch] = useState<string>("");

  const filteredTriggerList = useMemo(
    () =>
      Array.isArray(triggerList)
        ? triggerList.filter((item) =>
          item?.data_obj?.name_of_action
            ?.toLowerCase()
            .includes(inputSearch.toLowerCase()),
        )
        : [],
    [triggerList, inputSearch],
  );

  const { isDesktop } = useScreenSize();

  const EmptyStateComponent = useMemo(() => {
    if (isForOthers && !selectedEmployee) {
      return (
        <div className="flex items-center justify-center text-center text-gray-500">
          Please select an employee to view available actions.
        </div>
      );
    }
    if (!Array.isArray(triggerList) || triggerList.length === 0)
      return (
        <div className="flex items-center justify-center text-center text-gray-500">
          No Action Found.
        </div>
      );
    else if (filteredTriggerList.length == 0)
      return (
        <div className="flex items-center justify-center text-center text-gray-500">
          No Action Found. <br /> Please clear Search field to view All Actions.
        </div>
      );
    return null;
  }, [triggerList, filteredTriggerList, isForOthers, selectedEmployee]);

  return (
    <div
      onClick={handleCloseModel}
      className="flex bg-black/20 items-center justify-center fixed w-screen h-screen top-0 left-0 z-40"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-lg w-full ${isDesktop ? "max-w-xl" : "h-screen"}  pb-5`}
      >
        {isDesktop ? (
          <>
            <div className="flex items-center justify-between sm:px-8 px-4 pt-4">
              <h2 className="text-lg font-semibold">Initiate Flow</h2>
              <button
                onClick={handleCloseModel}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <hr className="my-4" />
          </>
        ) : (
          <HeaderBar title="Initiate Flow" onBack={handlGoBack} />
        )}

        <div className="sm:px-8 px-4">
          {/* Self / Others Tabs */}
          {userRoles?.roles["Employee Direct Manager"] ? (
            <div className="flex bg-white rounded-lg p-1 mt-2 border border-gray-200">
              <Button
                size="md"
                fullWidth
                variant={isForOthers ? "subtle" : "contain"}
                onClick={() => {
                  setIsForOthers(false);
                  setInputSearch("");
                }}
              >
                Self
              </Button>
              <Button
                size="md"
                fullWidth
                variant={!isForOthers ? "subtle" : "contain"}
                onClick={() => {
                  setIsForOthers(true);
                  setInputSearch("");
                }}
              >
                For Others
              </Button>
            </div>
          ) : null}

          {/* Employee Selector (shown only for Others tab) */}
          {isForOthers && (
            <div className="mt-3">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
              >
                <option value="">Select Employee</option>
                {isReporteesLoading ? (
                  <option disabled>Loading...</option>
                ) : (
                  reportees?.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.employee_name} ({emp.name})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {isLoading && selectedEmployee ? (
            <>
              <SearchSkeleton />
              <div className="mt-6">
                <CardsSkeletonGrid />
              </div>
            </>
          ) : !isForOthers && isSelfLoading ? (
            <>
              <SearchSkeleton />
              <div className="mt-6">
                <CardsSkeletonGrid />
              </div>
            </>
          ) : (
            <>
              <div className="relative mt-2 w-full ">
                <input
                  value={inputSearch}
                  onChange={(e) => setInputSearch(e.target.value)}
                  type="text"
                  placeholder="Search"
                  className="w-full peer focus:placeholder-gray-600 pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary
                  focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <Search className="absolute peer-focus:text-gray-600 text-gray-400 left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
              </div>

              <div className="mt-6 space-y-8 min-h-40">
                {EmptyStateComponent}
                <div className="flex flex-wrap gap-4">
                  {filteredTriggerList.map((t) => (
                    <RequestTypeCard
                      key={t.name}
                      data={t}
                      targetEmployeeId={isForOthers ? selectedEmployee : undefined}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitiateFlow;
