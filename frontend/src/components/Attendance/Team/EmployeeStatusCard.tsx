import Avatar from '../../shared/Avatar';

const EmployeeStatusCard = ({ data }: any) => {
    const getStatusIndicatorColor = (
        status: "present"
            | "absent"
            | "on leave"
            | "half day"
            | "work from home"
            | "default"
    ): { indicatorBgColor: string; indicatorBorderColor?: string } => {
        switch (status) {
            case "present":
                return { indicatorBgColor: "bg-green-500", indicatorBorderColor: "border-white" };
            case "absent":
                return { indicatorBgColor: "bg-red-500", indicatorBorderColor: "border-white" };
            case "on leave":
                return { indicatorBgColor: "bg-yellow-400", indicatorBorderColor: "border-white" };
            case "half day":
                return { indicatorBgColor: "bg-orange-400", indicatorBorderColor: "border-white" };
            case "work from home":
                return { indicatorBgColor: "bg-blue-400", indicatorBorderColor: "border-white" };
            default:
                return { indicatorBgColor: "bg-gray-300", indicatorBorderColor: "border-white" };
        }
    };

    const statusColors = getStatusIndicatorColor(data?.status?.toLowerCase() || "default");

    return (
        <div className="w-full border-b-2 border-gray-100 py-2 bg-white rounded-xl">
            <div className="flex gap-4 mb-2">
                <Avatar
                    name={data?.employee_name}
                    avatarBgColor="bg-indigo-100"
                    avatarTextColor="text-indigo-800"
                    {...statusColors}
                />
                <div>
                    <h5 className="font-semibold line-clamp-2">{data?.employee_name}</h5>
                    <p className="font-thin text-sm capitalize">{data?.status}</p>
                </div>
            </div>

            {(data?.in_time || data?.out_time) && (
                <div className="mb-2 w-full px-4 py-2 bg-gray-100 rounded-xl flex justify-between">
                    <div>
                        <p className="text-gray-400 text-sm text-center">Check-in</p>
                        <h5 className="font-semibold">{data?.in_time}</h5>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm text-center">Check-out</p>
                        <h5 className="font-semibold">{data?.out_time}</h5>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeStatusCard;
