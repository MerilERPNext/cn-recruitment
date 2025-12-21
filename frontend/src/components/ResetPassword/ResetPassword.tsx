/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  useUpdatePasswordViaKey,
  useUpdatePasswordValidation,
} from "../../hooks/useResetPassword";
import toast from "react-hot-toast";

export default function PasswordReset() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // mutations
  const mutation = useUpdatePasswordViaKey();
  const validationMutation = useUpdatePasswordValidation();

  // key from URL
  const queryParams = new URLSearchParams(window.location.search);
  const key = queryParams.get("key") || "";

  const handleSubmit = () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 🔹 Step 1: Password validation API
    validationMutation.mutate(
      { new_password: newPassword },
      {
        onSuccess: (res: any) => {
          /**
           * Expected API response structure:
           * res.feedback.password_policy_validation_passed
           * res.feedback.warning
           * res.feedback.suggestions
           */

          const feedback = res?.feedback;
          const isValid =
            feedback?.password_policy_validation_passed === true;

          // ❌ Password policy failed
          if (!isValid) {
            const warning = feedback?.warning || "";
            const suggestions: string[] =
              feedback?.suggestions || [];

            // show alert / toast
            if (warning) {
              toast.error(warning);
            }

            if (suggestions.length > 0) {
              toast(
                suggestions.join("\n"),
                { icon: "⚠️" }
              );
            }

            setError(
              warning ||
                "Password does not meet security requirements."
            );
            return; // ⛔ stop here
          }

          // ✅ Step 2: Reset password API (ONLY if validation passed)
          mutation.mutate(
            { key, new_password: newPassword },
            {
              onSuccess: () => {
                toast.success("Password reset successfully!");
                setNewPassword("");
                setConfirmPassword("");
                if(res?.success === true){
                  (window.location.href = "/login?redirect-to=%2Fwebapp");
                }
                 
              },
              onError: () => {
                toast.error("Failed to reset password!");
              },
            }
          );
        },

        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            "Password validation failed.";
          setError(msg);
          toast.error(msg);
        },
      }
    );
  };

  const isLoading =
    mutation.isPending || validationMutation.isPending;

  return (
    <div className="min-h-screen bg-[#4F9DD9]">
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Reset your password
          </h2>

          <p className="text-center text-gray-500 mb-8">
            Enter a new password to continue.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  className="w-full pl-10 pr-10 py-2 border rounded-lg bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(!showNewPassword)
                  }
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  className="w-full pl-10 pr-10 py-2 border rounded-lg bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Confirming..." : "Confirm"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
