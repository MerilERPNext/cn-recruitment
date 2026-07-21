
export const FormioFormSkeleton = () => {
    return (
        <div className="w-full mt-4">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
            <div className="w-full border border-gray-100 rounded-lg p-4 space-y-4">
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-24 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
        </div>
    )
}