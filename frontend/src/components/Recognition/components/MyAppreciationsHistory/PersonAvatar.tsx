type PersonAvatarProps = {
  name: string;
  imageUrl?: string;
  size?: number;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const PersonAvatar = ({ name, imageUrl, size = 28 }: PersonAvatarProps) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
};

export default PersonAvatar;
