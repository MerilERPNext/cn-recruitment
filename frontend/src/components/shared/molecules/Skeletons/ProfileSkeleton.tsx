
interface ProfileSkeletonProps {
    tabs?: number;
    cardsPerSection?: number;
}

function ProfileSkeleton({
    tabs = 3,
    cardsPerSection = 6,
}: ProfileSkeletonProps) {
    return (
        <div className="animate-pulse">

            {/* Sections */}
            <div className="space-y-10 pb-6">
                {Array.from({ length: tabs }).map((_, sectionIndex) => (
                    <section key={sectionIndex}>
                        {/* Section Header */}
                        <div className="mx-6 mb-6 flex items-center justify-between rounded-xl bg-gray-50 px-6 py-3">
                            <div className="h-5 w-40 bg-gray-200 rounded" />
                            <div className="h-8 w-16 bg-gray-200 rounded-lg" />
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                            {Array.from({ length: cardsPerSection }).map((_, i) => (
                                <div
                                    key={i}
                                    className="space-y-3 rounded-xl p-4"
                                >
                                    <div className="h-3 w-24 bg-gray-200 rounded" />
                                    <div className="h-4 w-full bg-gray-200 rounded" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

export default ProfileSkeleton;
