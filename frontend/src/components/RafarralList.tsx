/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../index.css";
import {
  MdChevronRight,
  MdHourglassEmpty,
  MdEvent,
  MdCheckCircleOutline,
  MdCancel
} from 'react-icons/md';
import FrappeListView from './ListView';

interface Referral {
  name: string;
  full_name: string;
  email: string;
  date: string;
  status: string;
  for_designation: string;
}



const ReferralList: React.FC = () => {
  const navigate = useNavigate();
  const handleClick = (referralId: string) => {
    navigate(`/webapp/recruitment-app/referral-details/${referralId}`);
  };

  console.log('NotificationToken', window.nativeInterface.execute('getPushToken').then((x: any) => { window.nativeInterface.logToNative(x); }));

  return (
    <FrappeListView
      doctype="Employee Referral"
      ItemComponent={ReferralItem}
      isSearch={true}
      pageSize={10}
      defaultFields={['name', 'full_name', 'email', 'date', 'status', 'for_designation']}
      searchFields={['full_name', 'email', 'for_designation', 'status']}
      onItemClick={(item: Referral) => {
        handleClick(item.name)
      }}
      infiniteScroll={true}
    />
  );
};


const ReferralItem: React.FC<{ item: Referral, index: number }> = ({ item, index }) => {
  const referral = item;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { icon: <MdHourglassEmpty />, color: 'text-yellow-500' };
      case 'interview scheduled':
        return { icon: <MdEvent />, color: 'text-blue-500' };
      case 'accepted':
        return { icon: <MdCheckCircleOutline />, color: 'text-green-500' };
      case 'rejected':
        return { icon: <MdCancel />, color: 'text-red-500' };
      default:
        return { icon: <MdHourglassEmpty />, color: 'text-gray-500' };
    }
  };

  const { icon, color } = getStatusIcon(referral?.status || '');
  console.log(referral,"hello archu this data of raferral")
  return (
    <div
      key={index}
      className="flex items-center gap-3 bg-[var(--background-light)] p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow border hover:border-[var(--border-light)] cursor-pointer"
    >
      <div className="flex-grow min-w-0">
        <p className="text-[var(--text-primary)] text-base font-medium leading-tight line-clamp-1">
          {referral?.full_name}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Email: {referral?.email}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Designation: {referral?.for_designation}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Submitted: {referral?.date}</p>
        <div className="flex items-center text-xs text-[var(--text-secondary)] mt-1">
          <span className={`text-sm mr-1 ${color}`}>{icon}</span>
          <span>Status: {referral?.status}</span>
        </div>
      </div>
      <MdChevronRight className="text-[var(--text-secondary)]" />
    </div>
  );
}

export default ReferralList;
