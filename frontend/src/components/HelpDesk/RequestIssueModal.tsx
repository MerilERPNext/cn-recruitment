import React, { useState, useRef, useCallback } from "react";
import { X, HelpCircle, Upload, Trash2, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import toast from "react-hot-toast";
import {
  useCategories,
  useSubcategories,
  useEmployeeList,
  useCreateTicket,
  HDCategory,
} from "../../hooks/useHelpDeskTickets";

interface RequestIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadedFile {
  file_url: string;
  file_name: string;
}

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
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: subcategories = [] } = useSubcategories(category);
  const { data: employees = [], isLoading: employeesLoading } = useEmployeeList();

  // Mutation
  const createTicketMutation = useCreateTicket();

  // Reset form
  const resetForm = useCallback(() => {
    setTitle("");
    setCategory("");
    setSubcategory("");
    setRaisedFor("Myself");
    setSelectedEmployee("");
    setDescription("");
    setAttachments([]);
  }, []);

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

  // Get CSRF token from cookie
  const getCSRFToken = (): string => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "csrf_token") {
        return decodeURIComponent(value);
      }
    }
    return "";
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("is_private", "1");

        // Get CSRF token
        const csrfToken = getCSRFToken();

        const response = await fetch("/api/method/upload_file", {
          method: "POST",
          body: formData,
          headers: {
            "X-Frappe-CSRF-Token": csrfToken,
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error:", errorText);
          throw new Error("Upload failed");
        }

        const result = await response.json();
        if (result.message) {
          setAttachments((prev) => [
            ...prev,
            {
              file_url: result.message.file_url,
              file_name: result.message.file_name,
            },
          ]);
        }
      }
      toast.success("File uploaded successfully");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

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
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    const payload = {
      doc: {
        subject: title.trim(),
        description: description.trim(),
        custom_category: category || undefined,
        custom_subcategory: subcategory || undefined,
        custom_rasied_for: raisedFor,
        custom_raise_for_employee: raisedFor === "Others" ? selectedEmployee : undefined,
        custom_for_myself: raisedFor === "Myself" ? 1 : 0,
        custom_for_others: raisedFor === "Others" ? 1 : 0,
      },
      attachments,
    };

    try {
      await createTicketMutation.mutateAsync(payload);
      toast.success("Issue submitted successfully");
      handleClose();
      onSuccess?.();
    } catch {
      toast.error("Failed to submit issue");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <Typography variant="h3" color="primary">
            Request Issue
          </Typography>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <HelpCircle className="w-5 h-5" />
            </button>
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
                Select Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none bg-white"
                  disabled={categoriesLoading}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat: HDCategory) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Subcategory (always show when category is selected) */}
          {category && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Subcategory
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
                      {sub.category_name}
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
                  Select Employee
                </label>
                <div className="relative">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none bg-white"
                    disabled={employeesLoading}
                  >
                    <option value="">
                      {employeesLoading ? "Loading employees..." : "Select Employee"}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.value} value={emp.value}>
                        {emp.description}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
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
              placeholder="Description"
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
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
                  disabled={isUploading}
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
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {file.file_name}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploading && (
              <div className="mt-2 text-sm text-gray-500">Uploading...</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            bgColor="primary"
            size="md"
            onClick={resetForm}
            disabled={createTicketMutation.isPending}
          >
            Reset
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="md"
            onClick={handleSubmit}
            disabled={createTicketMutation.isPending || !title.trim() || !description.trim()}
          >
            {createTicketMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestIssueModal;
