import React, { useEffect } from "react";
import {
  useGetSeparationFunnelData,
  useGetSeparationWorkflow,
  usePostSelectEventFromOptions,
} from "../../../hooks/useFlows";
import { useNavigate, useParams } from "react-router-dom";
import CardTable from "../../shared/CardTable";
import { StaticListView } from "../../ListView";
import SeparationLogCard from "./components/SeparationLogCard";
import HeaderBar from "../../HeaderBar";
import NoDataFound from "../../shared/atoms/NoDataFound";

const SeparationWorkflow: React.FC = () => {
  console.log("Sepration workflow");
  const { id } = useParams();
  const { data: separationWorkflow, refetch: refetchSeparationWorkflow } =
    useGetSeparationWorkflow("Employee Separation", id || "");
  const { data: separationFunnelData } = useGetSeparationFunnelData(id || "");
  const { mutateAsync: getSessionForChatnextAction } =
    usePostSelectEventFromOptions();

  const handleAction = async (selected_option: string) => {
    try {
      const res = await getSessionForChatnextAction({
        selected_option,
        data: JSON.stringify(separationFunnelData),
      });
      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, res?.session);
      } else {
        console.warn(
          "⚠️ trigger_chatnext_assistant is not available on window.",
        );
      }
    } catch (error: any) {
      console.log("error", error.message);
    }
  };

  useEffect(() => {
    const handleChatClose = () => {
      refetchSeparationWorkflow();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [refetchSeparationWorkflow]);

  const navigate = useNavigate();

  const logs = separationWorkflow?.funnel_activity?.log || [];
  const gtc = "1fr 1fr 1fr 1fr 1fr";
  return (
    <div>
      <HeaderBar
        title="Separation Workflow"
        onBack={() => navigate(-1)}
        className="md:!z-[60]"
      />
      <div className="sm:p-8 p-4">
        <div className="lg:mt-6"></div>
        <CardTable
          titles={[
            "Stage Number",
            "Status",
            "Assigned To",
            "Selected Action",
            "",
          ]}
        >
          <div>
            {separationWorkflow?.funnel_activity?.log ? (
              <StaticListView
                data={logs}
                ItemComponent={(idx, item) => {
                  const isActive = !!(
                    separationFunnelData?.custom_funnel_task &&
                    item?.funnel_task &&
                    separationFunnelData.custom_funnel_task ===
                    item.funnel_task &&
                    item?.status === "Pending" &&
                    (idx === 0 || logs[idx - 1]?.status !== "Pending")
                  );
                  return (
                    <SeparationLogCard
                      key={item.idx}
                      onClickAction={handleAction}
                      gtc={gtc}
                      data={{ ...item, isLast: idx === logs.length - 1 }}
                      isActive={isActive}
                    />
                  );
                }}
                pageSize={20}
                loadMorePagination={true}
              />
            ) : (
              <NoDataFound title="No pending workflow found." />
            )}
          </div>
        </CardTable>
      </div>
    </div>
  );
};

export default SeparationWorkflow;
