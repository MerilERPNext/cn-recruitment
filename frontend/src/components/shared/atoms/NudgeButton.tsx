import { BellRing } from "lucide-react";
import { useNudge } from "../../../hooks/useNudge";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import Button from "./Button";

interface NudgeButtonProps {
  /** The todo ID(s) to nudge */
  todoId?: string;
  /** The app name for uiPermission check (e.g. "HR Process") */
  app: string;
  /** The page name for uiPermission check (e.g. "Separation", "Confirmation") */
  page: string;
}

/**
 * Centralized Nudge button component.
 * - Styled to match ViewFormButton (variant="subtle", size="md")
 * - Gated behind uiPermission (app + page + "nudge" action)
 * - Returns null when permission is denied or no todoId
 */
const NudgeButton = ({ todoId, app, page }: NudgeButtonProps) => {
  const { mutate: sendNudge, isPending: nudging } = useNudge();
  const { data: userUiPermission } = useGetUiPermission(app);
  const canNudge = isActionEnabled(userUiPermission, "nudge", page);

  if (!canNudge || !todoId) return <div className="w-[96px] h-[36px]" />;

  return (
    <Button
      variant="subtle"
      size="md"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sendNudge(todoId);
      }}
      loading={nudging}
      disabled={nudging}
    >
      <BellRing className="w-4 h-4" />
      Nudge
    </Button>
  );
};

export default NudgeButton;
