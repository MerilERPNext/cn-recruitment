
import { ArrowLeft, Clock, Tag, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { useNavigate, useParams } from "react-router"
import { useCheckIfNoticeIsReadOrAcknowledged, useGetNoticeById, useMarkNoticeAsAcknowledge, useMarkNoticeAsRead } from "../../hooks/useNotices"
import { useState } from "react"
import DOMPurify from 'dompurify';
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import Badge from "../shared/Badge";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import CircularLoader from "../shared/atoms/CircularLoader";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";



const NoticeDetails = () => {
    const { isDesktop } = useScreenSize();
    const params = useParams()
    const noticeId = params?.id as string
    const { data: currentEmployee } = useCurrentEmployeeAllDetails();

    const {
        data: notice,
        isLoading,
        isError,
        error,

    } = useGetNoticeById(noticeId as string);
    const { data: isReadOrAcknowledged, refetch: refetchIsReadOrAcknowledged } = useCheckIfNoticeIsReadOrAcknowledged(noticeId as string, currentEmployee?.user_id as string);
    const isRead = isReadOrAcknowledged?.some((item) => item.read_at);
    const isAcknowledged = isReadOrAcknowledged?.some((item) => item.acknowledged_at);


    const navigate = useNavigate();
    const [actionLoading, setActionLoading] = useState<{ markAsRead: boolean; markAsAcknowledge: boolean }>({
        markAsRead: false,
        markAsAcknowledge: false,
    });
    const markAsRead = useMarkNoticeAsRead();
    const markAsAcknowledge = useMarkNoticeAsAcknowledge();
    const handleActionClick = async (actionType: 'markAsRead' | 'markAsAcknowledge') => {
        setActionLoading(prev => ({ ...prev, [actionType]: true }));
        try {
            if (actionType === "markAsRead") {
                await markAsRead.mutateAsync(noticeId, {
                    onSuccess() {
                        refetchIsReadOrAcknowledged();
                    },
                });
            } else if (actionType === 'markAsAcknowledge') {
                await markAsAcknowledge.mutateAsync(noticeId, {
                    onSuccess() {
                        refetchIsReadOrAcknowledged();
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




    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-error text-white"
            case "medium":
                return "bg-warning text-white"
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
                    <CircularLoader size="lg" color="black" />
                    <Typography variant="bodySmall" className="text-gray-600">Loading notice details...</Typography>
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
                <Typography variant="h3" className="text-black">Error Loading Notice</Typography>
                <Typography variant="body" className="text-gray-600">{error?.message}</Typography>
                <Button
                    onClick={() => {
                        navigate(-1)
                    }}
                    bgColor="primary"
                    icon={<ArrowLeft className="w-4 h-4" />}
                >
                    Back to Notices
                </Button>
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
                <Typography variant="h3" className="text-black">Notice Not Found</Typography>
                <Typography variant="body" className="text-gray-600">The notice you're looking for doesn't exist or has been removed.</Typography>
                <Button
                    onClick={() => {
                        navigate(-1)
                    }}
                    bgColor="primary"
                    icon={<ArrowLeft className="w-4 h-4" />}
                >
                    Back to Notices
                </Button>
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
    const cleanHTML = DOMPurify.sanitize(notice?.content || "");



    const detailsBody = (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 h-full overflow-y-auto pb-32">
            <Card shadow="sm" radius="xl" padding="none" className="overflow-hidden border border-gray-200">
                {/* Header Section */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                        <div className="flex-shrink-0">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center border border-primary-100">
                                <Tag className="w-7 h-7 text-primary" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <Typography variant="h3" className="text-gray-900 leading-tight capitalize">
                                        {notice?.title}
                                    </Typography>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <Typography variant="bodySmall">Posted on {notice?.publish_date}</Typography>
                                        <span className="text-gray-300">•</span>
                                        <Typography variant="bodySmall">by {notice?.name}</Typography>
                                    </div>
                                </div>
                                <Badge
                                    label={isRead ? "Read" : "Unread"}
                                    backgroundColor={isRead ? "bg-primary-100" : "bg-error-100"}
                                    textColor={isRead ? "text-primary-700" : "text-error-700"}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50 text-sm">
                    <div className="p-4 sm:p-6">
                        <Typography variant="label" className="text-gray-500 font-medium mb-1 flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Category
                        </Typography>
                        <Typography variant="body" className="font-semibold text-gray-900 capitalize">{notice?.notice_type || 'General'}</Typography>
                    </div>
                    <div className="p-4 sm:p-6">
                        <Typography variant="label" className="text-gray-500 font-medium mb-1 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Status
                        </Typography>
                        <Typography variant="body" className="font-semibold text-gray-900 capitalize">{notice?.status}</Typography>
                    </div>
                    <div className="p-4 sm:p-6">
                        <Typography variant="label" className="text-gray-500 font-medium mb-1 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Priority
                        </Typography>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize mt-1 ${getPriorityColor(notice?.priority || '')}`}>
                            {notice?.priority || 'Normal'}
                        </span>
                    </div>
                    <div className="p-4 sm:p-6">
                        <Typography variant="label" className="text-gray-500 font-medium mb-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Expires
                        </Typography>
                        <Typography variant="body" className="font-semibold text-gray-900">{notice?.expiry_date || 'Never'}</Typography>
                    </div>
                </div>

                {/* Attachment Section */}
                {notice?.attachments && (
                    <div className="p-6 sm:p-8 pb-0">
                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <img
                                src={notice.attachments}
                                alt="Notice attachment"
                                className="w-full h-auto max-h-[300px] object-contain mx-auto"
                            />
                        </div>
                    </div>
                )}

                {/* Content Section */}
                <div className="p-6 sm:p-8">
                    <div
                        className="prose prose-slate prose-lg max-w-none text-gray-600 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: cleanHTML }}
                    />
                </div>
            </Card>

            {/* Actions Footer */}
            <div className={`mt-8 ${isDesktop ? 'grid grid-cols-2 gap-4 mx-auto' : 'flex flex-col gap-3'}`}>
                <Button
                    fullWidth
                    size="lg"
                    variant={isRead ? "soft" : "contain"}
                    bgColor={isRead ? "primary" : "primary"}
                    onClick={() => handleActionClick("markAsRead")}
                    disabled={actionLoading?.markAsRead || isRead}
                    icon={isRead ? <CheckCircle className="w-5 h-5" /> : undefined}
                >
                    {actionLoading.markAsRead ? (
                        <CircularLoader size="sm" color={isRead ? "blue-500" : "white"} />
                    ) : (
                        isRead ? "Marked as Read" : "Mark as Read"
                    )}
                </Button>

                <Button
                    fullWidth
                    size="lg"
                    variant={isAcknowledged ? "soft" : "outline"}
                    bgColor={isAcknowledged ? "success" : "disabled"}
                    className={!isAcknowledged ? "border-gray-300 text-gray-700 hover:bg-gray-50" : ""}
                    onClick={() => handleActionClick("markAsAcknowledge")}
                    disabled={actionLoading?.markAsAcknowledge || isAcknowledged}
                    icon={<CheckCircle className="w-5 h-5" />}
                >
                    {actionLoading?.markAsAcknowledge ? (
                        <CircularLoader size="sm" color={isAcknowledged ? "gray-700" : "gray-700"} />
                    ) : (
                        isAcknowledged ? "Acknowledged" : "Acknowledge Notice"
                    )}
                </Button>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <DesktopLayoutWrapper title="Notifications">
                {detailsBody}
            </DesktopLayoutWrapper>
        );
    }

    return (
        <div className=" bg-white">
            {detailsBody}
        </div>
    )
}

export default NoticeDetails
