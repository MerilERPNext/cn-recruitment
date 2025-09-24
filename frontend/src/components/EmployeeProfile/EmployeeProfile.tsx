import React, { useRef, useState } from "react";

// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import { Pencil } from "lucide-react";
import defaultProfile from "../../assets/user.png";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

const EmployeeProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  const mobileLayout = (
    <div className="bg-white font-sans scroll-smooth">
      <div className="bg-white shadow">
        <HeaderBar title="My Profile" onBack={() => navigate(-1)} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          id="upload-image"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <img
              src={uploadedImage || user?.image || defaultProfile}
              alt="User avatar"
              className="w-24 h-24 rounded-xl object-cover"
            />
            <button
              onClick={handleImageClick}
              className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow focus:outline-none"
              aria-label="Upload new avatar"
            >
              <Pencil size={16} />
            </button>
          </div>
          <h1 className="mt-4 text-xl font-semibold">{user?.employee_name}</h1>
          <p className="text-gray-500 mt-1">{user?.designation}</p>
          <p className="text-gray-400 text-sm">Employee ID: {user?.employee}</p>
        </div>
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="My Profile">
      <div className="flex h-full bg-gray-50">
        {/* Profile Sidebar */}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
              test
            </div>
          </div>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default EmployeeProfile;
