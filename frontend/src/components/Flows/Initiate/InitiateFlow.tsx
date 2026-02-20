import { Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import RequestTypeCard from "./RequestTypeCard";
import HeaderBar from "../../HeaderBar";
import { useNavigate, useLocation } from "react-router-dom";
import { useDifinitaionNameForSeparation } from "../../../hooks/useFlows";
import { useScreenSize } from "../../../hooks/useScreenSize";

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

  const { data: triggerList, isLoading } = useDifinitaionNameForSeparation();

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
  }, [triggerList, filteredTriggerList]);

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
          {isLoading ? (
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
                    <RequestTypeCard key={t.name} data={t} />
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
