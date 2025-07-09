import React from "react";

const FailedForgeModal = ({
  failTitle,
  failedObjectName,
  failedImageUrl,
  failedLoading,
  failedCapability,
  currentTask,
  onClose,
  onImageLoad,
  onImageError,
}) => {
  return (
    <div className="overlay">
      <div className="overlay-content overlay-center">
        <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420, justifyContent: 'center', alignItems: 'center' }}>
          <h2 className="overlay-text">{failTitle}</h2>
          <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em' }}>You invented:</div>
          <div className="overlay-text" style={{ marginTop: 4, marginBottom: 8, fontWeight: 700, color: '#FFC145', fontSize: '1.3em' }}>
            <b>{failedObjectName || "a new object"}</b>
          </div>
          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
            {failedImageUrl && (
              <img
                src={failedImageUrl}
                alt={failedObjectName}
                style={{ width: 96, height: 96, objectFit: 'contain', background: 'transparent', position: 'absolute', top: 0, left: 0 }}
                onLoad={onImageLoad}
                onError={onImageError}
              />
            )}
            {failedLoading && (
              <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, zIndex: 2, background: 'rgba(0,0,0,0.1)' }}>
                <svg width="48" height="48" viewBox="0 0 50 50" style={{ display: 'block', margin: 'auto' }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#FFC145" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
            )}
          </div>
          <div className="overlay-text" style={{ marginTop: -8, fontSize: '1.1em', color: '#fff' }}>
            {failedCapability
              ? `${failedCapability}, but doesn't solve: ${currentTask?.description}`
              : "But it doesn't solve the current challenge!"}
          </div>
          <button
            onClick={onClose}
            style={{ marginTop: 24, marginBottom: 8 }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedForgeModal; 