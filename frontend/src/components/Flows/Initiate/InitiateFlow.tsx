import {  Search, X } from 'lucide-react';
import React from 'react'
import RequestTypeCard from './RequestTypeCard';
import HeaderBar from '../../HeaderBar';
import { useNavigate, useLocation } from 'react-router-dom';

const data: Record<string, string[]> = {
  "Business Flows": [
    "Absconding management",
    "BANK ACCOUNT CHANGE",
    "Car lease Flow",
    "CAR LEASE FLOW_101",
    "Confirmation Workflow test(Anam)",
    "Confirmation Workflow test new",
    "Marriage flow umar",
    "Test_Com",
  ],
  "Employee Movements": ["Declaration Test 1"],
  "Other Category": [
    "Abcde",
    "abc testing cwf",
    "Confirmation Workflow 2",
    "Test Appointment Letter CWF",
    "Test CWF",
    "Test Vibe CWF",
  ],
};


interface InitiateFlowProps{
  openAsModel: boolean;
  handleCloseModel?: ()=> void;
}

const InitiateFlow : React.FC<InitiateFlowProps> = ({
  openAsModel = false,
  handleCloseModel = ()=> void(0)
}) => {
   const navigate = useNavigate();
  const location = useLocation();

  const handlGoBack = ()=>{
    if(location.key === 'default'){
        navigate("/webapp/flow-app/flow-requests");
        return;
    }

    navigate(-1);
  }

  return (
    <div className={` bg-white fixed w-screen h-screen top-0 left-0 z-40`}>
        {openAsModel ?             
          <><div className="flex items-center sm:px-8 px-4 pt-4">
            <h2 className="text-lg font-semibold ">Initiate Flow</h2>
            <X onClick={handleCloseModel} className="ml-auto  w-8 h-8 p-1 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer"/>
          </div>
          <hr className="my-4" />
          </>
          :
          (<HeaderBar
              title={"Initiate Flow"}
              onBack={handlGoBack}
             />)
        }
        <div className='sm:px-8 px-4'>
         <div className="relative mt-2 w-full max-w-[48rem]">
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 cursor-pointer  border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-6 space-y-8">
            <h3>Business Flows : </h3>
            <div className="flex flex-wrap gap-4">
                {data["Business Flows"].map((flow) => <RequestTypeCard key={flow} label={flow} />)}
            </div>

            <h3>Other Category : </h3>
            <div className="flex flex-wrap gap-4">
              {data["Other Category"].map((flow) => <RequestTypeCard key={flow} label={flow} />)}
            </div>
          </div>
          </div>
    </div>
  )
}

export default InitiateFlow