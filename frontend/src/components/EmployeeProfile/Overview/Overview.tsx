import { Typography } from "../../shared/atoms/Typography";
import { ScrollTabs } from "../../shared/molecules/ScrollTabs";
import TwoLevelOrgChart from "../../ORGChart/OrgnazationChartForTwoLavel";
import ProfileSummary from "./ProfileSummary";

const Overview = () => {


    const tabs = [
        { key: "personal-summary", label: "Personal Summary" },
        { key: "org-chart", label: "Organizational Chart" },
    ];
    const tabeContent = {
        "personal-summary": <ProfileSummary />,
        "org-chart": <TwoLevelOrgChart />,
    }

    return (
        <div>
            {/* Header */}
            <div className="px-0 md:px-6 py-6">
                <Typography variant="h3" className="font-bold text-gray-900 mb-1">
                    Overview
                </Typography>
                <Typography variant="bodyMedium" color="body2">
                    Employee Overview
                </Typography>
            </div>

            <ScrollTabs
                tabs={tabs}
                renderSection={(tab: { key: string, label: string }) => (
                    <>
                        {tabeContent[tab.key as keyof typeof tabeContent]}
                    </>
                )}
            />
        </div>
    );
};
export default Overview;
