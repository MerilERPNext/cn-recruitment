import { useScreenSize } from "../hooks/useScreenSize";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";
import { ThemeSettingsContent } from "./ThemeCustomizer";

// Dedicated Theme Settings page (route: /webapp/theme-settings).
// Hosts all theming controls — appearance (light/dark/system) + brand colors.
const ThemeSettingsPage = () => {
  const { isDesktop } = useScreenSize();

  const content = (
    <div className="p-4 md:p-6">
      <ThemeSettingsContent />
    </div>
  );

  if (isDesktop) {
    return <DesktopLayoutWrapper title="Theme Settings">{content}</DesktopLayoutWrapper>;
  }

  return (
    <div className="min-h-screen bg-app">
      <div className="px-1 py-3">
        <h1 className="text-xl font-extrabold text-gray-900 mb-2 px-3">Theme Settings</h1>
        {content}
      </div>
    </div>
  );
};

export default ThemeSettingsPage;
