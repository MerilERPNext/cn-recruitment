import React from "react";
import CardTable from "../shared/CardTable";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import { useScreenSize } from "../../hooks/useScreenSize";
import { FileText, Users, CheckCircle, FolderOpen } from "lucide-react";
import Badge from "../shared/Badge";

const Requisition = () => {
  const { isDesktop } = useScreenSize();

  // Dummy data based on the image
  const requisitions = [
    {
      code: "REQ_0092",
      designation: "Intern (DES_367)",
      department: "Test Department (DEP_132)",
      location: "Corporate Office, Uttar Pradesh, Utta...",
      status: "Approved Draft",
      statusColor: "bg-orange-100 text-orange-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "--",
      draft: "0",
      closedPositions: "--",
      lastUpdated: "05-01-2026",
      initiated: "05-01-2026",
    },
    {
      code: "REQ_0091",
      designation: "Intern (DES_367)",
      department: "Test Department (DEP_132)",
      location: "Corporate Office, Uttar Pradesh, Utta...",
      status: "Approved Active",
      statusColor: "bg-green-100 text-green-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "1",
      draft: "0",
      closedPositions: "0",
      lastUpdated: "07-10-2025",
      initiated: "07-10-2025",
    },
    {
      code: "REQ_0032",
      designation: "Crew Manager (DES_362)",
      department: "Crew (DEP_140)",
      location: "Andenes Port, Norway, Andenes, Nor...",
      status: "Approved Draft",
      statusColor: "bg-orange-100 text-orange-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "--",
      draft: "0",
      closedPositions: "--",
      lastUpdated: "07-10-2025",
      initiated: "22-05-2024",
    },
    {
      code: "REQ_0045",
      designation: "Associate (ASS_AC_DGN)",
      department: "Academics - Design (DEP_34)",
      location: "Prayagraj, Uttar Pradesh, India (PW_...",
      status: "Approval Pending",
      statusColor: "bg-yellow-100 text-yellow-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "--",
      draft: "0",
      closedPositions: "--",
      lastUpdated: "29-09-2025",
      initiated: "26-06-2024",
    },
    {
      code: "REQ_0014",
      designation: "Faculty Member (FCM_AC_PHY)",
      department: "Foundation - Academics Physics (DE...",
      location: "Prayagraj, Uttar Pradesh, India (PW_...",
      status: "Approval Pending",
      statusColor: "bg-yellow-100 text-yellow-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "--",
      draft: "0",
      closedPositions: "--",
      lastUpdated: "29-09-2025",
      initiated: "02-09-2022",
    },
    {
      code: "REQ_0090",
      designation: "Associate (ASS_SP_ONB)",
      department: "Human Resources (DEP_76)",
      location: "Branch Office - Mumbai - MH, Mumb...",
      status: "Approved Active",
      statusColor: "bg-green-100 text-green-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "1",
      activeOffer: "0",
      draft: "0",
      closedPositions: "0",
      lastUpdated: "07-07-2025",
      initiated: "07-07-2025",
    },
    {
      code: "REQ_0089",
      designation: "Associate (ASS_SP_ONB)",
      department: "Human Resources (DEP_76)",
      location: "Prayagraj, Uttar Pradesh, India (PW_...",
      status: "Approved Active",
      statusColor: "bg-green-100 text-green-700",
      totalPositions: "1",
      positionDetail: "(1 New, 0 Repl..)",
      activeEvaluation: "0",
      activeOffer: "1",
      draft: "0",
      closedPositions: "0",
      lastUpdated: "03-07-2025",
      initiated: "03-07-2025",
    },
  ];

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
                  <Typography
                    variant="bodySmall"
                    className="mb-1"
                    color="body2"
                  >
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

      {/* Table */}
      <CardTable titles={titles} columnWidths={columnWidths}>
        {requisitions.map((req, index) => (
          <React.Fragment key={index}>
            {isDesktop ? (
              // Desktop Row with better hover
              <div
                className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                <div className="flex items-center">
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-gray-900"
                  >
                    {req.code}
                  </Typography>
                </div>

                <div className="flex flex-col gap-0.5">
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-blue-600"
                  >
                    {req.designation}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-600 text-xs"
                  >
                    {req.department}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-600 text-xs"
                  >
                    {req.location}
                  </Typography>
                </div>

                <div className="flex items-center">
                  <Badge label={req.status} backgroundColor={req.statusColor} />
                </div>

                <div className="flex flex-col gap-0.5">
                  <Typography variant="bodySmall" className="font-semibold">
                    {req.totalPositions}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-500 text-xs"
                  >
                    {req.positionDetail}
                  </Typography>
                </div>

                <div className="flex items-center justify-center">
                  <Typography
                    variant="bodySmall"
                    className={
                      req.activeEvaluation === "0"
                        ? "text-gray-400"
                        : "text-gray-900 font-medium"
                    }
                  >
                    {req.activeEvaluation}
                  </Typography>
                </div>

                <div className="flex items-center justify-center">
                  <Typography
                    variant="bodySmall"
                    className={
                      req.activeOffer === "--"
                        ? "text-gray-400"
                        : "text-gray-900 font-medium"
                    }
                  >
                    {req.activeOffer}
                  </Typography>
                </div>

                <div className="flex items-center justify-center">
                  <Typography
                    variant="bodySmall"
                    className={
                      req.draft === "0"
                        ? "text-gray-400"
                        : "text-gray-900 font-medium"
                    }
                  >
                    {req.draft}
                  </Typography>
                </div>

                <div className="flex items-center justify-center">
                  <Typography
                    variant="bodySmall"
                    className={
                      req.closedPositions === "--"
                        ? "text-gray-400"
                        : "text-gray-900 font-medium"
                    }
                  >
                    {req.closedPositions}
                  </Typography>
                </div>

                <div className="flex items-center">
                  <Typography variant="bodySmall" className="text-gray-600">
                    {req.lastUpdated}
                  </Typography>
                </div>

                <div className="flex items-center">
                  <Typography variant="bodySmall" className="text-gray-600">
                    {req.initiated}
                  </Typography>
                </div>
              </div>
            ) : (
              // Mobile Card
              <Card
                radius="lg"
                className="border p-4 mb-3 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Typography
                        variant="bodySmall"
                        className="font-bold text-gray-900 mb-1"
                      >
                        {req.code}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-blue-600"
                      >
                        {req.designation}
                      </Typography>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium ${req.statusColor} shrink-0`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Department & Location */}
                  <div className="space-y-0.5">
                    <Typography
                      variant="bodySmall"
                      className="text-gray-600 text-xs"
                    >
                      {req.department}
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      className="text-gray-600 text-xs"
                    >
                      {req.location}
                    </Typography>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Total Positions
                      </Typography>
                      <Typography variant="bodySmall" className="font-semibold">
                        {req.totalPositions}{" "}
                        <span className="text-gray-500 text-xs font-normal">
                          {req.positionDetail}
                        </span>
                      </Typography>
                    </div>

                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Active Evaluation
                      </Typography>
                      <Typography variant="bodySmall" className="font-semibold">
                        {req.activeEvaluation}
                      </Typography>
                    </div>

                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Active Offer
                      </Typography>
                      <Typography variant="bodySmall" className="font-semibold">
                        {req.activeOffer}
                      </Typography>
                    </div>

                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Draft
                      </Typography>
                      <Typography variant="bodySmall" className="font-semibold">
                        {req.draft}
                      </Typography>
                    </div>

                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Closed Positions
                      </Typography>
                      <Typography variant="bodySmall" className="font-semibold">
                        {req.closedPositions}
                      </Typography>
                    </div>

                    <div>
                      <Typography
                        variant="bodySmall"
                        className="text-gray-500 text-xs mb-0.5"
                      >
                        Last Updated
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-xs"
                      >
                        {req.lastUpdated}
                      </Typography>
                    </div>
                  </div>

                  {/* Initiated Date */}
                  <div className="pt-2 border-t">
                    <Typography
                      variant="bodySmall"
                      className="text-gray-500 text-xs"
                    >
                      Initiated: {req.initiated}
                    </Typography>
                  </div>
                </div>
              </Card>
            )}
          </React.Fragment>
        ))}
      </CardTable>
    </div>
  );
};

export default Requisition;
