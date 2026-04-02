import { Link } from "lucide-react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { UserNotice } from "../../../types/notice";

interface NoticeSlideProps {
    data: UserNotice;
    backgroundColor?: string;
}

const pastelColors = [
    "#8EC7FF",
    "#A7D8FF",
    "#B9E3FF",
    "#7FB7FF",
    "#AFCBFF",
    "#C7E6FF",
];


export const NoticeSlide = ({ data, backgroundColor }: NoticeSlideProps) => {
    const navigate = useNavigate()
    const base =
        backgroundColor ??
        pastelColors[Math.floor(Math.random() * pastelColors.length)];



    const backgroundStyle = {
        backgroundColor: base,
        backgroundImage: data.attachments
            ? `url(${encodeURI(data.attachments)})`
            : "none",
        backgroundSize: data.attachments ? "contain" : "auto",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right bottom",
    };

    const plainText = DOMPurify.sanitize(data?.content || "", { ALLOWED_TAGS: [] });

    return (
        <div
            className="flex py-4 h-[150px] min-h-full w-full"
            style={backgroundStyle}
        >
            {/* CONTENT (LEFT SIDE) */}
            <div className="w-[100%] z-10">
                <div className="w-fit flex items-center justify-start gap-1 mb-2">

                    <h2 className="text-xl font-bold mx-4 line-clamp-1">{data.title}</h2>
                    <div className="flex items-center justify-center bg-white/20 rounded-lg p-2 cursor-pointer hover:bg-white/40" onClick={() => navigate(`/webapp/notices/${data.name}`)}   >
                        <Link className="h-4 w-4" />
                    </div>
                </div>

                <div className="text-sm mb-3 mx-4 line-clamp-2 text-wrap trim max-w-[65%] bg-transparent"
                >{plainText}</div>
            </div>
        </div>
    );
};
