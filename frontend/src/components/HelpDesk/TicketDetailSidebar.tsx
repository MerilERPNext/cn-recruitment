import React from "react";
import { X, Clock, CheckCircle, AlertCircle, User, Building, Mail, Phone } from "lucide-react";
import { TicketDetail, useCategories } from "../../hooks/useHelpDeskTickets";

interface TicketDetailSidebarProps {
  ticket: TicketDetail;
  isOpen: boolean;
  onClose: () => void;
}

const TicketDetailSidebar: React.FC<TicketDetailSidebarProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  // Fetch categories to get names
  const { data: categories = [] } = useCategories();

  // Get category name from ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "";
    // First check if ticket has category object with name
    if (ticket.category?.category_name) return ticket.category.category_name;
    // Otherwise look up from categories list
    const category = categories.find((c) => c.name === categoryId);
    return category?.category_name || categoryId;
  };

  // Get subcategory name from ID
  const getSubcategoryName = (subcategoryId: string | undefined): string => {
    if (!subcategoryId) return "";
    // First check if ticket has sub_category object with name
    if (ticket.sub_category?.category_name) return ticket.sub_category.category_name;
    // Otherwise look through all categories' subcategories
    for (const category of categories) {
      const sub = category.subcategories?.find((s) => s.name === subcategoryId);
      if (sub) return sub.category_name;
    }
    return subcategoryId;
  };

  // Calculate SLA status badges
  const getSLABadge = (
    dueDate: string | undefined,
    completedDate: string | undefined
  ) => {
    if (!dueDate) {
      return { label: "Not Set", color: "gray" };
    }

    const due = new Date(dueDate);
    const now = new Date();

    if (completedDate) {
      const completed = new Date(completedDate);
      if (completed <= due) {
        // Calculate how much time before deadline
        const diff = due.getTime() - completed.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return {
          label: `Fulfilled${hours > 0 ? ` (${hours}h ${minutes}m early)` : ""}`,
          color: "green",
        };
      } else {
        return { label: "Failed (Late)", color: "red" };
      }
    }

    // Not completed yet
    if (now > due) {
      return { label: "Overdue", color: "red" };
    }

    // Calculate remaining time
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 2) {
      return { label: `${hours}h ${minutes}m left`, color: "orange" };
    }

    return { label: `${hours}h ${minutes}m left`, color: "blue" };
  };

  const firstResponseSLA = getSLABadge(
    ticket.response_by,
    ticket.first_responded_on
  );

  const resolutionSLA = getSLABadge(
    ticket.resolution_by,
    ticket.resolution_date
  );

  // Format date for display
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-700";
      case "replied":
        return "bg-yellow-100 text-yellow-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "closed":
        return "bg-gray-100 text-gray-700";
      case "reopened":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Get SLA badge color class
  const getSLAColorClass = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-700";
      case "red":
        return "bg-red-100 text-red-700";
      case "orange":
        return "bg-orange-100 text-orange-700";
      case "blue":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Ticket Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Ticket ID and Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">#{ticket.name}</span>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusColor(
                ticket.status
              )}`}
            >
              {ticket.status}
            </span>
          </div>

          {/* SLA Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              SLA Information
            </h4>

            {/* First Response */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">First Response</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getSLAColorClass(
                    firstResponseSLA.color
                  )}`}
                >
                  {firstResponseSLA.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Due: {formatDate(ticket.response_by)}
              </p>
              {ticket.first_responded_on && (
                <p className="text-xs text-gray-500">
                  Responded: {formatDate(ticket.first_responded_on)}
                </p>
              )}
            </div>

            {/* Resolution */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Resolution</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getSLAColorClass(
                    resolutionSLA.color
                  )}`}
                >
                  {resolutionSLA.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Due: {formatDate(ticket.resolution_by)}
              </p>
              {ticket.resolution_date && (
                <p className="text-xs text-gray-500">
                  Resolved: {formatDate(ticket.resolution_date)}
                </p>
              )}
            </div>
          </div>

          {/* Ticket Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Ticket Information
            </h4>

            <div className="space-y-2">
              {/* Category */}
              {ticket.custom_category && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Category</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getCategoryName(ticket.custom_category)}
                  </span>
                </div>
              )}

              {/* Subcategory */}
              {ticket.custom_sub_category && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Subcategory</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getSubcategoryName(ticket.custom_sub_category)}
                  </span>
                </div>
              )}

              {/* Team/Agent Group */}
              {ticket.agent_group && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Team</span>
                  <span className="text-sm font-medium text-gray-800">
                    {ticket.agent_group}
                  </span>
                </div>
              )}

              {/* Priority */}
              {ticket.priority && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Priority</span>
                  <span className="text-sm font-medium text-gray-800">
                    {ticket.priority}
                  </span>
                </div>
              )}

              {/* Created */}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatDate(ticket.creation)}
                </span>
              </div>

              {/* Last Modified */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Last Updated</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatDate(ticket.modified)}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {ticket.contact && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </h4>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-800">{ticket.contact.name}</span>
                </div>

                {ticket.contact.email_id && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a
                      href={`mailto:${ticket.contact.email_id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {ticket.contact.email_id}
                    </a>
                  </div>
                )}

                {(ticket.contact.mobile_no || ticket.contact.phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-800">
                      {ticket.contact.mobile_no || ticket.contact.phone}
                    </span>
                  </div>
                )}

                {ticket.contact.company_name && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-800">
                      {ticket.contact.company_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raised By (if no contact) */}
          {!ticket.contact && ticket.raised_by && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Raised By
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-800">{ticket.raised_by}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TicketDetailSidebar;
