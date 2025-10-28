/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useUpdatePasswordViaKey } from "../../hooks/useResetPassword";
import toast from "react-hot-toast";

export default function PasswordReset() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const mutation = useUpdatePasswordViaKey();

  // ✅ extract key from URL
  const queryParams = new URLSearchParams(window.location.search);
  const key = queryParams.get("key") || "";

  // ✅ Password validation helper
  const validatePassword = (password: string) => {
    if (!password) return "Password is required.";
    if (password.length < 8)
      return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password))
      return "Password must include at least one uppercase letter.";
    if (!/[a-z]/.test(password))
      return "Password must include at least one lowercase letter.";
    if (!/[0-9]/.test(password))
      return "Password must include at least one number.";
    if (!/[!@#$%^&*(),.?\\":{}|<>]/.test(password))
      return "Password must include at least one special character.";
    return "";
  };

  const handleSubmit = () => {
    const newPasswordError = validatePassword(newPassword);
    const confirmPasswordError =
      confirmPassword !== newPassword
        ? "Passwords do not match."
        : validatePassword(confirmPassword);
  
    setErrors({
      newPassword: newPasswordError,
      confirmPassword: confirmPasswordError,
    });
  
    // ❌ If there are validation errors — show toast + refresh after 2 seconds
    if (newPasswordError || confirmPasswordError) {
      toast.error("Please fix the highlighted errors and try again.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      return;
    }
  
    // ✅ Submit the mutation
    mutation.mutate(
      { key, new_password: newPassword },
      {
        onSuccess: (data) => {
          toast.success("Password reset successfully!");
          console.log("Response:", data);
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => {
            window.location.reload(); // refresh after successful submission too
          }, 2000);
        },
        onError: (error: any) => {
          toast.error("Failed to reset password!");
          console.error(error);
          setTimeout(() => {
            window.location.reload(); // refresh on API error as well
          }, 2000);
        },
      }
    );
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 border-b border-gray-200 bg-white">
        <nav>
          <a
            href="/webapp/"
            className="text-gray-700 font-semibold hover:text-gray-900"
          >
            Home
          </a>
        </nav>
        <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">A</span>
        </div>
      </header>

      {/* Main Content */}
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

          {/* Heading */}
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Reset your password
          </h2>
          <p className="text-center text-gray-500 mb-8">
            Create a new, strong password that you don't use for other websites.
          </p>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-6">
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
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.newPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-600"
                    } bg-gray-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.confirmPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-600"
                    } bg-gray-50`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={
                  mutation.isPending ||
                  !newPassword ||
                  !confirmPassword ||
                  !!errors.newPassword ||
                  !!errors.confirmPassword
                }
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

