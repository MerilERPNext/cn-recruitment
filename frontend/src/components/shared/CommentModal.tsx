import { useState } from "react";
import Button from "./atoms/Button";
import { Typography } from "./atoms/Typography";

export interface CommentModalProps {
    open: boolean;
    onSubmit: (comment: string) => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    isLoading?: boolean;
    label?: string;
}

const CommentModal = ({
    open,
    onSubmit,
    onCancel,
    title = "Comment Required",
    description = "Please add a comment before performing this action.",
    isLoading = false,
    label = "COMMENT *",
}: CommentModalProps) => {
    const [comment, setComment] = useState("");

    const handleSubmit = () => {
        if (!comment.trim()) return;
        onSubmit(comment.trim());
        setComment("");
    };

    const handleCancel = () => {
        setComment("");
        onCancel();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl w-full"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <Typography variant="h4" className="font-semibold text-gray-900 mb-2">
                    {title}
                </Typography>
                <Typography variant="bodySmall" className="text-gray-600 mb-4">
                    {description}
                </Typography>
                <div className="mb-4">
                    <label className="text-xs text-gray-500 uppercase mb-1 block">
                        {label}
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter your comment..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={4}
                        autoFocus
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <Button onClick={handleCancel} size="sm" bgColor="disabled">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        size="sm"
                        bgColor="primary"
                        disabled={!comment.trim() || isLoading}
                    >
                        {isLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Submit & Continue"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CommentModal;
