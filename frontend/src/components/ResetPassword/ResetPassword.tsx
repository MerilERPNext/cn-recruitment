/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState } from "react";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  useUpdatePasswordViaKey,
  useUpdatePasswordValidation,
} from "../../hooks/useResetPassword";
import toast from "react-hot-toast";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

export default function PasswordReset() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const mutation = useUpdatePasswordViaKey();
  const validationMutation = useUpdatePasswordValidation();
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

    //  Password validation API
    validationMutation.mutate(
      { new_password: newPassword },
      {
        onSuccess: (res: any) => {
          const feedback = res?.feedback;
          const isValid = feedback?.password_policy_validation_passed === true;
          if (!isValid) {
            const warning = feedback?.warning || "";
            const suggestions: string[] = feedback?.suggestions || [];
            if (warning) {
              toast.error(warning);
            }
            if (suggestions.length > 0) {
              toast(suggestions.join("\n"), { icon: "⚠️" });
            }

            setError(
              warning || "Password does not meet security requirements.",
            );
            return;
          }

          //  Reset password API (ONLY if validation passed)
          mutation.mutate(
            { key, new_password: newPassword },
            {
              onSuccess: () => {
                toast.success("Password reset successfully!");
                setNewPassword("");
                setConfirmPassword("");
            
              },
              onError: () => {
                toast.error("Failed to reset password!");
              },
            },
          );
        },

        onError: (err: any) => {
          const msg =
            err?.response?.data?.message || "Password validation failed.";
          setError(msg);
          toast.error(msg);
        },
      },
    );
  };

  const isLoading = mutation.isPending || validationMutation.isPending;

  return (
    <div className="min-h-screen bg-[#E8F4FC] oxygon-bg">
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4 border border-gray-100">
            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <Lock className="w-10 h-10 text-primary" />
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 mb-8">
              <Typography variant="h3" color="title">
                Reset your password
              </Typography>
              <Typography variant="bodyMedium" color="body2">
                Enter a new password to continue.
              </Typography>
            </div>

            <div className="space-y-4">
              <div>
                <Typography
                  variant="bodySmall"
                  className="block mb-1.5"
                  color="body1"
                >
                  New Password
                </Typography>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 outline-none pr-10 py-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-medium placeholder:text-gray-400 font-brand"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
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

              <div>
                <Typography
                  variant="bodySmall"
                  className="block mb-1.5"
                  color="body1"
                >
                  Confirm Password
                </Typography>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 outline-none pr-10 py-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-medium placeholder:text-gray-400 font-brand"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

              {error && (
                <div className="bg-error-50 text-error-800 p-3 rounded-lg border border-error-100 flex items-center gap-2">
                  <Typography variant="bodySmall" color="error">
                    {error}
                  </Typography>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleSubmit}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                >
                  {isLoading ? "Confirming..." : "Confirm Password"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
