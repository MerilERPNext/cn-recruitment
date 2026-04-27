import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { X, Upload, Trash2, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import toast from "react-hot-toast";
import FrappeAPI from "../../utils/frappeAPI";
import {
  useCategories,
  useSubcategories,
  useCreateTicket,
  HDCategory,
  useGetCreationFormJson,
  useUpdateTicket,
} from "../../hooks/useHelpDeskTickets";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";
import EmployeeSelect from "../shared/EmployeeSelect";
import { FormIOForm, getFileComponents } from "../../utils/flowUtils";
import { Form } from "@tsed/react-formio";
import { FormioFormSkeleton } from "./LoadingSkeletons";
import { getRequiredKeys } from "../../utils/formioUtils";
import { useFileUploader } from "../../hooks/useFileUploader";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { FormioPreviewItem, FormioPreviewPortal } from "../shared/molecules/FormioPreview";

interface RequestIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadedFile {
  file_url: string;
  file_name: string;
  file?: File;
}

const MIN_DESCRIPTION_LENGTH = 15;

const RequestIssueModal: React.FC<RequestIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [raisedFor, setRaisedFor] = useState<"Myself" | "Others">("Myself");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [formioFiles, setFormioFiles] = useState<File[]>([]);



  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: creationFormJson, isLoading: creationFormJsonLoading } = useGetCreationFormJson({ category, sub_category: subcategory });
  const formRef = useRef<FormIOForm | null>(null);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [isFormioValid, setIsFormioValid] = useState(true);
  const [formioData, setFormioData] = useState<Record<string, unknown>>({});
  const loadingContext = useLoadingOverlay();

  useEffect(() => {
    if (!category || !subcategory) {
      setFormSchema(null);
      setIsFormioValid(true);
      setFormioData({});
      return;
    }
    if (creationFormJson?.form_json?.components) {
      const components = creationFormJson.form_json.components;

      // remove submit button
      const filteredComponents = Array.isArray(components)
        ? components.filter(
          (comp) => !(comp.type === "button" && comp.action === "submit")
        )
        : components;

      setFormSchema({ display: "form", components: filteredComponents });
      // New schema means fields are empty — check if any required fields exist
      const requiredKeys = getRequiredKeys(filteredComponents);
      setIsFormioValid(requiredKeys.length === 0);
      setFormioData({});
    }
  }, [category, subcategory, creationFormJson]);
  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: subcategories = [] } = useSubcategories(category);

  // Cleanup object URLs on unmount
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((file) => {
        if (file.file_url.startsWith("blob:")) {
          URL.revokeObjectURL(file.file_url);
        }
      });
    };
  }, []);

  // Mutation
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  // Check if attachment is mandatory based on selected category/subcategory
  const isAttachmentMandatory = useMemo(() => {
    // Check subcategory first
    if (subcategory) {
      const selectedSubcat = subcategories.find(s => s.name === subcategory);
      if (selectedSubcat) {
        // If subcategory has same_attachment_setting_as_category, check parent category
        if (selectedSubcat.same_attachment_setting_as_category) {
          const selectedCat = categories.find(c => c.name === category);
          return selectedCat?.make_attachment_mandatory ?? false;
        }
        return selectedSubcat.make_attachment_mandatory ?? false;
      }
    }
    // Check category
    if (category) {
      const selectedCat = categories.find(c => c.name === category);
      return selectedCat?.make_attachment_mandatory ?? false;
    }
    return false;
  }, [category, subcategory, categories, subcategories]);

  const { uploadFiles } = useFileUploader();
  // Reset form
  const resetForm = useCallback(() => {
    // Revoke object URLs to avoid memory leaks
    attachments.forEach((file) => {
      if (file.file_url.startsWith("blob:")) {
        URL.revokeObjectURL(file.file_url);
      }
    });

    setTitle("");
    setCategory("");
    setSubcategory("");
    setRaisedFor("Myself");
    setSelectedEmployee("");
    setDescription("");
    setAttachments([]);
    setIsFormioValid(true);
    setFormioData({});
  }, [attachments]);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Handle category change
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSubcategory(""); // Reset subcategory when category changes
  };

  // Handle file selection
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments = Array.from(files).map((file) => ({
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file: file,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormChange = useCallback((submission: any) => {
    const data: Record<string, unknown> = submission?.data || {};
    setFormioData(data);
    if (!formSchema) {
      setIsFormioValid(true);
      setFormioFiles([]);
      return;
    }

    const fileComponents = getFileComponents(formSchema.components);

    const extractedFiles: File[] = [];

    fileComponents.forEach((comp) => {
      const value = data[comp.key];

      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file?.file) {
            extractedFiles.push(file);
          }
        });
      }
    });

    // ✅ overwrite → removal handled automatically
    setFormioFiles(extractedFiles);

    // validation
    if (typeof submission?.isValid === "boolean") {
      setIsFormioValid(submission.isValid);
      return;
    }

    const requiredKeys = getRequiredKeys(formSchema.components);
    const allFilled = requiredKeys.every((key) => {
      const val = data[key];
      if (val === undefined || val === null) return false;
      if (typeof val === "string" && val.trim() === "") return false;
      if (Array.isArray(val) && val.length === 0) return false;
      if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return false;
      return true;
    });

    setIsFormioValid(allFilled);
  }, [formSchema]);

  const submitDisabled =
    createTicketMutation.isPending ||
    !title.trim() ||
    !description.trim() ||
    !category.trim() ||
    !subcategory.trim() ||
    (raisedFor === "Others" && !selectedEmployee.trim()) ||
    (isAttachmentMandatory && attachments.length === 0) ||
    description.trim().length < MIN_DESCRIPTION_LENGTH ||
    !isFormioValid;

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove.file_url.startsWith("blob:")) {
        URL.revokeObjectURL(fileToRemove.file_url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeFormioFile = (formId: string, compKey: string, index: number) => {
    try {
      // FormIO heavily guards its file deletions natively.
      // Easiest and most bulletproof way is triggering exactly the hidden trash icon Form.io natively renders!
      const rootNode = document.getElementById(formId) || document;
      const container = rootNode.querySelector(`.formio-component-${compKey}`);
      if (container) {
        const removeButtons = container.querySelectorAll(
          'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times'
        );
        if (removeButtons && removeButtons[index]) {
          (removeButtons[index] as HTMLElement).click();
        } else {
          console.error("Form.io native remove button not found");
        }
      }

      // Proactively update local State for instant UI feedback
      setFormioData((prevData) => {
        const newData = { ...prevData };
        if (Array.isArray(newData[compKey])) {
          newData[compKey] = newData[compKey].filter((_, i) => i !== index);
        }

        // Recalculate formioFiles globally from the updated local data
        if (formSchema) {
          const fileComponents = getFileComponents(formSchema.components);
          const extractedFiles: File[] = [];
          fileComponents.forEach((c) => {
            const value = newData[c.key as string];
            if (Array.isArray(value)) {
              value.forEach((file) => {
                if (file?.file) {
                  extractedFiles.push(file);
                }
              });
            }
          });
          setFormioFiles(extractedFiles);
        }

        return newData;
      });

    } catch (err) {
      console.error("Failed to remove file from formio", err);
    }
  };

  // Build description with attachments embedded as HTML
  const buildDescriptionWithAttachments = (desc: string, files: UploadedFile[]): string => {
    if (files.length === 0) return desc;

    // Append attachments as HTML links at the end of description
    let attachmentHtml = '<br/><br/><div class="attachments"><strong>Attachments:</strong><ul>';
    files.forEach((file) => {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.file_name);
      if (isImage) {
        attachmentHtml += `<li><a href="${file.file_url}" target="_blank"><img src="${file.file_url}" alt="${file.file_name}" style="max-width: 300px; max-height: 200px;" /><br/>${file.file_name}</a></li>`;
      } else {
        attachmentHtml += `<li><a href="${file.file_url}" target="_blank">${file.file_name}</a></li>`;
      }
    });
    attachmentHtml += '</ul></div>';

    return desc + attachmentHtml;
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation

    if (!isFormioValid) {
      toast.error("Please fill all required additional details");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!subcategory.trim()) {
      toast.error("Subcategory is required");
      return;
    }
    if (raisedFor === "Others" && !selectedEmployee.trim()) {
      toast.error("Employee is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      toast.error(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters long`);
      return;
    }
    if (isAttachmentMandatory && attachments.length === 0) {
      toast.error("Attachment is required for this category");
      return;
    }

    // 1. Upload local attachments first
    let finalAttachments = [...attachments];
    const localAttachments = attachments.filter((a) => a.file);

    if (localAttachments.length > 0) {
      loadingContext.show("Uploading attachments...");
      try {
        const uploadResults = await Promise.all(
          localAttachments.map(async (a) => {
            const res = await FrappeAPI.uploadFile(
              a.file!,
              a.file_name,
              undefined,
              undefined,
              undefined,
              "1"
            );
            return { originalUrl: a.file_url, remoteUrl: res.file_url, remoteName: res.file_name || a.file_name };
          })
        );

        // Update finalAttachments with remote URLs
        finalAttachments = finalAttachments.map((a) => {
          const match = uploadResults.find((r) => r.originalUrl === a.file_url);
          if (match) {
            return {
              file_url: match.remoteUrl,
              file_name: match.remoteName,
            };
          }
          return a;
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload attachments");
        loadingContext.hide();
        return;
      }
      loadingContext.hide();
    }

    // Embed attachments in description as HTML
    const descriptionWithAttachments = buildDescriptionWithAttachments(
      description.trim(),
      finalAttachments
    );
    const payload = {
      doc: {
        subject: title.trim(),
        description: descriptionWithAttachments,
        custom_category: category || undefined,
        custom_sub_category: subcategory || undefined,
        custom_rasied_for: raisedFor,
        custom_raise_for_employee: raisedFor === "Others" ? selectedEmployee : undefined,
        custom_for_myself: raisedFor === "Myself" ? 1 : 0,
        custom_for_others: raisedFor === "Others" ? 1 : 0,
        creation_form_data: JSON.stringify(
          formSchema ? { schema: formSchema, answer: formioData } : formioData
        )
      },
    };

    try {
      const res = await createTicketMutation.mutateAsync(payload) as { doctype?: string, name?: string };

      if (!res?.doctype || !res?.name) {
        toast.error("Filed to upload files to ticket");
        return;
      }
      if (formioFiles.length > 0) {
        loadingContext.show("Uploading files");
        const uploadResults = await uploadFiles(formioFiles, res.doctype, res.name);

        // Map upload results back to formioData
        let uploadIdx = 0;
        const updatedFormioData = { ...formioData };

        if (formSchema?.components) {
          const fileComponents = getFileComponents(formSchema.components);
          fileComponents.forEach((comp) => {
            const val = updatedFormioData[comp.key];
            if (Array.isArray(val)) {
              updatedFormioData[comp.key] = val.map((fileObj) => {
                // If it's a file object that was just uploaded
                if (fileObj.file && uploadIdx < uploadResults.length) {
                  const uploadRes = uploadResults[uploadIdx++];
                  return {
                    storage: "url",
                    name: uploadRes.file_name,
                    url: uploadRes.file_url,
                    size: uploadRes.file_size,
                    type: uploadRes.file_type,
                    data: {
                      role: "remote",
                    },
                  };
                }
                return fileObj;
              });
            }
          });

          // updateTicketMutation after file upload use api for updating creation_form_data and answer FormioData to attachment file url with remote role
          const updatedCreationFormData = JSON.stringify({
            schema: formSchema,
            answer: updatedFormioData,
          });

          await updateTicketMutation.mutateAsync({
            ticketId: res.name || "",
            params: {
              creation_form_data: updatedCreationFormData,
            },
          });
        }
        loadingContext.hide();
      }
      toast.success("Issue submitted successfully");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to submit ticket");
      console.error("Error submit ticket", error)
    } finally {
      loadingContext.hide();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl sm:mx-4 bg-white sm:rounded-xl shadow-xl max-sm:h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <Typography variant="h3" color="primary">
            Request Issue
          </Typography>
          <div className="flex items-center gap-2">
            {/* commenting out unused help icon */}
            {/* <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <HelpCircle className="w-5 h-5" />
            </button> */}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Row 1: Title and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Category<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none bg-white"
                  disabled={categoriesLoading}
                >
                  <option value="" disabled selected hidden>Select Category</option>
                  {categories.map((cat: HDCategory) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.category_name} - ({cat.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Subcategory (always show when category is selected) */}
          {category && subcategories.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Subcategory<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none bg-white"
                  disabled={subcategories.length === 0}
                >
                  <option value="">
                    {subcategories.length === 0 ? "No subcategories available" : "Select Subcategory"}
                  </option>
                  {subcategories.map((sub: HDCategory) => (
                    <option key={sub.name} value={sub.name}>
                      {sub.category_name} - ({sub.name})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Row 3: Raised For and Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Raised For */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raised For
              </label>
              <div className="relative">
                <select
                  value={raisedFor}
                  onChange={(e) => {
                    setRaisedFor(e.target.value as "Myself" | "Others");
                    if (e.target.value === "Myself") {
                      setSelectedEmployee("");
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none bg-white"
                >
                  <option value="Myself">Myself</option>
                  <option value="Others">Others</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Employee Dropdown (conditional) */}
            {raisedFor === "Others" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee<span className="text-red-500">*</span>
                </label>
                <EmployeeSelect
                  value={selectedEmployee}
                  onChange={(val) => setSelectedEmployee(val)}
                  placeholder="Select Employee"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description<span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Description (minimum ${MIN_DESCRIPTION_LENGTH} characters)`}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">Minimum {MIN_DESCRIPTION_LENGTH} characters required</span>
              <span className={`text-xs ${description.trim().length < MIN_DESCRIPTION_LENGTH ? 'text-red-500' : 'text-green-500'}`}>
                {description.trim().length}/{MIN_DESCRIPTION_LENGTH} characters
              </span>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments{!!isAttachmentMandatory && <span className="text-red-500">*</span>}
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:border-gray-400"
                }`}
            >
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Drag and Drop here or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Choose file
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Uploaded files list */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <AttachmentCard
                        fileUrl={file.file_url}
                        fileName={file.file_name}
                        showFileNameWithEye={false}
                      />
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 text-gray-400 hover:text-red-600 ml-2"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
          {creationFormJsonLoading && category && subcategory ? (
            <FormioFormSkeleton />
          ) : formSchema ? (
            <div className="w-full show-req-astrik mt-4 ">
              <Typography variant="subheading" className="mb-1">Additional Details</Typography>
              <div id="request-issue-form-container" className="w-full border-gray-100 rounded-lg p-4 border-1">
                <style>{`
                  .formio-component-file .list-group {
                    display: none !important;
                  }
                `}</style>
                <Form
                  form={formSchema}
                  ref={formRef}
                  options={{
                    buttonSettings: {
                      showSubmit: false
                    }
                  }}
                  onChange={handleFormChange}
                />

                {/* Formio Attachment Previews via Portals */}
                {formSchema.components && getFileComponents(formSchema.components).length > 0 && (
                  <>
                    {getFileComponents(formSchema.components).map((comp) => {
                      const rawFiles = formioData[comp.key as string];
                      const files = Array.isArray(rawFiles) ? rawFiles : (rawFiles ? [rawFiles] : []);
                      if (files.length === 0) return null;

                      return (
                        <FormioPreviewPortal key={comp.key} compKey={comp.key as string} formContainerId="request-issue-form-container">
                          <div className="space-y-2 mt-2 w-full">
                            {files.map((fileObj, idx) => (
                              <FormioPreviewItem
                                key={`${comp.key}-${idx}`}
                                fileObj={fileObj}
                                onRemove={() => removeFormioFile("request-issue-form-container", comp.key as string, idx)}
                              />
                            ))}
                          </div>
                        </FormioPreviewPortal>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            bgColor="primary"
            size="md"
            onClick={resetForm}
            disabled={createTicketMutation.isPending}
            className="max-sm:w-full"
          >
            Reset
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="md"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="max-sm:w-full"
          >
            {createTicketMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestIssueModal;
