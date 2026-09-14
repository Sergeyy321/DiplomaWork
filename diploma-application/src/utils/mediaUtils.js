/**
 * mediaUtils.js
 * Comprehensive media parser, file converter, and attachment utility.
 * Supports:
 * - YouTube, Vimeo, Loom, MP4/WebM video embeds
 * - Image file compression and DataURL generation
 * - PDF and generic document attachments
 * - Clipboard screenshot detection
 */

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileCategory(fileOrMime, name = "") {
  const mime = (typeof fileOrMime === "string" ? fileOrMime : fileOrMime?.type || "").toLowerCase();
  const filename = (name || fileOrMime?.name || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(filename)) {
    return "image";
  }
  if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(filename)) {
    return "video";
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(filename)) {
    return "audio";
  }
  if (mime === "application/pdf" || filename.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("text") ||
    /\.(doc|docx|txt|rtf|md|pages)$/i.test(filename)
  ) {
    return "document";
  }
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    /\.(xls|xlsx|csv|numbers)$/i.test(filename)
  ) {
    return "spreadsheet";
  }
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    mime.includes("compressed") ||
    /\.(zip|rar|7z|tar|gz)$/i.test(filename)
  ) {
    return "archive";
  }
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("html") ||
    mime.includes("css") ||
    /\.(js|jsx|ts|tsx|json|html|css|py|java|cpp|c|cs|go|rs|sql)$/i.test(filename)
  ) {
    return "code";
  }

  return "file";
}

export function parseVideoUrl(url) {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = url.trim();

  // YouTube
  const ytMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      videoId,
      originalUrl: cleanUrl,
      embedUrl: "https://www.youtube.com/embed/" + videoId + "?rel=0&autoplay=0",
      thumbnailUrl: "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg",
      title: "YouTube Video",
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      type: "vimeo",
      videoId,
      originalUrl: cleanUrl,
      embedUrl: "https://player.vimeo.com/video/" + videoId,
      thumbnailUrl: null,
      title: "Vimeo Video",
    };
  }

  // Loom
  const loomMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i
  );
  if (loomMatch && loomMatch[1]) {
    const videoId = loomMatch[1];
    return {
      type: "loom",
      videoId,
      originalUrl: cleanUrl,
      embedUrl: "https://www.loom.com/embed/" + videoId,
      thumbnailUrl: null,
      title: "Loom Recording",
    };
  }

  // Direct video link
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl)) {
    return {
      type: "direct",
      videoId: cleanUrl,
      originalUrl: cleanUrl,
      embedUrl: cleanUrl,
      thumbnailUrl: null,
      title: cleanUrl.split("/").pop().split("?")[0] || "Video Clip",
    };
  }

  return null;
}

export async function fileToAttachment(file, maxImageWidth = 1920) {
  if (!file) return null;

  const category = getFileCategory(file.type, file.name);

  if (category === "image" && file.type !== "image/svg+xml" && file.type !== "image/gif") {
    try {
      const compressedDataUrl = await compressImageFile(file, maxImageWidth);
      return {
        id: "att_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        name: file.name,
        type: "image",
        mimeType: file.type || "image/jpeg",
        size: Math.round(compressedDataUrl.length * 0.75),
        dataUrl: compressedDataUrl,
        createdAt: new Date().toISOString(),
      };
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: "att_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        name: file.name,
        type: category,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
        createdAt: new Date().toISOString(),
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file, maxWidth = 1920, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = readerEvent.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getClipboardImage(clipboardEvent) {
  const items = clipboardEvent.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        return file;
      }
    }
  }
  return null;
}
