import fs from "fs";
import path from "path";
import crypto from "crypto";

// File type definitions
export type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "csv" | "txt" | "md" | "json" | "zip";

export interface FileGenerationRequest {
  type: FileType;
  filename: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface FileGenerationResult {
  success: boolean;
  filename: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
  downloadUrl: string;
  error?: string;
}

// MIME type mapping
const MIME_TYPES: Record<FileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  zip: "application/zip",
};

// File icon mapping for UI
export const FILE_ICONS: Record<FileType, string> = {
  pdf: "📄",
  docx: "📝",
  xlsx: "📊",
  pptx: "📑",
  csv: "📋",
  txt: "📄",
  md: "📝",
  json: "{ }",
  zip: "📦",
};

// Temporary files directory
const TEMP_DIR = path.join(process.cwd(), "temp", "files");

// Ensure temp directory exists
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

// Clean old files (older than 1 hour)
function cleanOldFiles() {
  try {
    const now = Date.now();
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 3600000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.warn("[FileGen] Clean error:", err);
  }
}

// Validate filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*]/g, "")
    .trim();
}

// Generate PDF
async function generatePDF(content: string, filename: string): Promise<Buffer> {
  const PDFDocument = require("pdfkit");
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Parse content and add to PDF
    const lines = content.split("\n");
    let y = 50;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        doc.fontSize(24).font("Helvetica-Bold").text(line.slice(2), 50, y);
        y += 35;
      } else if (line.startsWith("## ")) {
        doc.fontSize(18).font("Helvetica-Bold").text(line.slice(3), 50, y);
        y += 28;
      } else if (line.startsWith("### ")) {
        doc.fontSize(14).font("Helvetica-Bold").text(line.slice(4), 50, y);
        y += 22;
      } else if (line.startsWith("| ")) {
        // Table row
        doc.fontSize(10).font("Helvetica").text(line, 50, y);
        y += 16;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        doc.fontSize(11).font("Helvetica").text(`• ${line.slice(2)}`, 70, y);
        y += 16;
      } else if (line.trim() === "") {
        y += 10;
      } else {
        doc.fontSize(11).font("Helvetica").text(line, 50, y);
        y += 16;
      }

      // Add new page if needed
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
    }

    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).font("Helvetica")
        .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 40, {
          align: "center",
        });
    }

    doc.end();
  });
}

// Generate DOCX
async function generateDOCX(content: string, filename: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, TableRow, TableCell, Table } = require("docx");

  const lines = content.split("\n");
  const children: any[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), bold: true, size: 48 })],
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(3), bold: true, size: 36 })],
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4), bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${line.slice(2)}`, size: 22 })],
        bullet: { level: 0 },
      }));
    } else if (line.startsWith("| ")) {
      // Simple table row rendering
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 20, font: "Courier New" })],
      }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ children: [] }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}

// Generate XLSX
async function generateXLSX(content: string, filename: string): Promise<Buffer> {
  const XLSX_LIB = require("xlsx");

  // Parse content as CSV-like data or structured content
  const lines = content.split("\n").filter(l => l.trim());
  
  // Try to parse as CSV first
  let data: any[][] = [];
  
  if (content.includes(",")) {
    // Parse as CSV
    for (const line of lines) {
      const row = line.split(",").map(cell => cell.trim().replace(/^["']|["']$/g, ""));
      data.push(row);
    }
  } else {
    // Create structured data from content
    data.push(["Item", "Content"]);
    for (const line of lines) {
      if (line.trim()) {
        data.push([data.length.toString(), line.trim()]);
      }
    }
  }

  // Create workbook
  const wb = XLSX_LIB.utils.book_new();
  const ws = XLSX_LIB.utils.aoa_to_sheet(data);

  // Auto column width
  const colWidths = data[0]?.map((_: any, i: number) => {
    const maxLen = data.reduce((max, row) => {
      const cell = String(row[i] || "");
      return Math.max(max, cell.length);
    }, 10);
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  XLSX_LIB.utils.book_append_sheet(wb, ws, "Sheet1");

  // Generate buffer
  const xlsxBuffer = XLSX_LIB.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(xlsxBuffer);
}

// Generate PPTX
async function generatePPTX(content: string, filename: string): Promise<Buffer> {
  const PptxGenJS = require("pptxgenjs");

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "CHAT GPR";
  pptx.title = filename.replace(/\.[^.]+$/, "");

  const lines = content.split("\n");
  let currentSlide: any = null;
  let bulletPoints: string[] = [];

  const addSlide = () => {
    if (bulletPoints.length > 0 && currentSlide) {
      currentSlide.addText(bulletPoints.map(p => ({ text: p, options: { bullet: true, fontSize: 18 } })), {
        x: 1, y: 2, w: 8, h: 4,
      });
      bulletPoints = [];
    }
    currentSlide = pptx.addSlide();
    currentSlide.background = { color: "0B0D10" };
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      addSlide();
      currentSlide.addText(line.slice(2), {
        x: 1, y: 0.5, w: 8, h: 1.5,
        fontSize: 36, color: "FFFFFF", bold: true,
      });
    } else if (line.startsWith("## ")) {
      addSlide();
      currentSlide.addText(line.slice(3), {
        x: 1, y: 0.5, w: 8, h: 1,
        fontSize: 28, color: "818CF8", bold: true,
      });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      bulletPoints.push(line.slice(2));
    } else if (line.trim() === "") {
      if (bulletPoints.length > 0) {
        addSlide();
      }
    } else {
      if (!currentSlide) addSlide();
      currentSlide.addText(line, {
        x: 1, y: currentSlide.addText ? 2 : 1, w: 8, h: 0.5,
        fontSize: 18, color: "CBD5E1",
      });
    }
  }

  // Add remaining bullet points
  if (bulletPoints.length > 0 && currentSlide) {
    currentSlide.addText(bulletPoints.map(p => ({ text: p, options: { bullet: true, fontSize: 18 } })), {
      x: 1, y: 2, w: 8, h: 4,
    });
  }

  // Generate buffer
  const pptxBuffer = await pptx.write({ outputType: "buffer" });
  return Buffer.from(pptxBuffer);
}

// Generate CSV
async function generateCSV(content: string, filename: string): Promise<Buffer> {
  // Parse content and ensure proper CSV format
  const lines = content.split("\n").filter(l => l.trim());
  let csvContent = "";

  for (const line of lines) {
    if (line.includes(",")) {
      csvContent += line + "\n";
    } else {
      csvContent += `"${line.replace(/"/g, '""')}"\n`;
    }
  }

  return Buffer.from(csvContent, "utf-8");
}

