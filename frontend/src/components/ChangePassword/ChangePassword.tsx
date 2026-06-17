import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../shared/atoms/Button";
import CircularLoader from "../shared/atoms/CircularLoader";

// Extract a human-readable error message from a Frappe API response body.
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractFrappeError = (body: any): string => {
  try {
    if (body?._server_messages) {
      const arr = JSON.parse(body._server_messages);
      if (Array.isArray(arr) && arr.length > 0) {
        const first = JSON.parse(arr[0]);
        if (first?.message) return stripHtml(String(first.message));
      }
    }
  } catch {
    /* fall through to other fields */
  }
  if (body?.message && typeof body.message === "string") return stripHtml(body.message);
  if (body?.exception && typeof body.exception === "string") {
    return stripHtml(body.exception.split(":").slice(1).join(":").trim() || body.exception);
  }
  return "";
};

interface ChangePasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

type FieldKey = "current_password" | "new_password" | "confirm_password";

const FIELDS: { key: FieldKey; label: string; placeholder: string }[] = [
  { key: "current_password", label: "Current Password", placeholder: "Enter current password" },
  { key: "new_password", label: "New Password", placeholder: "Enter new password" },
  { key: "confirm_password", label: "Confirm Password", placeholder: "Re-enter new password" },
];

const ChangePassword: React.FC<ChangePasswordProps> = ({ isOpen, onClose }) => {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState<Record<FieldKey, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setValues({ current_password: "", new_password: "", confirm_password: "" });
    setShow({ current_password: false, new_password: false, confirm_password: false });
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const { current_password, new_password, confirm_password } = values;

    if (!current_password || !new_password || !confirm_password) {
      setError("All fields are required.");
      return;
    }
    if (new_password !== confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (new_password === current_password) {
      setError("New password must be different from the current password.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      // Call via a direct fetch (NOT FrappeAPI.callMethod) so the global axios
      // 401 interceptor — which redirects to /login — does not fire when the
      // current password is wrong. We handle the error here and stay on the page.
      const API_BASE =
        (import.meta as any).env?.VITE_API_BASE_URL || window.location.origin;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (window.csrf_token && window.csrf_token !== "{{ csrf_token }}") {
        headers["X-Frappe-CSRF-Token"] = window.csrf_token;
      }
      if (
        (import.meta as any).env?.DEV &&
        (import.meta as any).env?.VITE_DEV_FRAPPE_API_TOKEN
      ) {
        headers["Authorization"] =
          "token " + (import.meta as any).env.VITE_DEV_FRAPPE_API_TOKEN;
      }

      const res = await fetch(
        `${API_BASE}/api/method/cn_hrms_core.cn_hrms_core.apis.change_password.change_password`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ current_password, new_password }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Wrong current password / policy failure → show the API message in a
        // toast + inline, keep the popup open, do NOT redirect.
        const msg = extractFrappeError(body) || "Failed to change password.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Password changed successfully.");
      reset();
      onClose();
    } catch {
      const msg = "Something went wrong. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Card — compact */}
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Change Password</h2>
          <button
            onClick={handleClose}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block mb-1 text-sm font-semibold text-gray-700">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show[f.key] ? "text" : "password"}
                  value={values[f.key]}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [f.key]: e.target.value }));
                    if (error) setError("");
                  }}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={show[f.key] ? "Hide password" : "Show password"}
                >
                  {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <Button
            onClick={handleSubmit}
            size="md"
            fullWidth
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold"
          >
            {submitting ? <CircularLoader size="sm" color="white" /> : "Update Password"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChangePassword;
