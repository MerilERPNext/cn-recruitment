type AppreciationImageProps = {
  imageUrl?: string;
  title: string;
};

const AppreciationImage = ({ imageUrl, title }: AppreciationImageProps) => (
  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <span className="h-6 w-6 rounded-md border border-dashed border-gray-300 bg-white" />
    )}
  </div>
);

export default AppreciationImage;
