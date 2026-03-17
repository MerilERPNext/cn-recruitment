import { Paperclip } from "lucide-react";
import { Typography } from "../../shared/atoms/Typography";
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";

interface Attachment {
  storage: string;
  name: string;
  url: string;
  size: number;
  type: string;
  originalName: string;
  data?: {
    message?: {
      file_url?: string;
    };
    baseUrl?: string;
  };
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-gray-500" />
        <Typography variant="bodySmall" className="font-semibold text-gray-700">
          Attachments ({attachments.length})
        </Typography>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment, index) => {
          const fileUrl = attachment.data?.message?.file_url 
            ? (attachment.data.baseUrl || "") + attachment.data.message.file_url
            : attachment.url;

          return (
            <AttachmentCard
              key={index}
              fileUrl={fileUrl}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AttachmentPreview;
