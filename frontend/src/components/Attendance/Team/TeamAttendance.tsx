import LayoutHeader from "../../shared/LayoutHeader"
import DatePicker from "react-datepicker"
import EmployeeStatusCard from "./EmployeeStatusCard"
import FrappeListView from "../../ListView";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";

const TeamAttendance = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)


    const [searchParams] = useSearchParams()

    // Parse filters from URL on mount
    useEffect(() => {
        const filtersParam = searchParams.get("filters")
        if (filtersParam) {
            try {
                const filters = JSON.parse(decodeURIComponent(filtersParam))
                if (filters.attendance_date) {
                    setSelectedDate(new Date(filters.attendance_date))
                }
            } catch (err) {
                console.error("Invalid filter format in URL")
            }
        }
    }, [searchParams])

    const clearFilters = () => {
        setSelectedDate(null)
        navigate("/webapp/attendance/team-attendance") // Remove query entirely
    }

    const hasFilters = searchParams.has("filters")

    const navigate = useNavigate()
    return <div className="bg-gray-100">
        <LayoutHeader tab="Team Attendance" />
        <div className="flex flex-col gap-4 mt-2 px-4 pb-4">
            <h1 className="text-2xl font-semibold">Team Attendance</h1>
            {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}
            <div className="bg-white w-full border-2 border-gray-200 rounded-xl p-2 flex items-end flex-col">


                <DatePicker
                    inline
                    selected={selectedDate}
                    onChange={(date) => {
                        if (!date) return
                        setSelectedDate(date)
                        const filters = {
                            attendance_date: date,
                        }
                        navigate(
                            "/webapp/attendance/team-attendance?filters=" +
                            encodeURIComponent(JSON.stringify(filters))
                        )
                    }}
                />
                {/* Clear Button */}
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="top-2 right-2 text-gray-500 hover:text-black transition"
                        title="Clear Filters"
                    >
                        Clear Filters
                    </button>
                )}
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
