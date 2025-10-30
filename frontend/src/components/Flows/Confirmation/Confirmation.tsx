import { FaCheckCircle } from "react-icons/fa";
import { MdInbox } from "react-icons/md";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";

const ConfirmationWorkflow = () => {
  const employeeData = {
    name: "Yogesh Jain",
    joiningDate: "01-10-2021",
    probationEndDate: "01-10-2021",
    status: "Auto Confirmed",
  };

  const events = [
    {
      status: "Completed",
      eventDetails: "Date of Joining",
      date: "01-10-2021",
    },
    {
      status: "Completed",
      eventDetails: "Probation confirmation due in 0 Day(s) from joining date",
      date: "01-10-2021",
    },
  ];

  return (
    <DesktopLayoutWrapper title="Confirmation">
    <div className=" bg-white  min-h-screen  p-8  text-gray-800  font-sans">
      {/* Header */}
      <div className=" flex  justify-between  items-start  mb-6">
        <div>
          <h2 className=" font-semibold  text-lg">
            {employeeData.name}'s Confirmation Workflow
          </h2>
          <div className=" text-sm  mt-2">
            <p>
              <span className=" font-semibold">Date of Joining :</span>{" "}
              {employeeData.joiningDate}
            </p>
            <p className=" mt-1">
              <span className=" font-semibold">Status :</span>{" "}
              {employeeData.status}
            </p>
          </div>
        </div>

        <div className=" text-sm">
          <p>
            <span className=" font-semibold">Probation End date :</span>{" "}
            {employeeData.probationEndDate}
          </p>
        </div>
      </div>

      {/* Table Header */}
      <div className=" grid  grid-cols-3  border-b  bg-gray-100  text-sm  font-semibold  px-4  py-2">
        <div>STATUS</div>
        <div>EVENT DETAILS</div>
        <div>DATE</div>
      </div>

      {/* Table Rows */}
      {events.map((event, index) => (
        <div
          key={index}
          className=" grid  grid-cols-3  items-center  border-b  text-sm  px-4  py-2 hover: bg-gray-50"
        >
          <div className=" flex  items-center  gap-2">
            <FaCheckCircle className=" text-green-500" />
            <span className=" font-medium">{event.status}</span>
          </div>
          <div>{event.eventDetails}</div>
          <div>{event.date}</div>
        </div>
      ))}

      {/* Empty Review Section */}
      <div className=" flex  flex-col  items-center  justify-center  mt-16">
        <MdInbox className=" text-blue-400  text-7xl  mb-4" />
        <p className=" text-gray-600  text-lg">
          No ongoing review for Employee
        </p>
      </div>
    </div>
    </DesktopLayoutWrapper>
  );
};

export default ConfirmationWorkflow;
