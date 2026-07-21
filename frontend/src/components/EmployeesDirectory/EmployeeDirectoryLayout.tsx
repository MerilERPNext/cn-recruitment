import React, { useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import EmployeeDirectoryContent from "./EmployeeDirectoryContent";

const EmployeeDirectoryLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<'directory' | 'my_reportees'>('directory');

  const tabs = (
    <div className="flex border-b border-gray-200 mb-2 px-4 md:px-0 bg-white md:bg-transparent">
      <button
        onClick={() => setActiveTab('my_reportees')}
        className={`px-4 py-3 text-sm font-semibold uppercase tracking-wider ${activeTab === 'my_reportees' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
      >
        My Reportees
      </button>
      <button
        onClick={() => setActiveTab('directory')}
        className={`px-4 py-3 text-sm font-semibold uppercase tracking-wider ${activeTab === 'directory' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
      >
        Directory
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Employee Directory">
        <div className="flex justify-center h-full w-full">
          <div className="flex flex-col gap-2 w-full p-4">
            {tabs}
            <div className={activeTab === 'my_reportees' ? 'contents' : 'hidden'}>
              <EmployeeDirectoryContent activeTab="my_reportees" />
            </div>
            <div className={activeTab === 'directory' ? 'contents' : 'hidden'}>
              <EmployeeDirectoryContent activeTab="directory" />
            </div>
          </div>
        </div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title="Employee Directory" />
        {tabs}
      </header>

      <main className="flex-grow flex flex-col gap-2 p-4">
        <div className={activeTab === 'my_reportees' ? 'contents' : 'hidden'}>
          <EmployeeDirectoryContent activeTab="my_reportees" />
        </div>
        <div className={activeTab === 'directory' ? 'contents' : 'hidden'}>
          <EmployeeDirectoryContent activeTab="directory" />
        </div>
      </main>
    </div>
  );
};

export default EmployeeDirectoryLayout;
