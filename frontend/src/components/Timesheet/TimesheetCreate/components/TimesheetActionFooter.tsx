import React from 'react';
import { Upload, Save, Check, X, Eye } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';
import { FilePreviewModal } from '../../../shared/molecules/FilePreviewModal';

interface TimesheetActionFooterProps {
  lastSavedTime: string;
  isGridEditable: boolean;
  hasSavePermission: boolean;
  hasSubmitPermission: boolean;
  hasCancelPermission: boolean;
  timesheetStatus: string;
  isSaving: boolean;
  hasChanges: boolean;
  attachedFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveOrSubmit: (isSubmit: boolean) => void;
  handleCancelTimesheet: () => void;
}

export const TimesheetActionFooter: React.FC<TimesheetActionFooterProps> = ({
  lastSavedTime,
  isGridEditable,
  hasSavePermission,
  hasSubmitPermission,
  hasCancelPermission,
  timesheetStatus,
  isSaving,
  hasChanges,
  attachedFile,
  handleFileChange,
  handleSaveOrSubmit,
  handleCancelTimesheet
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const handlePreviewClick = () => {
    if (attachedFile) {
      setPreviewUrl(URL.createObjectURL(attachedFile));
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  return (
    <div className="sticky bottom-0 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30 pointer-events-none">
      {previewUrl && (
        <div className="pointer-events-auto">
          <FilePreviewModal
            fileUrl={previewUrl}
            fileName={attachedFile?.name || "Preview"}
            onClose={handleClosePreview}
          />
        </div>
      )}
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-6 pointer-events-auto">
          {lastSavedTime && (
            <Typography variant="caption" color="body2" className="font-semibold bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-100 hidden sm:inline-block">
              Saved at {lastSavedTime}
            </Typography>
          )}
        </div>

        <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-4 pointer-events-auto bg-white/90 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl border border-gray-200">
          {isGridEditable ? (
            <>
              {/* File Attachment Upload */}
              <div className="relative flex items-center gap-2">
                {attachedFile ? (
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={handlePreviewClick}
                      className="flex items-center gap-2 cursor-pointer text-primary hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                      title="Preview file"
                    >
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <Typography variant="bodySmall" className="truncate max-w-[80px] sm:max-w-[150px] font-semibold">
                        {attachedFile.name}
                      </Typography>
                    </button>

                    <div className="w-px h-5 bg-gray-200 mx-1"></div>

                    <label className="flex items-center justify-center p-1.5 cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Reupload">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <Typography variant="bodySmall">Attach</Typography>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                )}
              </div>
              {hasSavePermission && (
                <Button
                  variant="outline"
                  bgColor="primary"
                  size="md"
                  disabled={isSaving || !hasChanges}
                  icon={<Save className="w-4 h-4" />}
                  onClick={() => handleSaveOrSubmit(false)}
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              )}
              {hasSubmitPermission && (
                <Button
                  variant="contain"
                  bgColor="primary"
                  size="md"
                  disabled={isSaving}
                  icon={<Check className="w-4 h-4" />}
                  onClick={() => handleSaveOrSubmit(true)}
                >
                  {isSaving ? "Submitting..." : "Submit"}
                </Button>
              )}
            </>
          ) : (
            timesheetStatus !== "Cancelled" && hasCancelPermission && (
              <Button
                variant="outline"
                bgColor="error"
                size="md"
                disabled={isSaving}
                icon={<X className="w-4 h-4" />}
                onClick={handleCancelTimesheet}
              >
                Cancel
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
