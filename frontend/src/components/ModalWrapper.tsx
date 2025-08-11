import React, { useCallback } from "react";
import { Outlet, useSearchParams, useNavigate } from "react-router-dom";

const StaticModal = ({ onClose }: { onClose: () => void }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 9998,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
          zIndex: 9999,
          padding: "1rem",
        }}
      >
        <h2>Static Modal Title</h2>
        <p>
          This is some static content that always appears for the query param.
        </p>
      </div>
    </div>
  );
};

export default function ModalWrapper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showModal = searchParams.has("showModal");

  const closeModal = useCallback(() => {
    searchParams.delete("showModal");
    navigate(-1);
  }, [navigate, searchParams]);

  return (
    <>
      <Outlet />
      {showModal && <StaticModal onClose={closeModal} />}
    </>
  );
}
