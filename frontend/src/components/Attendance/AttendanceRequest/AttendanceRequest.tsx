import { Plus } from "lucide-react";
import FrappeListView from "../../ListView";
import AttendanceRequestCard from "./AttendanceRequestCard";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useMemo, useState } from "react";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { AttendanceRequest as AttendanceRequestType } from "../../../types/attendance";

const AttendanceRequest = () => {
    const { data: userId } = useLoggedInUser();
    const defaultFilters = useMemo(() => {
        if (!userId) return undefined;
        return { owner: userId };
    }, [userId]);


    const [showForm, setShowForm] = useState(false)


    const CardSkeleton = () => (
        <div className="rounded-xl bg-gray-100 animate-pulse">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-300 rounded"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
                </div>
            </div>
        </div>

    );
    return (<>
        {showForm ? <AttndanceRequestForm onClose={() => { setShowForm(false) }} /> :
            <div className="bg-white h-screen">
                <FrappeListView
                    doctype="Attendance Request"
                    isSearch={false}
                    ItemComponent={(props: { item: AttendanceRequestType }) => {
                        return (
                            <AttendanceRequestCard
                                data={props?.item}
                            />
                        );
                    }}
                    SkeletonComponent={CardSkeleton}
                    defaultFilters={defaultFilters}
                    showRefereshButton={false}
                    onItemClick={() => { }}
                    infiniteScroll={true}
                    isFilter={false}
                    defaultFields={[
                        "reason",
                        "modified",
                        "creation",
                        "docstatus"]}
                />
            </div>
        }
        <div className=" fixed bottom-0 w-full p-2 border-t border-gray-300 pt-4">

            <button className={`flex justify-center gap-2  w-full rounded-xl bg-black text-white py-4 px-2 z-10`}
                onClick={() => {
                    setShowForm(!showForm)
                }}
            ><Plus /> <span>Add Attendance Request</span> </button>
        </div>
    </>
    )
}

export default AttendanceRequest
