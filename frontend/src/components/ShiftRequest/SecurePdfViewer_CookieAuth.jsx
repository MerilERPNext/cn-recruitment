
import React, { useEffect, useRef, useState } from 'react';
import { pdfjs } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const SecurePdfViewer = ({ fetchUrl }) => {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    const fetchPdf = async () => {
      const res = await fetch(fetchUrl, {
        method: 'GET',
        credentials: 'include', // Use cookies for auth
      });

      if (!res.ok) throw new Error('Failed to fetch PDF');

      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
    };

    fetchPdf();
  }, [fetchUrl]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc) return;

      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    };

    renderPage();
  }, [pdfDoc, pageNumber, scale]);

  const nextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const prevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const zoomIn = () => setScale((prev) => prev + 0.2);
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  return (
    <div style={{ textAlign: 'center' }}>
      <div>
        <button onClick={prevPage} disabled={pageNumber <= 1}>Previous</button>
        <span style={{ margin: '0 10px' }}>Page {pageNumber} of {numPages}</span>
        <button onClick={nextPage} disabled={pageNumber >= numPages}>Next</button>
      </div>
      <div style={{ margin: '10px 0' }}>
        <button onClick={zoomOut}>-</button>
        <span style={{ margin: '0 10px' }}>Zoom: {Math.round(scale * 100)}%</span>
        <button onClick={zoomIn}>+</button>
      </div>
      <canvas ref={canvasRef} style={{ border: '1px solid #ccc' }}></canvas>
    </div>
  );
};

export default SecurePdfViewer;
