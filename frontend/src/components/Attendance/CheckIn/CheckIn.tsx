import LayoutHeader from '../../shared/LayoutHeader'
import defaultProfile from "../../../assets/face-rec.png";
import { Shield } from 'lucide-react';

const CheckIn = ({ onClose }: { onClose: () => void; }) => {
    return (
        <div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-gray-100">
            <LayoutHeader
                tab="Face Recognition"
                onBack={() => {
                    onClose()
                }}
                icon="x"
            />
            <div className='px-4'>
                <div className='flex flex-col items-center w-full h-screen p-4 gap-4 '>
                    <div className="relative mb-12 bg-white rounded-lg">
                        {/* Outer Ring */}
                        <div className="w-80 h-80 rounded-full relative">
                            {/* Inner Ring */}
                            <div className="absolute inset-4">
                                {/* Face Placeholder */}
                                <div className="absolute inset-8  flex items-center justify-center overflow-hidden">
                                    <img src={defaultProfile} alt="Face recognition placeholder" />                                </div>
                            </div>

                            {/* Corner Brackets */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-gray-400"></div>
                            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-gray-400"></div>
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-gray-400"></div>
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-gray-400"></div>
                        </div>


                    </div>

                    <p className='text-gray-500 font-medium text-center'>To check-in or check-out you need to verify your face.Please enroll your face.</p>
                    <div className="bg-gray-200 border-1 border-gray-300 rounded-lg p-4 ">
                        <div className="flex items-start space-x-3">
                            <Shield className="w-5 h-5 text-gray-800 mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    <span className="font-medium text-gray-800">Note:</span> Please make sure that multiple faces are
                                    not captured for successful enrollment.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button className='bg-black text-white rounded-lg px-8 py-2 mt-2'> Enroll </button>
                </div></div>
        </div>
    )
}

export default CheckIn
