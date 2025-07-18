import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

const LayoutHeader = ({ path, tab }: { path?: string, tab: string }) => {
    const navigate = useNavigate()
    return (
        <div>
            <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-16 flex items-center justify-center">
                        {/* Back Button - left-aligned absolute */}
                        <button
                            onClick={() => {
                                if (path) {

                                    navigate(path)
                                } else {
                                    navigate(-1)
                                }
                            }}
                            className="absolute left-0 flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Active Tab - centered */}
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <span>{tab}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LayoutHeader
