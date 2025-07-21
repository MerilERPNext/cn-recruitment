import LayoutHeader from "../../shared/LayoutHeader"
import DatePicker from "react-datepicker"
import EmployeeStatusCard from "./EmployeeStatusCard"
import FrappeListView from "../../ListView";
import { useState } from "react";
import { useNavigate } from "react-router";

const TeamAttendance = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const navigate = useNavigate()
    return <div className="bg-gray-100">
        <LayoutHeader tab="Team Attendance" />
        <div className="flex flex-col gap-4 mt-2 px-4 pb-4">
            <h1 className="text-2xl font-semibold">Team Attendance</h1>
            {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}
            <div className="bg-white w-full border-2 border-gray-200 rounded-xl">
                <DatePicker
                    inline
                    selected={selectedDate}
                    onChange={(date) => {
                        setSelectedDate(date)
                        const filters = {
                            attendance_date: date
                        }
                        navigate("/webapp/attendance/team-attendance?filters=" + encodeURIComponent(JSON.stringify(filters)))

                    }}

                />
            </div>
            {/* ------------------------------------------------- Calendar End ---------------------------------------------- */}

            {/* <EmployeeStatusCard /> */}
            <FrappeListView
                doctype="Attendance"
                ItemComponent={(props: { item: any }) => {
                    return (
                        <EmployeeStatusCard
                            data={props?.item}
                        />
                    );
                }}
                onItemClick={() => { }}
                infiniteScroll={true}
                isFilter={false}
                defaultFields={[
                    '*'
                ]}

            />

        </div>
    </div >

}

export default TeamAttendance