// Generate TXT
async function generateTXT(content: string, filename: string): Promise<Buffer> {
  return Buffer.from(content, "utf-8");
}

// Generate Markdown
async function generateMD(content: string, filename: string): Promise<Buffer> {
  return Buffer.from(content, "utf-8");
}

// Generate JSON
async function generateJSON(content: string, filename: string): Promise<Buffer> {
  try {
    // Try to parse as JSON first
    JSON.parse(content);
    return Buffer.from(content, "utf-8");
  } catch {
    // If not valid JSON, wrap in object
    const jsonData = {
      content: content,
      generatedAt: new Date().toISOString(),
      generatedBy: "CHAT GPR",
    };
    return Buffer.from(JSON.stringify(jsonData, null, 2), "utf-8");
  }
}

// Generate ZIP (containing the content as a text file)
async function generateZIP(content: string, filename: string): Promise<Buffer> {
  const archiver = require("archiver");
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // Add content as text file
    const txtFilename = filename.replace(/\.[^.]+$/, ".txt");
    archive.append(content, { name: txtFilename });

    archive.finalize();
  });
}

// Main generation function
export async function generateFile(request: FileGenerationRequest): Promise<FileGenerationResult> {
  try {
    ensureTempDir();
    cleanOldFiles();

    // Sanitize filename
    const safeFilename = sanitizeFilename(request.filename);
    if (!safeFilename) {
      return {
        success: false,
        filename: request.filename,
        mimeType: "",
        filePath: "",
        fileSize: 0,
        downloadUrl: "",
        error: "Invalid filename",
      };
    }

    // Generate unique filename
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(safeFilename) || `.${request.type}`;
    const baseName = path.basename(safeFilename, ext);
    const finalFilename = `${baseName}_${uniqueId}${ext}`;
    const filePath = path.join(TEMP_DIR, finalFilename);

    let fileBuffer: Buffer;

    switch (request.type) {
      case "pdf":
        fileBuffer = await generatePDF(request.content, finalFilename);
        break;
      case "docx":
        fileBuffer = await generateDOCX(request.content, finalFilename);
        break;
      case "xlsx":
        fileBuffer = await generateXLSX(request.content, finalFilename);
        break;
      case "pptx":
        fileBuffer = await generatePPTX(request.content, finalFilename);
        break;
      case "csv":
        fileBuffer = await generateCSV(request.content, finalFilename);
        break;
      case "txt":
        fileBuffer = await generateTXT(request.content, finalFilename);
        break;
      case "md":
        fileBuffer = await generateMD(request.content, finalFilename);
        break;
      case "json":
        fileBuffer = await generateJSON(request.content, finalFilename);
        break;
      case "zip":
        fileBuffer = await generateZIP(request.content, finalFilename);
        break;
      default:
        return {
          success: false,
          filename: request.filename,
          mimeType: "",
          filePath: "",
          fileSize: 0,
          downloadUrl: "",
          error: `Unsupported file type: ${request.type}`,
        };
    }

    // Write file to disk
    fs.writeFileSync(filePath, fileBuffer);

    const fileSize = fileBuffer.length;
    const mimeType = MIME_TYPES[request.type] || "application/octet-stream";
    const downloadUrl = `/api/files/download/${finalFilename}`;

    console.log(`[FileGen] Generated ${request.type.toUpperCase()}: ${finalFilename} (${(fileSize / 1024).toFixed(1)} KB)`);

    return {
      success: true,
      filename: finalFilename,
      mimeType,
      filePath,
      fileSize,
      downloadUrl,
    };
  } catch (err: any) {
    console.error("[FileGen] Generation error:", err);
    return {
      success: false,
      filename: request.filename,
      mimeType: "",
      filePath: "",
      fileSize: 0,
      downloadUrl: "",
      error: err.message || "File generation failed",
    };
  }
}

