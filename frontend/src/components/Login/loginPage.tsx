"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useFrappeAuth } from "frappe-react-sdk";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";
import logo from "../../assets/logo.png";

/* eslint-disable @typescript-eslint/no-explicit-any */
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { currentUser, login, error, isValidating } = useFrappeAuth();
  const navigate = useNavigate();

  // ✅ Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate("/webapp");
    }
  }, [currentUser, navigate]);

  // ✅ Handle authentication errors from the SDK
  useEffect(() => {
    if (error && !isLoggingIn) {
      const msg = getErrorMessage(error);
      toast.error(msg);
    }
  }, [error, isLoggingIn]);

  // Helper function to extract error message
  const getErrorMessage = (err: any): string => {
    if (err?.message) return err.message;
    if (err?.exc_type) return err.exc_type;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.exception) return err.exception;

    if (typeof err === "string" && err.toLowerCase().includes("password")) {
      return "Incorrect email or password";
    }

    return "Authentication failed. Please check your credentials.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    // ✅ Frontend validations
    if (!username) {
      toast.error("Email is required");
      setIsLoggingIn(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(username)) {
      toast.error("Enter a valid email address");
      setIsLoggingIn(false);
      return;
    }
    if (!password) {
      toast.error("Password is required");
      setIsLoggingIn(false);
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setIsLoggingIn(false);
      return;
    }

    try {
      const result = await login({ username, password });

      if (result) {
        toast.success("Login successful");
        navigate("/webapp");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      const errorMessage = getErrorMessage(err);
      if (!error || JSON.stringify(error) !== JSON.stringify(err)) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isSubmitDisabled = isValidating || isLoggingIn;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* 🔹 Header with PW logo */}
      <header className="w-full gap-2  bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center">
        <img
          src={logo} // <-- place pw-logo.png inside /public
          alt="PW Logo"
          className="h-10 w-auto"
        />
 <div className="flex flex-col">
 <h2 className="font-semibold text-gray-900 whitespace-nowrap">
              physics wallah
              </h2>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                Employee Portal
              </p>
 </div>
      </header>

      {/* 🔹 Login Card */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold mb-1 text-gray-900 text-balance">
            Sign in
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Use your email and password
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-gray-800"
                htmlFor="email"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-60"
                disabled={isSubmitDisabled}
                autoComplete="username"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-gray-800"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 pr-16 text-sm placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-60"
                  disabled={isSubmitDisabled}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-black hover:text-gray-800 px-2 py-1"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitDisabled}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-black text-white text-base font-semibold 
              hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-80 transition-colors"
              disabled={isSubmitDisabled}
            >
              {isSubmitDisabled ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
