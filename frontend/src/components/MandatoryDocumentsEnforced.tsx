import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "./ListView";
import HeaderBar from "./HeaderBar";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { Typography } from "./shared/atoms/Typography";
import {
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoDocumentTextOutline,
  IoInformationCircleOutline,
  IoArrowBackOutline,
} from "react-icons/io5";
import { useScreenSize } from "../hooks/useScreenSize";
import { useSubmitAcknowledgement } from "../hooks/useEmployeeDocuments";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import { useQueryClient } from "@tanstack/react-query";
import Button from "./shared/atoms/Button";
import { FilePreview } from "./shared/molecules/FilePreview";
import { useFrappeDocumentCount } from "../hooks/useFrappeQuery";

// Skeleton component for loading states
const DocumentItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm animate-pulse mb-3">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-100 rounded-md w-1/3"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded-xl w-24 ml-4"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
    </div>
  );
};

interface DocumentItemProps {
  item: {
    name: string;
    status?: string;
    document_template?: string;
    enable_mandatory_acknowledgement?: number;
    file_name?: string;
  };
  index?: number;
  doctype: string;
}

const DocumentItem: React.FC<DocumentItemProps> = ({ item }) => {
  const { isMobile } = useScreenSize();
  const submitAck = useSubmitAcknowledgement();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setAcknowledged(false);
    }
  }, [showModal]);

  const title = item.document_template || "Employee Document";
  const status = item.status || "Draft";
  const documentId = item.name;

  const isComplete = status === "Acknowledged" || status === "Approved";

  const getFileUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const safePath = path.startsWith("/") ? path : "/" + path;
    return window.location.origin + safePath;
  };

  const handleAcknowledgeSubmit = async () => {
    try {
      await submitAck.mutateAsync(documentId);
      toast.success("Document Acknowledged Successfully");
      setShowModal(false);
      await queryClient.invalidateQueries({ queryKey: ["documents", "Employee Documents"] });
      await queryClient.invalidateQueries({ queryKey: ["documents-infinite", "Employee Documents"] });
      await queryClient.invalidateQueries({ queryKey: ["document-count", "Employee Documents"] });
    } catch (error) {
      errorResponseFormater(error, "Failed to acknowledge document", { showToast: true });
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 mb-3 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`p-1.5 rounded-lg ${isComplete
                ? "bg-success-50 text-success-600"
                : "bg-primary-50 text-primary-600"
                }`}
            >
              <IoDocumentTextOutline size={18} />
            </div>
            <Typography
              variant={isMobile ? "bodyMedium" : "h4"}
              className="text-gray-900 group-hover:text-primary-600 transition-colors"
            >
              {title}
            </Typography>
          </div>

          <div className="flex items-center gap-3 mt-1 pl-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.enable_mandatory_acknowledgement
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}
            >
              {item.enable_mandatory_acknowledgement ? "Mandatory" : "Optional"}
            </span>
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${isComplete
            ? "bg-success-50 text-success-700 border-success-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
        >
          {isComplete ? (
            <IoCheckmarkCircleOutline size={14} />
          ) : (
            <IoInformationCircleOutline size={14} />
          )}
          {isComplete ? "Completed" : "Pending"}
        </div>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className={`ml-auto sm:w-[200px] w-full font-brand font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isComplete
          ? "bg-gray-100 text-gray-800 border border-gray-200"
          : "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          }`}
      >
        {isComplete ? (
          <>
            <IoCheckmarkCircleOutline size={18} />
            View Document
          </>
        ) : (
          "View & Acknowledge"
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white shadow-lg w-full h-screen flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <Typography variant="h3" className="font-semibold text-gray-800 text-lg">
                Document Preview
              </Typography>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-gray-50">
              {item.file_name ? (
                <FilePreview
                  fileUrl={getFileUrl(item.file_name)}
                  fileName={item.file_name}
                  className="h-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No preview available for this document.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t p-4 bg-white">
              <div>
                {!isComplete && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="accent-green-600 w-4 h-4 cursor-pointer"
                    />
                    <span className={`font-medium ${acknowledged ? "text-green-700" : "text-gray-700"}`}>
                      I acknowledge this document
                    </span>
                  </label>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="soft" onClick={() => setShowModal(false)}>
                  Close
                </Button>
                {!isComplete && acknowledged && (
                  <Button variant="contain" onClick={handleAcknowledgeSubmit} disabled={submitAck.isPending}>
                    {submitAck.isPending ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MandatoryDocumentsEnforced: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const { data: currentEmployee, isLoading: isCurrentEmployeeLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isMobile } = useScreenSize();

  const { data: mandatoryDocsCount = 0 } = useFrappeDocumentCount(
    {
      doctype: "Employee Documents",
      filters: [
        ["status", "=", "Acknowledgement Required"],
        ["employee", "=", currentEmployee?.name || ""],
        ["enable_mandatory_acknowledgement", "=", 1],
      ],
    },
    {
      enabled: !!currentEmployee,
    }
  );

  const showBackBtn = mandatoryDocsCount <= 0;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      {isMobile && (
        <HeaderBar
          title="Mandatory Documents"
          showBackButton={showBackBtn}
          onBack={() => {
            const redirectTo = sessionStorage.getItem("mandatory_doc_redirect_to") || "/webapp/";
            navigate(redirectTo);
          }}
        />
      )}

      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-3xl mx-auto">
          {!isMobile && showBackBtn && (
            <div className="flex justify-start mb-6">
              <button
                onClick={() => {
                  const redirectTo = sessionStorage.getItem("mandatory_doc_redirect_to") || "/webapp/";
                  navigate(redirectTo);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 backdrop-blur-sm shadow-sm"
              >
                <IoArrowBackOutline size={18} />
                Go Back
              </button>
            </div>
          )}
          <div className="text-center">
            <Typography
              variant={isMobile ? "bodySmall" : "body"}
              className="text-white/80 max-w-xl mx-auto text-center"
            >
              Review and acknowledge mandatory company documents.
              Keep track of your compliance status.
            </Typography>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-xl shadow-lg border-l-4 border-l-red-500 p-5 mb-8 animate-fadeIn">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-red-50 p-2 rounded-full">
              <IoWarningOutline className="w-6 h-6 text-red-500" />
            </div>
            <div className="ml-4">
              <Typography
                variant={isMobile ? "bodyMedium" : "h4"}
                className="text-gray-900 mb-1"
              >
                Action Required
              </Typography>
              <Typography
                variant={isMobile ? "caption" : "bodySmall"}
                className="text-gray-600 leading-relaxed"
              >
                You must complete all{" "}
                <span className="font-semibold text-red-600">
                  mandatory documents
                </span>
                . Timely acknowledgment is required to maintain compliance and
                system access.
              </Typography>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full group flex items-center justify-between p-4 bg-white transition-all duration-200 ${expanded
              ? "border-b border-gray-100 bg-gray-50/50"
              : "hover:bg-gray-50/50"
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${expanded
                  ? "bg-primary-100 text-primary-700"
                  : "bg-primary-50 text-primary-600 group-hover:bg-primary-100"
                  }`}
              >
                <IoDocumentTextOutline size={20} />
              </div>
              <div className="text-left">
                <Typography
                  variant={isMobile ? "bodyMedium" : "h4"}
                  className="text-gray-900"
                >
                  Mandatory Documents
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  Documents requiring your immediate attention
                </Typography>
              </div>
            </div>
            <div
              className={`p-1.5 rounded-full transition-all duration-300 ${expanded
                ? "rotate-180 bg-primary-100 text-primary-700"
                : "bg-gray-50 text-gray-400 group-hover:text-primary-600 group-hover:bg-primary-50"
                }`}
            >
              <IoChevronDownOutline size={20} />
            </div>
          </button>

          {expanded && !isCurrentEmployeeLoading && (
            <div className="bg-gray-50/30 p-4 animate-slideDown">
              <FrappeListView
                doctype="Employee Documents"
                isLoading={isCurrentEmployeeLoading}
                ItemComponent={DocumentItem}
                SkeletonComponent={DocumentItemSkeleton}
                defaultFilters={{
                  status: "Acknowledgement Required",
                  employee: currentEmployee?.name || "",
                  enable_mandatory_acknowledgement: 1,
                }}
                defaultFields={[
                  "name",
                  "status",
                  "document_template",
                  "enable_mandatory_acknowledgement",
                  "file_name",
                ]}
                searchFields={["document_template", "name"]}
                infiniteScroll={true}
                isSearch={true}
                isFilter={false}
                pageSize={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MandatoryDocumentsEnforced;
