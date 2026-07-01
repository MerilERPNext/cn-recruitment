import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { UserNotice } from "../../../types/notice";

interface NoticeSlideProps {
    data: UserNotice;
    backgroundColor?: string;
    fullWidthBackground?: boolean;
}

const pastelColors = [
    "#8EC7FF",
    "#A7D8FF",
    "#B9E3FF",
    "#7FB7FF",
    "#AFCBFF",
    "#C7E6FF",
];


export const NoticeSlide = ({ data, backgroundColor, fullWidthBackground = false }: NoticeSlideProps) => {
    const navigate = useNavigate()
    const base =
        backgroundColor ??
        pastelColors[Math.floor(Math.random() * pastelColors.length)];



    const backgroundStyle = {
        backgroundColor: base,
        backgroundImage: data.attachments
            ? `url(${encodeURI(data.attachments)})`
            : "none",
        backgroundSize: data.attachments
            ? fullWidthBackground
                ? "cover"
                : "contain"
            : "auto",
        backgroundRepeat: "no-repeat",
        backgroundPosition: fullWidthBackground ? "center" : "right bottom",
    };

    const plainText = DOMPurify.sanitize(data?.content || "", { ALLOWED_TAGS: [] });

    return (
        <div
            className={`relative flex h-[150px] min-h-full w-full overflow-hidden ${fullWidthBackground ? "rounded-md px-4 py-5" : "py-4"}`}
            style={backgroundStyle}
        >
            {/* CONTENT (LEFT SIDE) */}
            <div className={`relative z-10  p-2 flex h-full flex-col items-start ${fullWidthBackground ? "max-w-[70%]" : "w-full"}`}>
                <h2 className={`line-clamp-1 text-xl font-bold text-gray-900 ${fullWidthBackground ? "mb-2" : "mx-4 mb-2"}`}>
                    {data.title}
                </h2>

                <div className={`line-clamp-2   text-sm text-gray-700 ${fullWidthBackground ? "mb-2 font-medium" : "mx-4 mb-3 max-w-[65%]"}`}>
                    {plainText}
                </div>

                <button
                    className={`${fullWidthBackground ? " mt-auto bg-white/80 px-4 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white" : "bg-white ml-4 px-3 text-base text-gray-900"} rounded-lg py-2`}
                    onClick={() => navigate(`/webapp/notices/${data.name}`)}
                >
                    View Details
                </button>
            </div>
        </div>
    );
};
