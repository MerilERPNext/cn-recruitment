import { useNavigate } from "react-router-dom";
import ApprovalCard from "../Attendance/TeamAttendanceDetails/ApprovalCard";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";

const PendingTeamLeaves = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const content = (
    <div className="flex flex-col min-h-screen md:min-h-full bg-white absolute inset-0 z-[150]">
      {!isDesktop && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <HeaderBar title="Pending Requests" onBack={() => navigate(-1)} />
        </header>
      )}

      <main className="flex-1 overflow-y-auto px-4 md:px-2 pt-2">
        <CardTable
          titles={[
            "Select",
            "Allocated To",
            "Description",
            "Date",
            "Status",
            "Actions",
          ]}
        >
          <ApprovalList
            doctype="Leave Application"
            pageSize={20}
            renderCardContent={(item) => (
              <ApprovalCard
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
              />
            )}
          />
        </CardTable>
      </main>
    </div>
  );

  return content;
};

export default PendingTeamLeaves;
