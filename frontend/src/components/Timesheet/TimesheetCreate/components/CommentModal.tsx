import Modal from '../../../shared/Modal';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';
import { X } from 'lucide-react';

interface CommentModalProps {
    onClose: () => void;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    showSubmitButton?: boolean;
    handleSaveComment: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
    onClose,
    label,
    value,
    onChange,
    disabled = false,
    showSubmitButton = true,
    handleSaveComment
}) => {
    return (
        <Modal isOpen={true} onClose={onClose} size="md">
            <div className="flex flex-col bg-white overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <Typography variant="h4" className="text-gray-900">
                            Daily Log Comment
                        </Typography>
                        <Typography variant="bodySmall" color="body2" className="mt-1">
                            {label}
                        </Typography>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors focus:outline-none"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">
                        Description / Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        placeholder="Enter log comments here..."
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        id="timesheet-cell-comment-textarea"
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-800"
                    />
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <Button
                        variant="outline"
                        bgColor="primary"
                        size="md"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                    {showSubmitButton && (
                        <Button
                            variant="contain"
                            bgColor="primary"
                            size="md"
                            disabled={!value.trim()}
                            onClick={handleSaveComment}
                        >
                            Save Comment
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    )
}
