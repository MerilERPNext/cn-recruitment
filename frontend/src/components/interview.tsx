 
import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from 'react-router-dom';


const InterviewPage = () => {
  const navigate = useNavigate();
  const handleGoToInterview = () => {
    navigate('/webapp/recruitment-app/interview-details');
  };
  // const handleInterviewFeedback = () => {
  //   navigate('/recruitment/interview-feedback-form');
  // };


  return (
    <div className="bg-[var(--neutral-bg)] min-h-screen font-sans" style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}>
      <div className="flex flex-col min-h-screen">


        <main className=" space-y-6 flex-grow">
          {/* Upcoming Interviews */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[var(--secondary-color)] text-lg font-semibold">Upcoming Interviews</h2>
              {/* <div
               className={`text-xs font-medium px-3 py-1 rounded-md border text-blue-600 cursor-pointer hover:bg-gray-400 transition`}
                >
               View All
               </div> */}


            </div>

            {[{
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Sarah Chen',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'John Doe',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'David Lee',
              time: '11:30 AM - 12:30 PM',
              interviewer: 'Jane Smith',
              color: 'text-green-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa1-ilepcBimMig7CbVB03_yTNIoebNfySUdiI4h5nbH1BuJcJdNClgbXcqttUaufttkBcKwWQpCjsR485ll495MctYFgIVMSRPnhcxH7SocJf5ik1mffXNQ3aLLfoxrAFBDq-r2nbaKgjfXbu5ijq9aIT7uOfuIPwPfy_K95jK3DxUr4Ji_5xATEypx8Gz5ZnYmdCok4uvjrjs-76vG2FkvumGCIvmvA5N5gJwS1cWl7TNHvamW4kAfgIpccaUecSTAq5z5rb6wMj'
            }, {
              name: 'Emily Wong',
              time: '2:00 PM - 3:00 PM',
              interviewer: 'Alex Johnson',
              color: 'text-purple-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk_QB7e_HlZDFTNnWVlG9B2NBUuPJV5cYSeF2dD9M5-1638AJ1SiG8WfQDmH7acSgzyCuS-bw6bk-7P3PIuXjbA4uWLGDqK3ynO95z8AigPnXLjq8nmgaZJYXgKoTVbmXKqpFLfvVqHQs6Tu7yOd8jLEVbhWadfoOMXH1go0anMejJ0a9Ert1Tdnfx7aBVffDYPvO3ZrwsgUMZJU_uaGqava5jWDLzjbYjW09tYBRbXYWUi0koHa2nNl-EfOjvjP4VTIbCmTmQGy0A'
            }].map((interview, idx) => (
              <div
                key={idx}

                className="flex items-center gap-3 bg-white p-3 mt-1 rounded-xl border hover:shadow-md transition-shadow cursor-pointer"
              >
                <img alt={interview.name} className="rounded-full h-12 w-12 object-cover" src={interview.img} />
                <div
                  onClick={handleGoToInterview}
                  className="flex-grow">
                  <p className="text-[var(--secondary-color)] text-base font-medium">{interview.name}</p>
                  <p className="text-[var(--secondary-color)] text-sm">{interview.time}</p>
                  <p className={`text-xs font-medium ${interview.color}`}>Interviewer:{interview.interviewer}</p>
                </div>
                <button className={`text-xs font-medium text-[var(--secondary-color)]`}><IoIosArrowForward /></button>
                {/* <div
                  className={`cursor-pointer px-3 py-1 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition ${interview.color}`}
                  onClick={handleInterviewFeedback}
                >
                  Feedback
                </div> */}

              </div>
            ))}
          </section>

        </main>

        
      </div>
    </div>
  );
};

export default InterviewPage;
