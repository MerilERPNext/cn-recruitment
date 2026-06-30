import RecognitionRowActions from "../RecognitionRowActions";
import type { AppreciationHistoryItem } from "./types";

const HistoryActions = ({
  item,
  className = "",
}: {
  item: AppreciationHistoryItem;
  className?: string;
}) => (
  <RecognitionRowActions
    className={className}
    layout="icons"
    actions={["download", "view"]}
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

export default HistoryActions;
