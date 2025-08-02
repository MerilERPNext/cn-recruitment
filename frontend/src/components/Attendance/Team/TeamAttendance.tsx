import DatePicker from "react-datepicker"
import EmployeeStatusCard from "./EmployeeStatusCard"
import FrappeListView from "../../ListView";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";

const TeamAttendance = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())


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
        setSelectedDate(new Date())
        navigate("/webapp/attendance/team-attendance") // Remove query entirely
    }

    const hasFilters = searchParams.has("filters")

    const navigate = useNavigate()

    const CardSkeleton = () => (
        <div className="rounded-xl bg-gray-100 animate-pulse">
            <div className="px-4 py-2 flex gap-2">
                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-300 rounded"></div>
                    </div>
                </div>
            </div>
        </div>

    );

    return <div className="bg-white">

        <div className="flex flex-col gap-2 pb-4">
            {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}
            <div className=" bg-white w-full border-b-1 border-gray-200  p-2">

                <div className=" flex items-end flex-col">


                    <DatePicker
                        inline
                        selected={selectedDate}
                        onChange={(date) => {
                            if (!date) return
                            const localDateStr = date.toISOString().split("T")[0];
                            setSelectedDate(date)
                            const filters = {
                                attendance_date: localDateStr,
                            }
                            navigate(
                                "/webapp/attendance/team-attendance?filters=" +
                                encodeURIComponent(JSON.stringify(filters))
                            )
                        }}
                        dayClassName={(date) =>
                            date.toDateString() === selectedDate?.toDateString() ? "bg-blue-100" : "transparent"
                        }
                    />
                    {/* Clear Button */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="top-2 right-2 text-gray-500 hover:text-black transition"
                            title="Today"
                        >
                            Today
                        </button>
                    )}
                </div>
            </div>
            {/* ------------------------------------------------- Calendar End ---------------------------------------------- */}

            {/* <EmployeeStatusCard /> */}
            <div className="bg-white pt-4 border-gray-200 p-4 ">

                <FrappeListView
                    doctype="Attendance"
                    ItemComponent={(props: { item: any }) => {
                        return (
                            <EmployeeStatusCard
                                data={props?.item}
                            />
                        );
                    }}
                    SkeletonComponent={CardSkeleton}
                    onItemClick={() => { }}
                    infiniteScroll={true}
                    isFilter={false}
                    defaultFilters={
                        {
                            attendance_date: new Date().toISOString(),
                        }
                    }
                    showRefereshButton={false}
                    defaultFields={[
                        "employee_name",
                        "status",
                        "in_time",
                        "out_time"
                    ]}

                />
            </div>

        </div>
    </div >

}

export default TeamAttendance
