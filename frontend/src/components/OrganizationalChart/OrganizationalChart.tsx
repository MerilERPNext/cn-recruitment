import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router";
import { Minus, Plus, RotateCcw } from "lucide-react";
import Node from "./Node";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchy,
} from "../../hooks/useEmployee";

const OrganizationalChart: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: employeeHierarchy } = useGetEmployeeHierarchy(
    user?.company ?? ""
  );

  // refs to track drag
  const isDown = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);

  // scale state
  const [scale, setScale] = useState(1);
  const prevScaleRef = useRef(scale);

  // refs for measuring content and creating a properly-sized scroll area
  const contentRef = useRef<HTMLDivElement>(null); // the element that will be scaled (transform)
  const scaledWrapperRef = useRef<HTMLDivElement>(null); // wrapper whose width/height equal scaled content size
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  // Measure the natural (unscaled) size of the content. Use layout effect so sizes are available before paint.
  useLayoutEffect(() => {
    const measure = () => {
      if (!contentRef.current) return;
      const el = contentRef.current;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setContentSize({ width: w, height: h });
    };

    measure();

    // re-measure on window resize because the content's natural size may change
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [employeeHierarchy]);

  useEffect(() => {
    prevScaleRef.current = scale;
  }, [scale]);

  // ---- Drag handlers ----
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDown.current = true;
    // track pointer relative to container
    startX.current = e.pageX - containerRef.current.offsetLeft;
    startY.current = e.pageY - containerRef.current.offsetTop;
    scrollLeft.current = containerRef.current.scrollLeft;
    scrollTop.current = containerRef.current.scrollTop;
    containerRef.current.style.cursor = "grabbing";
    e.preventDefault();
  };

  const handleMouseLeave = () => {
    isDown.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const handleMouseUp = () => {
    isDown.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = x - startX.current;
    const walkY = y - startY.current;
    containerRef.current.scrollLeft = scrollLeft.current - walkX;
    containerRef.current.scrollTop = scrollTop.current - walkY;
  };

  // ---- Helper to set scale while keeping the same content point centered in the viewport ----
  const setScaleKeepingCenter = (newScale: number) => {
    const container = containerRef.current;
    const el = contentRef.current; // unscaled content
    if (!container || !el) {
      setScale(newScale);
      return;
    }

    const prevScale = prevScaleRef.current;

    // If content natural size is 0 (not measured yet), fallback to simple set
    const naturalW = contentSize.width || el.offsetWidth || 1;
    const naturalH = contentSize.height || el.offsetHeight || 1;

    // The current scroll offsets are expressed in *scaled* coordinates (because the wrapper has scaled width/height).
    // Compute the fractional position of the viewport center inside the scaled content.
    const viewportCenterX = container.scrollLeft + container.clientWidth / 2;
    const viewportCenterY = container.scrollTop + container.clientHeight / 2;

    const scaledTotalWPrev = naturalW * prevScale;
    const scaledTotalHPrev = naturalH * prevScale;

    const centerRatioX =
      scaledTotalWPrev > 0 ? viewportCenterX / scaledTotalWPrev : 0.5;
    const centerRatioY =
      scaledTotalHPrev > 0 ? viewportCenterY / scaledTotalHPrev : 0.5;

    // apply new scale
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setScale((_) => newScale);

    // After React updates DOM (scaled wrapper size), adjust scroll to keep the same content point centered.
    // Use requestAnimationFrame twice to ensure layout has updated.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scaledTotalWNew = naturalW * newScale;
        const scaledTotalHNew = naturalH * newScale;

        let targetScrollLeft =
          centerRatioX * scaledTotalWNew - container.clientWidth / 2;
        let targetScrollTop =
          centerRatioY * scaledTotalHNew - container.clientHeight / 2;

        // clamp
        const maxScrollLeft = Math.max(
          0,
          scaledTotalWNew - container.clientWidth
        );
        const maxScrollTop = Math.max(
          0,
          scaledTotalHNew - container.clientHeight
        );
        targetScrollLeft = Math.max(
          0,
          Math.min(targetScrollLeft, maxScrollLeft)
        );
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

        container.scrollLeft = targetScrollLeft;
        container.scrollTop = targetScrollTop;
      });
    });
  };

  // ---- Zoom handlers using the helper ----
  const zoomIn = () => setScaleKeepingCenter(Math.min(scale + 0.2, 3));
  const zoomOut = () => setScaleKeepingCenter(Math.max(scale - 0.2, 0.5));
  const resetZoom = () => {
    setScaleKeepingCenter(1);
    // center content after reset (will be handled by setScaleKeepingCenter)
  };

  return (
    <div className="bg-white font-sans h-screen flex flex-col">
      <HeaderBar title="organizational chart" onBack={() => navigate(-1)} />

      {/* Toolbar with zoom controls */}
      <div className="absolute top-20 right-6 z-50 flex flex-col space-y-2">
        <button
          onClick={zoomIn}
          className="p-2 rounded-full bg-gray-200 shadow hover:bg-gray-300"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 rounded-full bg-gray-200 shadow hover:bg-gray-300"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 rounded-full bg-gray-200 shadow hover:bg-gray-300"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Scrollable + draggable area */}
      <div
        ref={containerRef}
        className="flex overflow-auto h-full p-6 pt-20"
        style={{ cursor: "grab", background: "#f7fafc" }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div
          ref={scaledWrapperRef}
          style={{
            transition: "width 0.15s ease, height 0.15s ease",
          }}
        >
          <div
            ref={contentRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              transition: "transform 0.15s ease",
            }}
            className="flex-1 gap-4 justify-center"
          >
            <DndProvider backend={HTML5Backend}>
              
              {employeeHierarchy &&
                (Array.isArray(employeeHierarchy)
                  ? employeeHierarchy
                  : [employeeHierarchy]
                ).map((org) => (
                  <Node key={org.id} org={org} parent={undefined} />
                ))}
            </DndProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationalChart;
