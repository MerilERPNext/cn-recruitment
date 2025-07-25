import { Plus } from "lucide-react";
import FrappeListView from "../../ListView";
import AttendanceRequestCard from "./AttendanceRequestCard";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useMemo, useState } from "react";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import LayoutHeader from "../../shared/LayoutHeader";

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
        <LayoutHeader tab="Attendance Request" />

        {showForm ? <AttndanceRequestForm onClose={() => { setShowForm(false) }} /> :
            <div className="bg-white h-screen">
                <FrappeListView
                    doctype="Attendance Request"
                    isSearch={false}
                    ItemComponent={(props: { item: any }) => {
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
        <button className={`fixed bottom-10 right-5 rounded-full bg-black text-white p-4 z-10 transition duration-150 ease-in-out ${showForm ? "rotate-45" : ""}`}
            onClick={() => {
                setShowForm(!showForm)
            }}
        ><Plus /></button>
    </>
    )
}

export default AttendanceRequest
