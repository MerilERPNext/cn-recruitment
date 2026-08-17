import React, { useState } from 'react';
import { Upload, Save, Check, X, Eye } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';
import { FilePreviewModal } from '../../../shared/molecules/FilePreviewModal';
import { useScreenSize } from '../../../../hooks/useScreenSize';

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
  const { isDesktop } = useScreenSize();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const actionButtonsCount = (hasSavePermission ? 1 : 0) + (hasSubmitPermission ? 1 : 0);

  return (
    <div className="sticky bottom-0 left-0 right-0 sm:bottom-6 sm:px-6 z-30 pointer-events-none">
      {previewUrl && (
        <div className="pointer-events-auto">
          <FilePreviewModal
            fileUrl={previewUrl}
            fileName={attachedFile?.name || "Preview"}
            onClose={handleClosePreview}
          />
        </div>
      )}
      <div className="w-full flex flex-col md:flex-row md:items-end justify-between sm:gap-4">
        <div className="flex items-center gap-6 pointer-events-auto">
          {lastSavedTime && (
            <Typography variant="caption" color="body2" className="font-semibold bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-100 hidden sm:inline-block">
              Saved at {lastSavedTime}
            </Typography>
          )}
        </div>

        <div className="pointer-events-auto w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white sm:bg-white/90 sm:backdrop-blur-md p-3 sm:px-4 sm:py-3 border-t sm:border border-gray-200 shadow-lg sm:shadow-2xl sm:rounded-2xl">
          {isGridEditable ? (
            <>
              {/* File Attachment Upload */}
              <div className="relative flex items-center w-full sm:w-auto">
                {attachedFile ? (
                  <div className="flex items-center justify-between sm:justify-start gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePreviewClick}
                      className="flex items-center gap-2 cursor-pointer text-primary hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors flex-1 sm:flex-initial min-w-0"
                      title="Preview file"
                    >
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <Typography variant="bodySmall" className="truncate max-w-[140px] sm:max-w-[150px] font-semibold">
                        {attachedFile.name}
                      </Typography>
                    </button>

                    <div className="w-px h-5 bg-gray-200 mx-1"></div>

                    <label className="flex items-center justify-center p-1.5 cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="Reupload">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 hover:bg-gray-50 transition-colors bg-white shadow-sm w-full sm:w-auto">
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

              {/* Action Buttons Container: Grid with max 2 buttons per row on mobile, fullWidth buttons */}
              <div className={`grid ${actionButtonsCount > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full sm:flex sm:items-center sm:w-auto`}>
                {hasSavePermission && (
                  <Button
                    variant="outline"
                    bgColor="primary"
                    size="md"
                    fullWidth={!isDesktop}
                    disabled={isSaving || !hasChanges}
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSaveOrSubmit(false)}
                    className="justify-center shadow-sm sm:shadow-none"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>
                )}
                {hasSubmitPermission && (
                  <Button
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    fullWidth={!isDesktop}
                    disabled={isSaving}
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => handleSaveOrSubmit(true)}
                    className="justify-center shadow-sm sm:shadow-none"
                  >
                    {isSaving ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            timesheetStatus !== "Cancelled" && hasCancelPermission && (
              <div className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  bgColor="error"
                  size="md"
                  fullWidth={!isDesktop}
                  disabled={isSaving}
                  icon={<X className="w-4 h-4" />}
                  onClick={handleCancelTimesheet}
                  className="justify-center shadow-sm sm:shadow-none"
                >
                  Cancel
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
