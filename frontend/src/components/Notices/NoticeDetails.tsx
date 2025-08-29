
import { ArrowLeft, Clock, Tag, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { useNavigate, useParams } from "react-router"
import { useArchiveNotice, useGetNoticeById, useMarkNoticeAsRead } from "../../hooks/useNotices"
import { useState } from "react"
import DOMPurify from 'dompurify';
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";



const NoticeDetails = () => {
    const { isDesktop } = useScreenSize();
    const params = useParams()
    const noticeId = params?.id as string
    const {
        data: notice,
        isLoading,
        isError,
        error,
        refetch
    } = useGetNoticeById(noticeId as string);
    const navigate = useNavigate();
    const [actionLoading, setActionLoading] = useState<{ markAsRead: boolean; archive: boolean }>({
        markAsRead: false,
        archive: false,
    });
    const markAsRead = useMarkNoticeAsRead();
    const archive = useArchiveNotice();
    const handleActionClick = async (actionType: 'markAsRead' | 'archive') => {
        setActionLoading(prev => ({ ...prev, [actionType]: true }));
        try {
            if (actionType === "markAsRead") {
                await markAsRead.mutateAsync(noticeId, {
                    onSuccess() {
                        refetch();
                    },
                });
            } else if (actionType === 'archive') {
                await archive.mutateAsync(noticeId, {
                    onSuccess() {
                        refetch();
                    },
                });
            }
        } catch (error) {
            console.error(`${actionType} failed:`, error);
            // Optionally show a toast or error message
        } finally {
            setActionLoading(prev => ({ ...prev, [actionType]: false }));
        }
    };


    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "high":
                return <AlertCircle className="w-4 h-4" />
            case "medium":
                return <Clock className="w-4 h-4" />
            case "low":
                return <CheckCircle className="w-4 h-4" />
            default:
                return <Tag className="w-4 h-4" />
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-red-500 text-white"
            case "medium":
                return "bg-gray-600 text-white"
            case "low":
                return "bg-gray-400 text-white"
            default:
                return "bg-gray-200 text-black"
        }
    }

    if (isLoading) {
        const loader = (
            <div className="w-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 text-sm">Loading notice details...</p>
                </div>
            </div>
        );
        return isDesktop ? (
            <DesktopLayoutWrapper title="Notifications">
                <div className="p-8">{loader}</div>
            </DesktopLayoutWrapper>
        ) : (
            <div className="min-h-screen bg-white flex items-center justify-center">{loader}</div>
        );
    }

    if (isError) {
        const errorView = (
            <div className="max-w-md w-full text-center space-y-4">
                <XCircle className="w-12 h-12 text-black mx-auto" />
                <h2 className="text-xl font-semibold text-black">Error Loading Notice</h2>
                <p className="text-gray-600">{error?.message}</p>
                <button
                    onClick={() => {
                        navigate(-1)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Notices
                </button>
            </div>
        );
        return isDesktop ? (
            <DesktopLayoutWrapper title="Notifications">
                <div className="p-8 flex items-center justify-center">{errorView}</div>
            </DesktopLayoutWrapper>
        ) : (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">{errorView}</div>
        );
    }

    if (!notice) {
        const notFound = (
            <div className="max-w-md w-full text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Tag className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-black">Notice Not Found</h2>
                <p className="text-gray-600">The notice you're looking for doesn't exist or has been removed.</p>
                <button
                    onClick={() => {
                        navigate(-1)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Notices
                </button>
            </div>
        );
        return isDesktop ? (
            <DesktopLayoutWrapper title="Notifications">
                <div className="p-8 flex items-center justify-center">{notFound}</div>
            </DesktopLayoutWrapper>
        ) : (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">{notFound}</div>
        );
    }
    const cleanHTML = DOMPurify.sanitize(notice?.message || "");

    const pageHeader = (
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <button
                        onClick={() => {
                            navigate(-1)
                        }}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Notices</span>
                    </button>
                    {notice?.isUnread && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                            <span>Unread</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const detailsBody = (
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-gray-100">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                <Tag className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2 leading-tight">{notice?.title}</h1>
                            <p className="text-gray-600 text-sm sm:text-base">
                                From: <span className="font-medium text-black">{notice?.name}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <div
                        className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: cleanHTML }}
                    />
                </div>

                <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Category</p>
                                <p className="text-sm font-medium text-black">{notice?.category}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</p>
                                <p className="text-sm font-medium text-black">{notice?.status}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {getPriorityIcon(notice?.priority)}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Priority</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(notice?.priority)}`}
                                    >
                                        {notice?.priority ? notice.priority.charAt(0).toUpperCase() + notice.priority.slice(1) : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Posted</p>
                                <p className="text-sm font-medium text-black">{notice?.time}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isDesktop ? (
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <button
                        className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                        onClick={() => handleActionClick("markAsRead")}
                        disabled={actionLoading?.markAsRead}
                    >
                        {actionLoading.markAsRead ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Mark as Read"
                        )}
                    </button>

                    {notice?.status?.toLowerCase() !== 'archived' && (
                        <button
                            className="w-full px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                            onClick={() => handleActionClick("archive")}
                            disabled={actionLoading?.archive}
                        >
                            {actionLoading?.archive ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Archive Notice"
                            )}
                        </button>
                    )}
                </div>
            ) : (
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                        onClick={() => handleActionClick("markAsRead")}
                        disabled={actionLoading?.markAsRead}
                    >
                        {actionLoading.markAsRead ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Mark as Read"
                        )}
                    </button>

                    {notice?.status?.toLowerCase() !== 'archived' && (
                        <button
                            className="px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                            onClick={() => handleActionClick("archive")}
                            disabled={actionLoading?.archive}
                        >
                            {actionLoading?.archive ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Archive Notice"
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    if (isDesktop) {
        return (
            <DesktopLayoutWrapper title="Notifications">
                {pageHeader}
                {detailsBody}
            </DesktopLayoutWrapper>
        );
    }

    return (
        <div className=" bg-white">
            {pageHeader}
            {detailsBody}
        </div>
    )
}

export default NoticeDetails
