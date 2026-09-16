import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { X, User, Briefcase, Hash, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import "../../utils/FormioConfig";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCreateEmployeeDocument } from "../../hooks/useEmployeeDocuments";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { EmployeeDocumentService } from "../../services/EmployeeDocumentService";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CircularLoader from "../shared/atoms/CircularLoader";
import employeeDocumentUploadSchema from "./employeeDocumentUploadSchema.json";

interface EmployeeDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EmployeeDocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: EmployeeDocumentUploadModalProps) {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [formMountKey, setFormMountKey] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setFormMountKey((prev) => prev + 1);
      setAttachedFiles([]);
      setFileError("");
    } else {
      formRef.current = null;
      setAttachedFiles([]);
      setFileError("");
    }
  }, [isOpen]);

  const { targetEmployeeId } = useTargetUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const { mutateAsync: createEmployeeDoc, isPending: isCreatingDoc } =
    useCreateEmployeeDocument();
  const loading = useLoadingOverlay();

  const isDataReady = !isEmployeeLoading;

  const effectiveEmployeeId = useMemo(() => {
    return (
      targetEmployeeId ||
      currentEmployee?.employee ||
      currentEmployee?.name ||
      ""
    );
  }, [targetEmployeeId, currentEmployee]);

  // Extract files from native file input events (browsing / clicking file picker)
  const handleContainerChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target && target.type === "file" && target.files && target.files.length > 0) {
      const picked = Array.from(target.files);
      setAttachedFiles(picked);
      setFileError("");
    }
  };

  // Extract files from drag and drop events
  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setAttachedFiles(dropped);
      setFileError("");
    }
  };

  // Sync with Formio's internal state changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormChange = (submission: any) => {
    const rawFiles = submission?.data?.file_name;
    if (!rawFiles || (Array.isArray(rawFiles) && rawFiles.length === 0)) {
      // User may have cleared/removed the file in Formio
      // Check if we still have files in native input before clearing
      const fileInputs = formContainerRef.current?.querySelectorAll<HTMLInputElement>('input[type="file"]');
      let hasNativeFiles = false;
      fileInputs?.forEach((input) => {
        if (input.files && input.files.length > 0) hasNativeFiles = true;
      });
      if (!hasNativeFiles) {
        setAttachedFiles([]);
      }
      return;
    }

    const arr = Array.isArray(rawFiles) ? rawFiles : [rawFiles];
    const extracted: File[] = [];
    for (const item of arr) {
      if (!item) continue;
      if (item instanceof File) {
        extracted.push(item);
      } else if (item.file instanceof File) {
        extracted.push(item.file);
      } else if (item.file && typeof item.file.slice === "function" && item.name) {
        extracted.push(item.file as File);
      }
    }

    if (extracted.length > 0) {
      setAttachedFiles(extracted);
      setFileError("");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!effectiveEmployeeId) {
        toast.error("Employee details could not be found. Please try again.");
        return;
      }

      // Collect files to upload from all sources
      const filesToUpload: File[] = [...attachedFiles];

      // Fallback 1: Query native input elements in container
      if (filesToUpload.length === 0 && formContainerRef.current) {
        const fileInputs =
          formContainerRef.current.querySelectorAll<HTMLInputElement>(
            'input[type="file"]'
          );
        fileInputs.forEach((input) => {
          if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach((f) => filesToUpload.push(f));
          }
        });
      }

      // Fallback 2: Check Formio component instance dataValue / files
      if (filesToUpload.length === 0 && formRef.current) {
        const comp = formRef.current.getComponent ? formRef.current.getComponent("file_name") : null;
        const compCandidates = [
          comp?.dataValue,
          comp?.files,
          formRef.current.submission?.data?.file_name,
          formRef.current.data?.file_name,
        ];

        for (const candidate of compCandidates) {
          if (!candidate) continue;
          const arr = Array.isArray(candidate) ? candidate : [candidate];
          for (const item of arr) {
            if (!item) continue;
            if (item instanceof File) {
              filesToUpload.push(item);
            } else if (item.file instanceof File) {
              filesToUpload.push(item.file);
            } else if (item.file && typeof item.file.slice === "function") {
              filesToUpload.push(item.file as File);
            }
          }
          if (filesToUpload.length > 0) break;
        }
      }

      // Validate required attachment ONLY on submit click
      if (filesToUpload.length === 0) {
        setFileError("Please attach a document file.");
        toast.error("Please attach a document file.");
        return;
      }

      setFileError("");

      await loading.wrap(async () => {
        // Step 1: Create Employee Documents record
        const createdDoc = await createEmployeeDoc({
          employee: effectiveEmployeeId,
          type: "Personal",
          status: "Approved",
        });

        const docResult = createdDoc as unknown as {
          name?: string;
          data?: { name?: string; data?: { name?: string } };
        };
        const docName =
          docResult?.name ||
          docResult?.data?.name ||
          docResult?.data?.data?.name;

        if (!docName) {
          throw new Error("Failed to retrieve created document ID.");
        }

        // Step 2: Upload attachment file as PUBLIC (is_private = '0')
        let uploadedFileUrl: string | undefined;

        if (filesToUpload.length > 0) {
          const fileToUpload = filesToUpload[0];
          const uploadRes = await EmployeeDocumentService.uploadDocumentFile(
            fileToUpload,
            docName
          );
          uploadedFileUrl = uploadRes?.file_url;
        }

        // Step 3: Patch file_name field on the newly created record
        if (uploadedFileUrl) {
          await EmployeeDocumentService.updateEmployeeDocumentFileName(
            docName,
            uploadedFileUrl
          );
        }

        toast.success("Employee document uploaded successfully!");
        queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
        queryClient.invalidateQueries({
          queryKey: ["employee-documents-count"],
        });
        onSuccess?.();
        onClose();
      }, "Uploading document...");
    } catch (err) {
      console.error("Failed to upload document:", err);
      toast.error(errorResponseFormater(err, "Failed to upload document."));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <Typography variant="h3" color="primary">
            Add Employee Document
          </Typography>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!isDataReady ? (
            <div className="flex items-center justify-center py-12">
              <CircularLoader />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee Details Info Card */}
              {currentEmployee && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Employee Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700 min-w-0">
                      <User className="w-4 h-4 text-primary-600 shrink-0" />
                      <span className="truncate font-medium" title={currentEmployee.employee_name}>
                        {currentEmployee.employee_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 min-w-0">
                      <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate" title={effectiveEmployeeId}>
                        {effectiveEmployeeId || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 min-w-0">
                      <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate" title={currentEmployee.designation}>
                        {currentEmployee.designation || "No Designation"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Formio Form Container */}
              <div
                ref={formContainerRef}
                className="employee-doc-form"
                onChange={handleContainerChange}
                onDrop={handleContainerDrop}
              >
                <Form
                  key={`employee-doc-form-${formMountKey}`}
                  form={employeeDocumentUploadSchema}
                  onChange={handleFormChange}
                  options={{
                    builder: { styles: false },
                    submitButton: false,
                    alerts: false,
                    noAlerts: true,
                    validateOnInit: false,
                    validateOnBlur: false,
                    validateOnChange: false,
                    buttonSettings: {
                      showSubmit: false,
                    },
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onFormReady={(instance: any) => {
                    formRef.current = instance;
                    instance.setPristine(true);
                    instance.clearErrors();
                  }}
                />

                {/* Submit-triggered validation error message */}
                {fileError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            size="md"
            variant="outline"
            className="min-w-[100px]"
            disabled={isCreatingDoc}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="md"
            variant="contain"
            bgColor="primary"
            className="min-w-[120px]"
            disabled={!isDataReady || isCreatingDoc}
          >
            {isCreatingDoc ? "Submitting..." : "Add Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
