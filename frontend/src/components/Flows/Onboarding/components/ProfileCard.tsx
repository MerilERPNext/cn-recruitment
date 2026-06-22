import { memo } from "react";
import { Mail, Pencil, Phone } from "lucide-react";
import Avatar from "../../../shared/Avatar";
import Badge from "../../../shared/Badge";
import { Typography } from "../../../shared/atoms/Typography";

const ProfileCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
    <Avatar
      name="Yogesh Vaidya"
      src="https://api.dicebear.com/7.x/adventurer/svg?seed=Yogesh"
      size="h-24 w-24"
      indicatorNode={
        <div className="bg-blue-500  h-10 w-10 text-white flex items-center justify-center rounded-full border-2 border-white cursor-pointer hover:bg-blue-600 transition-colors shadow -translate-x-3 -translate-y-3">
          <Pencil size={12} className="stroke-[2.5] size-4" />
        </div>
      }
      indicatorPositionClass="absolute bottom-0 right-0"
    />

    <div className="min-w-0 flex-1 text-center md:text-left space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2.5">
        <Typography variant="h4" className="font-bold text-slate-800 break-words">
          Yogesh Vaidya
        </Typography>
        <div className="flex justify-center">
          <Badge label="On Probation" variant="success" size="sm" />
        </div>
      </div>

      <Typography
        variant="bodySmall"
        className="text-slate-500 block leading-relaxed break-words"
      >
        PW30946 <span className="mx-1 text-slate-300">|</span> Innovation{" "}
        <span className="mx-1 text-slate-300">|</span> Corporate - KLJ Noida One
        - Noida, Uttar Pradesh (201301)
      </Typography>

      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 pt-2">
        <div className="flex items-center gap-2 text-slate-600">
          <Phone size={15} className="text-blue-500" />
          <Typography variant="bodySmall" className="font-medium text-slate-600">
            +91 83590 22958
          </Typography>
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Mail size={15} className="text-blue-500" />
          <Typography
            variant="bodySmall"
            className="font-medium text-slate-600 break-all"
          >
            jhashruchu7@gmail.com
          </Typography>
        </div>
      </div>
    </div>
  </div>
);

export default memo(ProfileCard);
