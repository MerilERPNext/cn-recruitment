import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import { useScreenSize } from "../../hooks/useScreenSize";
import { FileText, Users, CheckCircle, FolderOpen } from "lucide-react";
import Badge from "../shared/Badge";
import FrappeListView from "../ListView";

const Requisition = () => {
  const stats = [
    {
      title: "Total Positions",
      value: "65",
      icon: FileText,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Active Evaluation",
      value: "14",
      icon: Users,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Active Offer Positions",
      value: "24",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Closed Positions",
      value: "22",
      icon: FolderOpen,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  const titles = [
    "Requisition Code",
    "Designation, Department & Location",
    "Status",
    "Total Positions",
    "Active Evaluation",
    "Active Offer",
    "Draft",
    "Closed Positions",
    "Last Updated On",
    "Initiated On",
  ];

  const columnWidths = [
    "140px",
    "minmax(250px, 1fr)",
    "150px",
    "130px",
    "140px",
    "120px",
    "80px",
    "140px",
    "130px",
    "130px",
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "approved active":
      case "open":
      case "open & approved":
        return "bg-green-100 text-green-700";
      case "pending":
      case "approval pending":
        return "bg-yellow-100 text-yellow-700";
      case "draft":
      case "approved draft":
        return "bg-orange-100 text-orange-700";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "filled":
      case "closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const RequisitionListHeader = () => {
    const { isDesktop } = useScreenSize();
    if (!isDesktop) return null;

    return (
      <div className="overflow-x-auto">
        <div
          className="grid gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 mt-2 rounded-t-lg min-w-max"
          style={{ gridTemplateColumns: columnWidths.join(" ") }}
        >
          {titles.map((title, index) => (
            <Typography
              key={index}
              variant="bodySmall"
              className="font-bold whitespace-nowrap"
            >
              {title}
            </Typography>
          ))}
        </div>
      </div>
    );
  };

  const RequisitionItem = ({ item }: { item: any }) => {
    const { isDesktop } = useScreenSize();
    

    const handleRowClick = () => {
      
    };

    
    const code = item.name;
    const designation = item.designation;
    const department = item.department;
    const location = item.custom_location || item.location;
    const status = item.status;
    
    
    const totalPositions = item.no_of_positions || item.total_positions || "1";
    
    const positionDetail = item.position_detail || "(1 New, 0 Repl..)"; 
    const activeEvaluation = item.active_evaluation || "0";
    const activeOffer = item.active_offer || "--";
    const draft = item.draft_count || "0";
    const closedPositions = item.closed_positions || "--";
    
    const lastUpdated = item.modified ? item.modified.split(" ")[0] : "--";
    const initiated = item.creation ? item.creation.split(" ")[0] : "--";
    
    const statusColor = getStatusColor(status);

    if (isDesktop) {
      return (
        <div className="overflow-x-auto">
            <div
              className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer items-center min-w-max bg-white"
              style={{ gridTemplateColumns: columnWidths.join(" ") }}
              onClick={handleRowClick}
            >
              <div className="flex items-center">
                <Typography variant="bodySmall" className="font-medium text-gray-900">
                  {code}
                </Typography>
              </div>

              <div className="flex flex-col gap-0.5">
                <Typography variant="bodySmall" className="font-medium text-blue-600">
                  {designation}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-600 text-xs">
                  {department}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-600 text-xs">
                  {location}
                </Typography>
              </div>

              <div className="flex items-center">
                <Badge label={status} backgroundColor={statusColor} />
              </div>

              <div className="flex flex-col gap-0.5">
                <Typography variant="bodySmall" className="font-semibold">
                  {totalPositions}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-500 text-xs text-nowrap truncate">
                  {positionDetail}
                </Typography>
              </div>

              <div className="flex items-center justify-center">
                <Typography
                  variant="bodySmall"
                  className={activeEvaluation === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
                >
                  {activeEvaluation}
                </Typography>
              </div>

              <div className="flex items-center justify-center">
                <Typography
                  variant="bodySmall"
                  className={activeOffer === "--" || activeOffer === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
                >
                  {activeOffer}
                </Typography>
              </div>

              <div className="flex items-center justify-center">
                <Typography
                  variant="bodySmall"
                  className={draft === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
                >
                  {draft}
                </Typography>
              </div>

              <div className="flex items-center justify-center">
                <Typography
                  variant="bodySmall"
                  className={closedPositions === "--" || closedPositions === "0" ? "text-gray-400" : "text-gray-900 font-medium"}
                >
                  {closedPositions}
                </Typography>
              </div>

              <div className="flex items-center">
                <Typography variant="bodySmall" className="text-gray-600">
                  {lastUpdated}
                </Typography>
              </div>

              <div className="flex items-center">
                <Typography variant="bodySmall" className="text-gray-600">
                  {initiated}
                </Typography>
              </div>
            </div>
        </div>
      );
    }

  
    return (
      <Card
        radius="lg"
        className="border p-4 mb-3 hover:shadow-md transition-shadow"
        onClick={handleRowClick}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Typography variant="bodySmall" className="font-bold text-gray-900 mb-1">
                {code}
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-blue-600">
                {designation}
              </Typography>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-medium ${statusColor} shrink-0`}>
              {status}
            </span>
          </div>

          {/* Department & Location */}
          <div className="space-y-0.5">
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {department}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              {location}
            </Typography>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Total Positions
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {totalPositions}{" "}
                <span className="text-gray-500 text-xs font-normal">{positionDetail}</span>
              </Typography>
            </div>
            <div>
              <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Active Evaluation
              </Typography>
              <Typography variant="bodySmall" className="font-semibold">
                {activeEvaluation}
              </Typography>
            </div>
            <div>
               <Typography variant="bodySmall" className="text-gray-500 text-xs mb-0.5">
                Last Updated
              </Typography>
              <Typography variant="bodySmall" className="font-semibold text-xs">
                {lastUpdated}
              </Typography>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              radius="xl"
              className="border p-4 md:p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center shrink-0`}
                >
                  <Icon className={`size-5 md:size-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <Typography variant="bodySmall" className="mb-1" color="body2">
                    {stat.title}
                  </Typography>
                  <Typography variant="subheading" color="primary">
                    {stat.value}
                  </Typography>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col p-2">
        <FrappeListView
          doctype="Job Requisition"
          ItemComponent={RequisitionItem}
          PreListComponent={RequisitionListHeader}
          defaultFields={[
            "name",
            "designation",
            "department",
            "status",
            "no_of_positions",
            "creation",
            "modified"
          ]}
          searchFields={["name", "designation", "department"]}
          infiniteScroll={true}
          pageSize={20}
          isFilter={true}
        />
      </div>
    </div>
  );
};

export default Requisition;
