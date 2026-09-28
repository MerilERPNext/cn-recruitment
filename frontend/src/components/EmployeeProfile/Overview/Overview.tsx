import { useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { ScrollTabs } from "../../shared/molecules/ScrollTabs";
import TwoLevelOrgChart from "../../ORGChart/OrgnazationChartForTwoLavel";
import ProfileSummary from "./ProfileSummary";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import Emergency from "./Emergency";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MobileProfileBreadcrumbs } from "../MobileTabDropdown";

const Overview = () => {
    const { isDesktop } = useScreenSize();
    const { data: userUiPermission } = useGetUiPermission("Profile");

    const tabs = [
        { key: "personal-summary", label: "Profile Summary", permissionKey: "show_personal_summary" },
        { key: "emergency-contact", label: "Emergency Contact", permissionKey: "show_emergency_tab" },
        { key: "org-chart", label: "Organizational Chart", permissionKey: "show_org_chart" },
    ];
    const tabeContent = {
        "personal-summary": <ProfileSummary />,
        "org-chart": <TwoLevelOrgChart />,
        "emergency-contact": <Emergency />,
    }
    const permittedTabs = tabs?.filter((tab) => {
        if (tab.permissionKey) {
            return isActionEnabled(
                userUiPermission,
                tab.permissionKey,
                "Employee Profile",
            );
        }
        return true;
    })

    const [activeTab, setActiveTab] = useState<string>("personal-summary");

    return (
        <div>
            {isDesktop ? (
                <>
                    {/* Header */}
                    <div className="px-0 md:px-6 py-3 md:py-6">
                        <Typography variant="h4" className="font-bold text-gray-900 mb-1 text-xl sm:text-2xl">
                            Overview
                        </Typography>
                        <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
                            Employee Overview
                        </Typography>
                    </div>

                    <ScrollTabs
                        tabs={permittedTabs}
                        stickyTopClassName="top-[114px] md:top-14"
                        offsetClassName="scroll-mt-[160px]"
                        renderSection={(tab: { key: string, label: string }) => (
                            <>
                                {tabeContent[tab.key as keyof typeof tabeContent]}
                            </>
                        )}
                    />
                </>
            ) : (
                <>
                    <MobileProfileBreadcrumbs
                        prefixLabel="Overview"
                        subSectionOptions={permittedTabs}
                        selectedSubSection={activeTab}
                        onSubSectionChange={(key) => setActiveTab(key)}
                        stickyTopClass="top-[105px]"
                        zIndex={20}
                    />
                    <div className="px-4 py-3">
                        {tabeContent[(permittedTabs.find(t => t.key === activeTab)?.key || permittedTabs[0]?.key) as keyof typeof tabeContent]}
                    </div>
                </>
            )}
        </div>
    );
};
export default Overview;