// Detect file generation intent from user message
export function detectFileIntent(message: string): { isFileRequest: boolean; fileType?: FileType; filename?: string } {
  const lower = message.toLowerCase();

  // File type detection patterns
  const fileTypePatterns: { pattern: RegExp; type: FileType; extensions: string[] }[] = [
    { pattern: /pdf|ភីឌីអិፍ/i, type: "pdf", extensions: [".pdf"] },
    { pattern: /word|docx|doc|វើដ|ឯកសារ/i, type: "docx", extensions: [".docx", ".doc"] },
    { pattern: /excel|xlsx|xls|ស្បែកសីទ|តារាង|spreadsheet/i, type: "xlsx", extensions: [".xlsx", ".xls"] },
    { pattern: /powerpoint|pptx|ppt|ប៉ើវើរបូអីន|slide/i, type: "pptx", extensions: [".pptx", ".ppt"] },
    { pattern: /csv|ស៊ីអិសវី/i, type: "csv", extensions: [".csv"] },
    { pattern: /json|ជេសូន/i, type: "json", extensions: [".json"] },
    { pattern: /zip|ស៊ីប|zip file/i, type: "zip", extensions: [".zip"] },
    { pattern: /markdown|\.md/i, type: "md", extensions: [".md"] },
    { pattern: /text file|txt|ឯកសារអត្ថបទ/i, type: "txt", extensions: [".txt"] },
  ];

  // Check for file generation triggers
  const fileTriggers = [
    /បង្កើត.*file/i,
    /create.*file/i,
    /generate.*file/i,
    /ធ្វើ.*file/i,
    /បង្កើត.*ឯកសារ/i,
    /បង្កើត.*pdf/i,
    /create.*pdf/i,
    /generate.*pdf/i,
    /បង្កើត.*word/i,
    /create.*word/i,
    /បង្កើត.*excel/i,
    /create.*excel/i,
    /បង្កើត.*powerpoint/i,
    /create.*powerpoint/i,
    /បង្កើត.*slide/i,
    /create.*slide/i,
    /download.*file/i,
    /ទាញយក.*file/i,
  ];

  const hasFileTrigger = fileTriggers.some(p => p.test(message));

  if (!hasFileTrigger) {
    return { isFileRequest: false };
  }

  // Detect file type
  for (const { pattern, type, extensions } of fileTypePatterns) {
    if (pattern.test(message)) {
      // Try to extract filename from message
      const filenameMatch = message.match(/(?:of|for|named?|called?|titled?|ឈ្មោះ|ជា)\s+["']?([^"']+)["']?/i);
      let filename = filenameMatch?.[1]?.trim();

      if (!filename) {
        // Generate default filename
        const timestamp = new Date().toISOString().slice(0, 10);
        filename = `document_${timestamp}`;
      }

      // Ensure correct extension
      if (!extensions.some(ext => filename!.toLowerCase().endsWith(ext))) {
        filename += extensions[0];
      }

      return { isFileRequest: true, fileType: type, filename };
    }
  }

  // Default to PDF if file trigger but no specific type
  const timestamp = new Date().toISOString().slice(0, 10);
  return {
    isFileRequest: true,
    fileType: "pdf",
    filename: `document_${timestamp}.pdf`,
  };
}
