import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { useTargetUser } from "../context/ViewedUserContext";
import { useActivePendo } from "../services/pendoService";
import PendoPopup from "./Pendo/PendoPopup";

/**
 * Mounted once, globally (see App.tsx, alongside the other Mandatory*Handler
 * components). Unlike those, this never redirects or blocks anything — it
 * just checks once per session whether a Pendo Popup is due for the current
 * employee and, if so, renders it as a dismissable overlay. See
 * services/pendoService.ts / recruitment.api.pendo for the resolution logic.
 */
const PendoHandler = () => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { isViewingOtherUser } = useTargetUser();
  const { data } = useActivePendo();

  if (isViewingOtherUser || !currentEmployee || !data?.pendo) {
    return null;
  }

  // Remounts (fresh `key`) if a different popup becomes due later in the same
  // session (e.g. after invalidation on respond) so its internal `isOpen`
  // state doesn't linger closed for a new popup.
  return <PendoPopup key={data.pendo.name} pendo={data.pendo} onDismiss={() => {}} />;
};

export default PendoHandler;
