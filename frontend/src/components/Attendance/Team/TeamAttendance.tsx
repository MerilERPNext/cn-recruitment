import LayoutHeader from "../../shared/LayoutHeader"
import DatePicker from "react-datepicker"
import EmployeeStatusCard from "./EmployeeStatusCard"

const TeamAttendance = () => {

    return <div className="bg-gray-100">
        <LayoutHeader tab="Team Attendance" />
        <div className="flex flex-col gap-4 mt-2 px-4 pb-4">
            <h1 className="text-2xl font-semibold">Team Attendance</h1>
            {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}
            <div className="bg-white w-full border-2 border-gray-200 rounded-xl">
                <DatePicker inline />
            </div>
            {/* ------------------------------------------------- Calendar End ---------------------------------------------- */}

            <EmployeeStatusCard />

        </div>
    </div >

}

export default TeamAttendance
