import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectedForMobile from "./mobileUI/ApprovalRejectedCard";

export default function ShiftChangeRequests() {
  return (
    <div className="bg-white ">
      <ApprovalList
        doctype={"Shift Request"}
        pageSize={10}
        renderCardContent={(item) => (
          <ApprovalRejectedForMobile
            isSelected={item?.isSelected}
            onToggleSelect={item?.onToggleSelect}
            data={item?.data}
            onAction={item?.onAction}
          />
        )}
      />
    </div>
  );
}
