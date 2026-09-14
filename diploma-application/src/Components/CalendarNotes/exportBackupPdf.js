import jsPDF from "jspdf";

export function exportWorkspaceBackupPdf({
  events = [],
  categories = [],
  activeTabs = [],
  workspaceName = "Workspace Notes & Tasks Backup",
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let cursorY = margin;

  const checkPageBreak = (neededHeight) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`${workspaceName} - Clean Notes Archive`, margin, 10);
    doc.text(`Exported: ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`, pageWidth - margin, 10, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // Header Title
  drawHeader();
  cursorY = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("Workspace Backup & Notes Archive", margin, cursorY);
  cursorY += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Structured export grouped by focus topics and categories.", margin, cursorY);
  cursorY += 10;

  // Metrics Summary Box
  const totalNotes = events.length;
  const doneNotes = events.filter((e) => e.status === "done").length;
  const inProgressNotes = events.filter((e) => e.status === "in-progress").length;
  const todoNotes = events.filter((e) => e.status !== "done" && e.status !== "in-progress").length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const colW = (pageWidth - margin * 2) / 4;
  doc.text(`TOTAL NOTES: ${totalNotes}`, margin + 6, cursorY + 7);
  doc.text(`COMPLETED: ${doneNotes}`, margin + colW + 6, cursorY + 7);
  doc.text(`IN PROGRESS: ${inProgressNotes}`, margin + colW * 2 + 6, cursorY + 7);
  doc.text(`PENDING: ${todoNotes}`, margin + colW * 3 + 6, cursorY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Total Categories: ${categories.length}`, margin + 6, cursorY + 12.5);
  doc.text(`Active Modules: ${activeTabs.join(", ")}`, margin + colW + 6, cursorY + 12.5);

  cursorY += 24;

  // Render Notes Grouped by Category/Topic
  categories.forEach((cat) => {
    const catNotes = events.filter(
      (e) => e.categoryId === cat.id || e.folderId === cat.id
    );

    checkPageBreak(20);

    // Topic Header Bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 8, 1, 1, "FD");

    // Colored topic indicator
    doc.setFillColor(cat.color || "#4f46e5");
    doc.rect(margin, cursorY, 3.5, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOPIC: ${(cat.title || cat.name || cat.id).toUpperCase()}`, margin + 6, cursorY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${catNotes.length} ${catNotes.length === 1 ? "note" : "notes"})`, pageWidth - margin - 6, cursorY + 5.5, { align: "right" });

    cursorY += 12;

    if (catNotes.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("No notes recorded under this topic.", margin + 6, cursorY);
      cursorY += 8;
    } else {
      catNotes.forEach((note, nIdx) => {
        checkPageBreak(24);

        let statusStr = "[To Do]";
        if (note.status === "done") statusStr = "[Completed]";
        else if (note.status === "in-progress") statusStr = "[In Progress]";

        // Note title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        const titleText = `${nIdx + 1}. ${note.title || "Untitled Note"}`;
        doc.text(titleText, margin + 6, cursorY);

        // Date and Status meta
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const dateStr = note.date || "No date";
        const timeStr = note.time ? ` at ${note.time}` : "";
        doc.text(`Date: ${dateStr}${timeStr}  |  Status: ${statusStr}`, margin + 6, cursorY + 4.5);

        cursorY += 8.5;

        // Content
        if (note.content) {
          const cleanContent = note.content
            .replace(/<br\s*[/]?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<[^>]+>/gi, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
            .replace(/[\u{2600}-\u{26FF}]/gu, "")
            .replace(/[\u{2700}-\u{27BF}]/gu, "")
            .trim();

          if (cleanContent) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            const splitLines = doc.splitTextToSize(cleanContent, pageWidth - margin * 2 - 12);
            checkPageBreak(splitLines.length * 4 + 2);
            doc.text(splitLines, margin + 6, cursorY);
            cursorY += splitLines.length * 4 + 2;
          }
        }

        // Embedded Drawing / Sketch if attached
        if (note.drawingDataUrl || note.sketchUrl) {
          try {
            const img = note.drawingDataUrl || note.sketchUrl;
            checkPageBreak(32);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Hand-Drawn Diagram / Sketch Attached:", margin + 6, cursorY);
            cursorY += 3;
            doc.addImage(img, "PNG", margin + 6, cursorY, 44, 25);
            cursorY += 28;
          } catch {}
        }

        // Divider line between notes
        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, cursorY, pageWidth - margin, cursorY);
        cursorY += 5;
      });
    }

    cursorY += 4;
  });

  // Footer Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: "center" });
  }

  const filename = `notes-backup-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
