import React, { useState } from "react";
import {
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  Download,
  ExternalLink,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  FileSpreadsheet,
  FileCode,
  Archive,
  File as FileIcon,
  Maximize2
} from "lucide-react";
import { formatFileSize } from "../../utils/mediaUtils";
import "./RichMediaViewer.css";

export default function RichMediaViewer({
  attachments = [],
  mediaLinks = [],
  onRemoveAttachment,
  onRemoveMediaLink,
  isEditable = false,
  compact = false,
}) {
  const [lightboxImg, setLightboxImg] = useState(null);
  const [imgZoom, setImgZoom] = useState(1);
  const [activePdfModal, setActivePdfModal] = useState(null);

  const images = (attachments || []).filter((a) => a.type === "image");
  const pdfs = (attachments || []).filter((a) => a.type === "pdf");
  const audios = (attachments || []).filter((a) => a.type === "audio");
  const videos = [
    ...(mediaLinks || []).map((l) => ({ ...l, isLink: true })),
    ...(attachments || []).filter((a) => a.type === "video").map((a) => ({ ...a, isLink: false }))
  ];
  const otherFiles = (attachments || []).filter(
    (a) => !["image", "pdf", "audio", "video"].includes(a.type)
  );

  const hasMedia =
    images.length > 0 ||
    pdfs.length > 0 ||
    audios.length > 0 ||
    videos.length > 0 ||
    otherFiles.length > 0;

  if (!hasMedia) return null;

  const handleOpenLightbox = (img) => {
    setLightboxImg(img);
    setImgZoom(1);
  };

  const handleCloseLightbox = () => {
    setLightboxImg(null);
    setImgZoom(1);
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "spreadsheet":
        return <FileSpreadsheet size={16} color="#10b981" />;
      case "code":
        return <FileCode size={16} color="#8b5cf6" />;
      case "archive":
        return <Archive size={16} color="#d97706" />;
      case "document":
        return <FileText size={16} color="#2563eb" />;
      default:
        return <FileIcon size={16} color="#6b7280" />;
    }
  };

  return (
    <div className={"rich-media-container " + (compact ? "is-compact" : "")}>
      {/* 1. VIDEOS SECTION (YouTube, Vimeo, Loom, MP4) */}
      {videos.length > 0 && (
        <div className="rich-media-section rich-media-videos">
          <div className="rich-media-section-title">
            <Film size={14} />
            <span>Videos ({videos.length})</span>
          </div>
          <div className="rich-media-video-grid">
            {videos.map((vid, idx) => (
              <div key={vid.id || idx} className="rich-media-video-card">
                <div className="rich-media-video-wrapper">
                  {vid.embedUrl ? (
                    <iframe
                      src={vid.embedUrl}
                      title={vid.title || "Video Player"}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rich-media-iframe"
                    />
                  ) : vid.dataUrl ? (
                    <video
                      controls
                      src={vid.dataUrl}
                      className="rich-media-native-video"
                    />
                  ) : null}
                </div>
                <div className="rich-media-video-meta">
                  <div className="rich-media-video-info">
                    <span className="rich-media-video-tag">{vid.type ? vid.type.toUpperCase() : "VIDEO"}</span>
                    <span className="rich-media-video-name" title={vid.title || vid.name || vid.originalUrl}>
                      {vid.title || vid.name || vid.originalUrl || "Video"}
                    </span>
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      className="rich-media-remove-btn"
                      onClick={() => {
                        if (vid.isLink && onRemoveMediaLink) onRemoveMediaLink(vid.id || idx);
                        else if (!vid.isLink && onRemoveAttachment) onRemoveAttachment(vid.id);
                      }}
                      title="Remove video"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. IMAGE GALLERY & SCREENSHOTS */}
      {images.length > 0 && (
        <div className="rich-media-section rich-media-images">
          <div className="rich-media-section-title">
            <ImageIcon size={14} />
            <span>Images & Screenshots ({images.length})</span>
          </div>
          <div className="rich-media-image-grid">
            {images.map((img) => (
              <div key={img.id} className="rich-media-image-card">
                <div
                  className="rich-media-image-thumb-wrap"
                  onClick={() => handleOpenLightbox(img)}
                  title="Click to zoom / view full size"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name || "Attachment"}
                    className="rich-media-image-thumb"
                    loading="lazy"
                  />
                  <div className="rich-media-image-overlay">
                    <Maximize2 size={16} />
                  </div>
                </div>
                <div className="rich-media-image-footer">
                  <span className="rich-media-file-name" title={img.name}>
                    {img.name || "Screenshot"}
                  </span>
                  <span className="rich-media-file-size">{formatFileSize(img.size)}</span>
                  {isEditable && onRemoveAttachment && (
                    <button
                      type="button"
                      className="rich-media-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAttachment(img.id);
                      }}
                      title="Remove image"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PDF DOCUMENTS */}
      {pdfs.length > 0 && (
        <div className="rich-media-section rich-media-pdfs">
          <div className="rich-media-section-title">
            <FileText size={14} />
            <span>PDF Documents ({pdfs.length})</span>
          </div>
          <div className="rich-media-pdf-grid">
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="rich-media-pdf-card">
                <div className="rich-media-pdf-icon-box">
                  <FileText size={22} color="#dc2626" />
                  <span className="rich-media-pdf-badge">PDF</span>
                </div>
                <div className="rich-media-pdf-details">
                  <div className="rich-media-pdf-name" title={pdf.name}>
                    {pdf.name || "Document.pdf"}
                  </div>
                  <div className="rich-media-pdf-meta">
                    <span>{formatFileSize(pdf.size)}</span>
                  </div>
                  <div className="rich-media-pdf-actions">
                    <button
                      type="button"
                      className="rich-media-btn-view"
                      onClick={() => setActivePdfModal(pdf)}
                      title="View PDF inline"
                    >
                      <ExternalLink size={12} /> View PDF
                    </button>
                    {pdf.dataUrl && (
                      <a
                        href={pdf.dataUrl}
                        download={pdf.name || "document.pdf"}
                        className="rich-media-btn-download"
                        title="Download PDF file"
                      >
                        <Download size={12} /> Save
                      </a>
                    )}
                  </div>
                </div>
                {isEditable && onRemoveAttachment && (
                  <button
                    type="button"
                    className="rich-media-remove-btn"
                    onClick={() => onRemoveAttachment(pdf.id)}
                    title="Remove PDF"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. AUDIO PLAYERS */}
      {audios.length > 0 && (
        <div className="rich-media-section rich-media-audios">
          <div className="rich-media-section-title">
            <Music size={14} />
            <span>Audio & Voice Notes ({audios.length})</span>
          </div>
          <div className="rich-media-audio-list">
            {audios.map((aud) => (
              <div key={aud.id} className="rich-media-audio-card">
                <div className="rich-media-audio-icon">
                  <Music size={16} color="#7c3aed" />
                </div>
                <div className="rich-media-audio-main">
                  <div className="rich-media-audio-name">{aud.name || "Audio Recording"}</div>
                  <audio controls src={aud.dataUrl} className="rich-media-audio-element" />
                </div>
                {isEditable && onRemoveAttachment && (
                  <button
                    type="button"
                    className="rich-media-remove-btn"
                    onClick={() => onRemoveAttachment(aud.id)}
                    title="Remove audio"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. GENERIC FILES & DOCUMENTS */}
      {otherFiles.length > 0 && (
        <div className="rich-media-section rich-media-files">
          <div className="rich-media-section-title">
            <FileIcon size={14} />
            <span>Files & Attachments ({otherFiles.length})</span>
          </div>
          <div className="rich-media-file-list">
            {otherFiles.map((file) => (
              <div key={file.id} className="rich-media-file-card">
                <div className="rich-media-file-icon">{getFileIcon(file.type)}</div>
                <div className="rich-media-file-info">
                  <div className="rich-media-file-title" title={file.name}>
                    {file.name || "Attached File"}
                  </div>
                  <div className="rich-media-file-sub">{formatFileSize(file.size)}</div>
                </div>
                <div className="rich-media-file-actions">
                  {file.dataUrl && (
                    <a
                      href={file.dataUrl}
                      download={file.name || "file"}
                      className="rich-media-file-download"
                      title="Download file"
                    >
                      <Download size={13} />
                    </a>
                  )}
                  {isEditable && onRemoveAttachment && (
                    <button
                      type="button"
                      className="rich-media-remove-btn"
                      onClick={() => onRemoveAttachment(file.id)}
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {lightboxImg && (
        <div className="rich-lightbox-backdrop" onClick={handleCloseLightbox}>
          <div className="rich-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <header className="rich-lightbox-header">
              <div className="rich-lightbox-title" title={lightboxImg.name}>
                <ImageIcon size={16} />
                <span>{lightboxImg.name || "Screenshot Preview"}</span>
                <span className="rich-lightbox-size">({formatFileSize(lightboxImg.size)})</span>
              </div>
              <div className="rich-lightbox-controls">
                <button
                  type="button"
                  className="rich-lightbox-btn"
                  onClick={() => setImgZoom((z) => Math.min(z + 0.25, 3))}
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  className="rich-lightbox-btn"
                  onClick={() => setImgZoom((z) => Math.max(z - 0.25, 0.5))}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  className="rich-lightbox-btn"
                  onClick={() => setImgZoom(1)}
                  title="Reset Zoom"
                >
                  <RotateCcw size={15} />
                </button>
                {lightboxImg.dataUrl && (
                  <a
                    href={lightboxImg.dataUrl}
                    download={lightboxImg.name || "screenshot.png"}
                    className="rich-lightbox-btn"
                    title="Download Image"
                  >
                    <Download size={15} />
                  </a>
                )}
                <button
                  type="button"
                  className="rich-lightbox-btn rich-lightbox-close"
                  onClick={handleCloseLightbox}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="rich-lightbox-body">
              <img
                src={lightboxImg.dataUrl}
                alt={lightboxImg.name || "Full view"}
                className="rich-lightbox-img"
                style={{ transform: "scale(" + imgZoom + ")" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF VIEWER MODAL */}
      {activePdfModal && (
        <div className="rich-lightbox-backdrop" onClick={() => setActivePdfModal(null)}>
          <div className="rich-pdf-modal" onClick={(e) => e.stopPropagation()}>
            <header className="rich-lightbox-header">
              <div className="rich-lightbox-title">
                <FileText size={16} color="#dc2626" />
                <span>{activePdfModal.name || "PDF Document"}</span>
              </div>
              <div className="rich-lightbox-controls">
                {activePdfModal.dataUrl && (
                  <a
                    href={activePdfModal.dataUrl}
                    download={activePdfModal.name || "document.pdf"}
                    className="rich-lightbox-btn"
                    title="Download PDF"
                  >
                    <Download size={15} /> Download
                  </a>
                )}
                <button
                  type="button"
                  className="rich-lightbox-btn rich-lightbox-close"
                  onClick={() => setActivePdfModal(null)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="rich-pdf-body">
              <iframe
                src={activePdfModal.dataUrl}
                title={activePdfModal.name}
                className="rich-pdf-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
