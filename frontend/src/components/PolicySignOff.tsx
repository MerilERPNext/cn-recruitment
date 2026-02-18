import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useFrappeDocument,
  useUpdateFrappeDocument,
} from "../hooks/useFrappeQuery";
import toast from "react-hot-toast";
import { Form } from "@tsed/react-formio";
import { queryClient } from "../providers/QueryProvider";
import SecurePdfViewer from "./SecurePdfViewer_CookieAuth";
import {
  IoChevronBackOutline,
  IoCloudDownloadOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline
} from "react-icons/io5";
import { useScreenSize } from "../hooks/useScreenSize";
import { Typography } from "./shared/atoms/Typography";

interface PolicyDetailsDocument {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  policy: string;
  employee_id: string;
  employee_name: string;
  sign_off_mandatory: number;
  due_date: string;
  status: string;
  allow_decline: number;
  doctype: string;
  policy_document: string;
  form_json: string;
}

const PolicySignOff: React.FC = () => {
  const navigate = useNavigate();
  const { policyId } = useParams<{ policyId: string }>();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutateAsync: updatePolicy } = useUpdateFrappeDocument();
  // Fetch policy details using the API
  const {
    data: policyData,
    isLoading,
    error,
  } = useFrappeDocument("Policy Details", policyId || "", [
    "name",
    "policy",
    "employee_id",
    "employee_name",
    "sign_off_mandatory",
    "due_date",
    "status",
    "allow_decline",
    "policy_document",
    "form_json",
  ]) as {
    data: PolicyDetailsDocument | undefined;
    isLoading: boolean;
    error: any;
  };

  const handleSignOff = () => {
    if (policyData?.form_json) {
      setIsModalOpen(true);
    } else if (isAgreed) {
      updatePolicy({
        doctype: "Policy Details",
        name: policyId || "",
        data: {
          status: "Acknowledged",
        },
      })
        .then(() => {
          toast.success("Policy acknowledged successfully");
          queryClient.invalidateQueries({
            queryKey: ["documents-infinite", "Policy Details"],
          });
          queryClient.invalidateQueries({
            queryKey: ["document-count", "Policy Details"],
          });
          navigate("/webapp/policies-enforced");
        })
        .catch((error) => {
          toast.error("Failed to acknowledge policy");
          console.error(error);
        });
    }
  };

  const handleFormSubmit = (formData: any) => {
    console.log("Form submitted with data:", formData);

    updatePolicy({
      doctype: "Policy Details",
      name: policyId || "",
      data: {
        status: "Acknowledged",
        response_json: JSON.stringify(formData),
      },
    })
      .then(() => {
        toast.success("Policy acknowledged successfully");
        setIsModalOpen(false);
        queryClient.invalidateQueries({
          queryKey: ["documents-infinite", "Policy Details"],
        });
        queryClient.invalidateQueries({
          queryKey: ["document-count", "Policy Details"],
        });
        navigate("/webapp/policies-enforced");
      })
      .catch((error) => {
        toast.error("Failed to acknowledge policy");
        console.error(error);
      });
  };

  const handleDecline = () => {
    updatePolicy({
      doctype: "Policy Details",
      name: policyId || "",
      data: {
        status: "Declined",
      },
    })
      .then(() => {
        toast.success("Policy declined successfully");
        navigate("/webapp/policies-enforced");
      })
      .catch((error) => {
        toast.error("Failed to decline policy");
        console.error(error);
      });
  };

  const handleBack = () => {
    navigate("/webapp/policies-enforced");
  };

  const { isDesktop } = useScreenSize();
  // Download action for header
  const DownloadAction: React.FC = () => (
    <a
      href={policyData?.policy_document}
      download
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
    >
      <IoCloudDownloadOutline className="w-5 h-5" />
      {isDesktop && <Typography variant="bodyMedium" className="text-white">Download</Typography>}
    </a>
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-600 mx-auto"></div>
          <Typography variant="body" className="mt-4 text-gray-600">
            Loading policy details...
          </Typography>
        </div>
      </div>
    );
  }

  if (error || !policyData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-primary-600 to-secondary-600 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors mr-3"
                  aria-label="Go back"
                >
                  <IoChevronBackOutline size={24} />
                </button>
                <Typography variant="h3" className="text-white">
                  Policy Sign Off
                </Typography>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-10 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <IoWarningOutline className="w-8 h-8 text-red-500" />
            </div>
            <Typography variant="h3" className="text-gray-900 mb-3">
              Policy Not Found
            </Typography>
            <Typography variant="body" className="text-gray-500 mb-8 max-w-sm mx-auto">
              {error
                ? "Error loading policy details."
                : "The requested policy could not be found or you don't have permission to view it."}
            </Typography>
            <button
              onClick={handleBack}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Back to Policies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col items-center bg-gray-100/50">
      {/* Container to limits width heavily like a document viewer */}
      <div className="w-full h-full lg:max-w-4xl flex flex-col bg-white shadow-2xl lg:h-[calc(100vh-2rem)] lg:my-4 lg:rounded-xl overflow-hidden relative">

        {/* Header - Fixed at top */}
        <div className="shrink-0 z-50 bg-gradient-to-r from-primary-600 to-secondary-600 shadow-md">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0 mr-4">
                <button
                  onClick={handleBack}
                  className="text-white/90 hover:text-white p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition-colors mr-3"
                  aria-label="Go back"
                >
                  <IoChevronBackOutline size={22} />
                </button>
                <div className="min-w-0">
                  <Typography variant="h4" className="text-white truncate">
                    {policyData?.policy}
                  </Typography>
                  <div className="flex items-center gap-2 text-white/80 mt-0.5">
                    <Typography variant="caption" className="text-white/80">
                      Due: {new Date(policyData.due_date).toLocaleDateString()}
                    </Typography>
                    {isDesktop && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/40"></span>
                        <Typography variant="caption" className="text-white/80">
                          {policyData.employee_name}
                        </Typography>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {policyData.policy_document ? <DownloadAction /> : null}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area - Takes remaining space */}
        <div className="flex-1 min-h-0 bg-gray-50 flex flex-col relative overflow-hidden">
          {policyData.policy_document ? (
            <div className="flex-1 w-full h-full overflow-hidden p-4">
              <div className="bg-white rounded-lg shadow-sm w-full h-full border border-gray-200 overflow-hidden">
                <SecurePdfViewer fetchUrl={policyData.policy_document} className="h-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-10 text-center overflow-y-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <IoWarningOutline className="w-8 h-8 text-gray-400" />
              </div>
              <Typography variant="h4" className="text-gray-900 mb-2">No Document Available</Typography>
              <Typography variant="body" className="text-gray-500">There is no PDF document attached to this policy.</Typography>
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed at bottom */}
        <div className="shrink-0 bg-white border-t border-gray-200 p-4 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
          {policyData.status === "Pending" ? (
            <div className="max-w-3xl mx-auto w-full">
              {policyData.form_json ? (
                <button
                  onClick={handleSignOff}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Complete Acknowledgment Form</span>
                  <IoChevronBackOutline className="rotate-180" />
                </button>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        id="agreement"
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 transition duration-150 ease-in-out cursor-pointer"
                      />
                    </div>
                    <div className="ms-2">
                      <Typography variant="body" className="text-gray-700 font-medium">
                        I have read and understood this policy
                      </Typography>
                      <Typography variant="caption" className="text-gray-500 mt-1 block">
                        By checking this box, you confirm that you have reviewed the document above.
                      </Typography>
                    </div>
                  </label>

                  <div className={`grid gap-3 ${policyData.allow_decline === 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    <button
                      onClick={handleSignOff}
                      disabled={!isAgreed}
                      className={`w-full font-medium py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${isAgreed
                        ? "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-md hover:shadow-lg"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        }`}
                    >
                      <IoCheckmarkCircleOutline size={20} />
                      Acknowledge Policy
                    </button>

                    {policyData.allow_decline === 1 && (
                      <button
                        onClick={handleDecline}
                        className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-medium py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <IoCloseCircleOutline size={20} />
                        Decline
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${policyData.status === "Acknowledged"
                ? "bg-success-50 text-success-700 border border-success-100"
                : "bg-red-50 text-red-700 border border-red-100"
                }`}>
                {policyData.status === "Acknowledged" ? <IoCheckmarkCircleOutline size={18} /> : <IoCloseCircleOutline size={18} />}
                <Typography variant="bodyMedium" className="font-semibold">
                  Policy {policyData.status} on {new Date(policyData.modified).toLocaleDateString()}
                </Typography>
              </div>
            </div>
          )}
        </div>

        {/* Full Screen Modal with FormIO Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scaleIn overflow-hidden relative">
              {/* Modal Header */}
              <div className="shrink-0 flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 z-10 sticky top-0">
                <Typography variant="h4" className="text-gray-900">
                  Complete Acknowledgment
                </Typography>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                >
                  <IoCloseCircleOutline size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <Typography variant="body" className="text-blue-800">
                    Please complete the form below to finalize your acknowledgment of <span className="font-semibold">"{policyData.policy}"</span>.
                  </Typography>
                </div>

                {policyData.form_json ? (
                  (() => {
                    try {
                      const formConfig = JSON.parse(policyData.form_json);
                      // Form config validation and defaults logic...
                      if (!formConfig || typeof formConfig !== "object") throw new Error("Invalid form config");
                      if (!formConfig.components || !Array.isArray(formConfig.components)) formConfig.components = [];

                      formConfig.components.forEach((component: any) => {
                        if (!component || typeof component !== "object") return;
                        if (component.key === "employeeName" || component.key === "employee_name") {
                          component.defaultValue = policyData.employee_name;
                        } else if (component.key === "employeeId" || component.key === "employee_id") {
                          component.defaultValue = policyData.employee_id;
                        } else if (component.key === "acknowledgedDate" || component.key === "acknowledged_date") {
                          component.defaultValue = new Date().toISOString();
                        }
                      });

                      const validatedForm = {
                        display: "form",
                        type: "form",
                        ...formConfig,
                        components: formConfig.components,
                      };

                      return (
                        <Form
                          form={validatedForm}
                          onSubmit={(data: any) => handleFormSubmit(data.data)}
                          options={{ noAlerts: true, readOnly: false }}
                        />
                      );
                    } catch (error) {
                      console.error("Error parsing form_json:", error);
                      return (
                        <div className="text-center py-8">
                          <IoWarningOutline className="w-10 h-10 text-red-500 mx-auto mb-3" />
                          <Typography variant="body" className="text-red-600 mb-4">
                            Error loading acknowledgment form configuration.
                          </Typography>
                          <button
                            onClick={() => handleFormSubmit({})}
                            className="text-primary-600 hover:text-primary-700 font-medium underline"
                          >
                            Skip form and acknowledge
                          </button>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div className="text-center py-8">
                    <Typography variant="body" className="text-gray-500 mb-4">
                      No additional information required.
                    </Typography>
                    <button
                      onClick={() => handleFormSubmit({})}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
                    >
                      Confirm Acknowledgment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicySignOff;
