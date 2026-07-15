import RecognitionRowActions from "../RecognitionRowActions";
import { useGetUiPermission } from "../../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../../utils/uiPermission";
import type { AppreciationHistoryItem } from "./types";

const HistoryActions = ({
  item,
  className = "",
}: {
  item: AppreciationHistoryItem;
  className?: string;
}) => {
  // Gate the row's view/download by the "Recognition" app action permissions.
  const { data: uiPermission } = useGetUiPermission("Recognition");
  const actions = (["download", "view"] as const).filter((a) =>
    isActionEnabled(uiPermission, a, "Appreciations History"),
  );

  if (actions.length === 0) return null;

  return (
    <RecognitionRowActions
      className={className}
      layout="icons"
      actions={[...actions]}
      item={{
        name: item.id,
        title: item.title,
        person: item.person,
        date: item.date,
        direction: item.tab,
        values: item.value ? [item.value] : [],
      }}
    />
  );
};

export default HistoryActions;
