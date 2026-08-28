import React from "react";
import { Download, FileText, FileSpreadsheet, FileImage, FileArchive, File, RefreshCw, AlertCircle } from "lucide-react";

export interface GeneratedFile {
  id: string;
  filename: string;
  mimeType: string;
  downloadUrl: string;
  fileSize: number;
  type: string;
  status: "generating" | "ready" | "error";
  error?: string;
  createdAt: number;
}

interface FileCardProps {
  file: GeneratedFile;
  onRetry?: () => void;
}

function getFileIcon(type: string, mimeType: string) {
  if (type === "pdf" || mimeType?.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (type === "docx" || mimeType?.includes("word")) return <FileText className="w-5 h-5 text-blue-400" />;
  if (type === "xlsx" || mimeType?.includes("spreadsheet")) return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
  if (type === "pptx" || mimeType?.includes("presentation")) return <FileImage className="w-5 h-5 text-orange-400" />;
  if (type === "csv") return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
  if (type === "zip") return <FileArchive className="w-5 h-5 text-purple-400" />;
  if (type === "json") return <File className="w-5 h-5 text-yellow-400" />;
  if (type === "md") return <FileText className="w-5 h-5 text-indigo-400" />;
  return <File className="w-5 h-5 text-[#94A3B8]" />;
}

function getFileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pdf: "PDF",
    docx: "Word",
    xlsx: "Excel",
    pptx: "PowerPoint",
    csv: "CSV",
    txt: "Text",
    md: "Markdown",
    json: "JSON",
    zip: "ZIP",
  };
  return labels[type] || type.toUpperCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onRetry }) => {
  if (file.status === "generating") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#14171E] border border-[#1E232E]">
        <div className="w-10 h-10 rounded-lg bg-[#1C2028] flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-[#6366F1] animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#CBD5E1] font-medium">Generating file...</p>
          <p className="text-xs text-[#64748B]">{file.filename}</p>
        </div>
      </div>
    );
  }

  if (file.status === "error") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#14171E] border border-red-500/20">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-400 font-medium">File generation failed</p>
          <p className="text-xs text-[#64748B]">{file.error || "Unknown error"}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-[#1C2028] border border-[#242933] text-xs text-[#94A3B8] hover:text-white hover:border-[#6366F1]/30 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#14171E] border border-[#1E232E] hover:border-[#6366F1]/20 transition-colors">
      {/* File Icon */}
      <div className="w-10 h-10 rounded-lg bg-[#1C2028] flex items-center justify-center flex-shrink-0">
        {getFileIcon(file.type, file.mimeType)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#CBD5E1] font-medium truncate">{file.filename}</p>
        <p className="text-xs text-[#64748B]">
          {getFileTypeLabel(file.type)} • {formatFileSize(file.fileSize)}
        </p>
      </div>

      {/* Download Button */}
      <a
        href={file.downloadUrl}
        download={file.filename}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-medium hover:shadow-md hover:shadow-[#6366F1]/20 transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download</span>
      </a>
    </div>
  );
};
