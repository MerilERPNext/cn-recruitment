import { useCallback, useMemo, useRef, useState } from "react";
import { UploadCloud, X, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";

// One uploaded resume → one created candidate row.
export interface UploadedResume {
  fileName: string;
  fileUrl: string;
  fileId?: string;
}

interface BulkResumeUploadModalProps {
  open: boolean;
  onClose: () => void;
  // Uploads a single file and resolves with Frappe's { file_url, name }.
  uploadFile: (file: File) => Promise<{ file_url?: string; name?: string }>;
  // Called after all files finish; receives only the successfully-uploaded ones.
  onUploaded: (results: UploadedResume[]) => void;
  // File names already present in the table — used to skip duplicates.
  existingFileNames?: string[];
}

const ALLOWED_EXT = [".pdf", ".doc", ".docx"];
const ACCEPT = ALLOWED_EXT.join(",");

type Status = "pending" | "uploading" | "done" | "error";

interface Item {
  key: string;
  file: File;
  status: Status;
  error?: string;
}

const isAllowed = (name: string) =>
  ALLOWED_EXT.some((ext) => name.toLowerCase().endsWith(ext));

const keyOf = (f: File) => `${f.name}__${f.size}`;

const BulkResumeUploadModal = ({
  open,
  onClose,
  uploadFile,
  onUploaded,
  existingFileNames = [],
}: BulkResumeUploadModalProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const existing = useMemo(
    () => new Set(existingFileNames.map((n) => n.toLowerCase())),
    [existingFileNames]
  );

  const reset = useCallback(() => {
    setItems([]);
    setRejected([]);
    setUploading(false);
    setDragOver(false);
  }, []);

  const close = useCallback(() => {
    if (uploading) return; // don't close mid-upload
    reset();
    onClose();
  }, [uploading, reset, onClose]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const badTypes: string[] = [];
      setItems((prev) => {
        const seen = new Set(prev.map((i) => keyOf(i.file)));
        const next = [...prev];
        for (const file of incoming) {
          if (!isAllowed(file.name)) {
            badTypes.push(file.name);
            continue;
          }
          const k = keyOf(file);
          // Duplicate within the selection or already in the table → skip.
          if (seen.has(k) || existing.has(file.name.toLowerCase())) continue;
          seen.add(k);
          next.push({ key: k, file, status: "pending" });
        }
        return next;
      });
      if (badTypes.length) {
        setRejected((prev) => [...prev, ...badTypes]);
      }
    },
    [existing]
  );

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const pending = items.filter((i) => i.status === "pending" || i.status === "error");
  const doneCount = items.filter((i) => i.status === "done").length;

  const handleUpload = async () => {
    const toUpload = items.filter((i) => i.status === "pending" || i.status === "error");
    if (!toUpload.length || uploading) return;

    setUploading(true);
    const results: UploadedResume[] = [];

    for (const item of toUpload) {
      setItems((prev) =>
        prev.map((i) => (i.key === item.key ? { ...i, status: "uploading", error: undefined } : i))
      );
      try {
        const res = await uploadFile(item.file);
        if (!res?.file_url) throw new Error("No file URL returned");
        results.push({ fileName: item.file.name, fileUrl: res.file_url, fileId: res.name });
        setItems((prev) =>
          prev.map((i) => (i.key === item.key ? { ...i, status: "done" } : i))
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setItems((prev) =>
          prev.map((i) =>
            i.key === item.key ? { ...i, status: "error", error: message } : i
          )
        );
      }
    }

    setUploading(false);
    if (results.length) onUploaded(results);

    // Close automatically only when everything succeeded.
    const anyLeft = results.length !== toUpload.length;
    if (!anyLeft) {
      reset();
      onClose();
    }
  };

  const StatusIcon = ({ status }: { status: Status }) => {
    if (status === "uploading") return <Loader2 className="size-4 animate-spin text-blue-500" />;
    if (status === "done") return <CheckCircle2 className="size-4 text-emerald-500" />;
    if (status === "error") return <AlertCircle className="size-4 text-red-500" />;
    return <FileText className="size-4 text-gray-400" />;
  };

  return (
    <Modal size="md" isOpen={open} onClose={close}>
      <div className="space-y-4 p-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Bulk Upload Resumes</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Each uploaded resume creates one pre-screened candidate row. PDF, DOC and DOCX only.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <UploadCloud className="size-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            Drag &amp; drop resumes here, or{" "}
            <span className="font-medium text-primary">Browse Files</span>
          </p>
          <p className="text-[11px] text-gray-400">PDF, DOC, DOCX · multiple files supported</p>
        </div>

        {/* Hidden picker — kept as a sibling of the drop zone so the drop zone's
            onClick doesn't bubble from the input's own click. */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Unsupported files warning */}
        {rejected.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Skipped unsupported file{rejected.length > 1 ? "s" : ""}: {rejected.join(", ")}
            </span>
          </div>
        )}

        {/* Selected files */}
        {items.length > 0 && (
          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5"
              >
                <StatusIcon status={item.status} />
                <span className="flex-1 truncate text-xs text-gray-700" title={item.file.name}>
                  {item.file.name}
                </span>
                {item.status === "error" && (
                  <span className="text-[11px] text-red-500">{item.error}</span>
                )}
                {!uploading && item.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-gray-500">
              <span>Uploading…</span>
              <span>
                {doneCount}/{items.length}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded bg-primary transition-all"
                style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={close} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contain"
            size="sm"
            onClick={handleUpload}
            disabled={uploading || pending.length === 0}
          >
            {uploading ? "Uploading…" : `Upload ${pending.length || ""}`.trim()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkResumeUploadModal;
