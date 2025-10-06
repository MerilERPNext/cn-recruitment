import PDFViewer from "../../PDFViewer";

const FileRenderer = ({ filePath }: { filePath: string }) => {
  // Get the file extension
  const fileExtension = filePath?.split(".")?.pop()?.toLowerCase() || null;

  // Based on the file extension, render the appropriate element
  const renderFile = () => {
    switch (fileExtension) {
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return (
          <img
            src={filePath}
            alt="File"
            style={{ maxWidth: "100%", maxHeight: "500px" }}
          />
        );
      case "pdf":
        return (
          <PDFViewer
            pdfUrl={filePath}
            mode="react-pdf"
            className="w-full h-full rounded-b-lg"
            title={`File Renderer`}
          />
        );
      case "txt":
        return (
          <iframe
            src={filePath}
            width="100%"
            height="500px"
            title="Text File"
          />
        );
      case "mp4":
      case "webm":
        return <video controls src={filePath} width="100%" />;
      default:
        return <p>Unsupported file type</p>;
    }
  };

  return <div className=" flex justify-center max-w-full">{renderFile()}</div>;
};

export default FileRenderer;
