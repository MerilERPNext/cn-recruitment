 
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
              name: 'Arjun Sharma',
              time: '10:00 AM - 11:00 AM',
              interviewer: 'Rajesh Kumar',
              color: 'text-blue-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1'
            },
            {
              name: 'Priya Patel',
              time: '11:15 AM - 12:15 PM',
              interviewer: 'Anita Gupta',
              color: 'text-green-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARlg8-IucoXnEsIYIeyN9EHMTNXweoRf5ETsXg-Xm4-9odowTzfa1Rd-2OBpiuLyK6aka_1sgccNF6fC0jYXN9nLiIQ6p8Tzxn7S2bw5988z8FIrsK6ZV_B1fRyAO7zkXrt05wmmWgGp__6TziNqMRIGnfeQ1vfBqmqxF6oIiOit8ce6EhxXRNJGn6vcyomPWB9TXPAhkqnRcv3Bl9X4uKJ27LsoY0CjuHrx73CjWV7lWbNTNZ4xSYL91jEynbDMe-NHmP6w3g_9N3'
            },
            {
              name: 'Vikram Singh',
              time: '1:00 PM - 2:00 PM',
              interviewer: 'Deepak Mehta',
              color: 'text-purple-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFWtQeInXYsky7NDsIIpeMhXAzcxYHT-2hkvgFObNXz_lprM3ZF2M5id6hPTVc22i5y631iL5QG8ZjZk-PzpzFDWYUkBglsLRIahrwrIMupyua-6zswy4dPTHGI95GKroufXdLqzpHiPTFjr-aIbL1DSj04oYg85Iwr3FsVl4fK-ZRkY8k7-1h7u8i6HnHccH4iBmUA4PwqKWJcPGnTvnDZvZqclW5wGy7cXQVCRJJ6djXWN6zopJzB_tzq2TgLH3W86fdHf5hjL5D'
            },
            {
              name: 'Sneha Reddy',
              time: '2:30 PM - 3:30 PM',
              interviewer: 'Suresh Nair',
              color: 'text-orange-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_xeSUO1ugCDjr_plPCzzg1Y-ISj9j7_foaFpRejFZS2LNaKoWvTg0nd-vhTOSlmVCXkkSXWDs65xc5R44TIkbljYCp2qTJSlFEwIli6LgNfOm_jNfBECNhxGbIUAIiV1xe18hB-I9GLi4VW9SkvGOjH-v_qG_E-bWgHidiDrdMH2VqqOiDkJ_QIhgJiu0aCVcxW7XfXWqy8niIEqkVO1da3syzTJZ7NFYg3rrrm2GKPQjDel6FNIEyhGoMSdwH5Z14iLJitG2tu81'
            },
            {
              name: 'Rohit Agarwal',
              time: '4:00 PM - 5:00 PM',
              interviewer: 'Kavya Sharma',
              color: 'text-red-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt-FELbIBS5TVSC3TTO57mgqbRaprRIvMJA_ApPyXsxrKThPhD1CtHhmjBsC-LeP5U6APs_mtgkbDyqAIJRtz030j-mIucU9hDMYCMPl2-_sa1WWDnfu2OBtu8bEGnZTKTpHekmZ60ntESo_fEc9iRgTCMz6sDfgFkbFng7kq-pFEueonDMvgzUdJj1fQSEHJTpeqb0a7AmMTU5QTkdx9gVdSA7TmEeZ3U9tyQCp8K81AFu7RO_Q89t-yrM0dl_s_xBFNkGdotO9Gq'
            },
            {
              name: 'Neha Joshi',
              time: '5:30 PM - 6:30 PM',
              interviewer: 'Amit Verma',
              color: 'text-pink-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa1-ilepcBimMig7CbVB03_yTNIoebNfySUdiI4h5nbH1BuJcJdNClgbXcqttUaufttkBcKwWQpCjsR485ll495MctYFgIVMSRPnhcxH7SocJf5ik1mffXNQ3aLLfoxrAFBDq-r2nbaKgjfXbu5ijq9aIT7uOfuIPwPfy_K95jK3DxUr4Ji_5xATEypx8Gz5ZnYmdCok4uvjrjs-76vG2FkvumGCIvmvA5N5gJwS1cWl7TNHvamW4kAfgIpccaUecSTAq5z5rb6wMj'
            },
            {
              name: 'Karthik Iyer',
              time: '11:30 AM - 12:30 PM',
              interviewer: 'Pooja Desai',
              color: 'text-green-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa1-ilepcBimMig7CbVB03_yTNIoebNfySUdiI4h5nbH1BuJcJdNClgbXcqttUaufttkBcKwWQpCjsR485ll495MctYFgIVMSRPnhcxH7SocJf5ik1mffXNQ3aLLfoxrAFBDq-r2nbaKgjfXbu5ijq9aIT7uOfuIPwPfy_K95jK3DxUr4Ji_5xATEypx8Gz5ZnYmdCok4uvjrjs-76vG2FkvumGCIvmvA5N5gJwS1cWl7TNHvamW4kAfgIpccaUecSTAq5z5rb6wMj'
            }, {
              name: 'Meera Chopra',
              time: '2:00 PM - 3:00 PM',
              interviewer: 'Ravi Malhotra',
              color: 'text-purple-500',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk_QB7e_HlZDFTNnWVlG9B2NBUuPJV5cYSeF2dD9M5-1638AJ1SiG8WfQDmH7acSgzyCuS-bw6bk-7P3PIuXjbA4uWLGDqK3ynO95z8AigPnXLjq8nmgaZJYXgKoTVbmXKqpFLfvVqHQs6Tu7yOd8jLEVbhWadfoOMXH1go0anMejJ0a9Ert1Tdnfx7aBVffDYPvO3ZrwsgUMZJU_uaGqava5jWDLzjbYjW09tYBRbXYWUi0koHa2nNl-EfOjvjP4VTIbCmTmQGy0A'
            }].map((interview, idx) => (
              <div
                key={idx}

                className="flex items-center gap-3 bg-white p-3 mt-1 rounded-xl border hover:shadow-md transition-shadow cursor-pointer"
              >
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
