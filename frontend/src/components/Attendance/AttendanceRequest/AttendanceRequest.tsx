import { Plus } from "lucide-react";
import FrappeListView from "../../ListView";
import LayoutHeader from "../../shared/LayoutHeader";
import AttendanceRequestCard from "./AttendanceRequestCard";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useState } from "react";

const AttendanceRequest = () => {
    const [showForm, setShowForm] = useState(false)
    return (<>
        <LayoutHeader tab="Attendance Request" />
        <div className="p-4">

            {showForm ? <AttndanceRequestForm /> : <FrappeListView
                doctype="Attendance Request"
                isSearch={false}
                ItemComponent={(props: { item: any }) => {
                    return (
                        <AttendanceRequestCard
                            data={props?.item}
                        />
                    );
                }}
                // defaultFilters={defaultFilters}
                showRefereshButton={false}
                onItemClick={() => { }}
                infiniteScroll={true}
                isFilter={false}
                defaultFields={[
                    '*'
                ]}
            />}
            <button className={`fixed bottom-10 right-5 rounded-full bg-black text-white p-4 z-10 transition duration-150 ease-in-out ${showForm ? "rotate-45" : ""}`}
                onClick={() => {
                    setShowForm(!showForm)
                }}
            ><Plus /></button>
        </div>
    </>
    )
}

export default AttendanceRequest
