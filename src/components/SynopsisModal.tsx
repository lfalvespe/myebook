import React, { useEffect } from "react";
import { X, Calendar, BookOpen, User, Download } from "lucide-react";
import { Book as BookType } from "../types";

interface SynopsisModalProps {
  book: BookType | null;
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userRole?: "admin" | "user";
  onDownloadRequest: () => void;
  onUnauthorizedDownload?: () => void;
}

export default function SynopsisModal({
  book,
  isOpen,
  onClose,
  isLoggedIn,
  userRole,
  onDownloadRequest,
  onUnauthorizedDownload,
}: SynopsisModalProps) {
  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !book) return null;

  const handleDownload = () => {
    if (!isLoggedIn) {
      onDownloadRequest();
    } else if (userRole === "user") {
      if (onUnauthorizedDownload) {
        onUnauthorizedDownload();
      }
    } else {
      const link = document.createElement("a");
      link.href = book.file_url;
      link.setAttribute("download", `${book.title} - ${book.author}.epub`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      id="book-synopsis-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-250 cursor-default"
      onClick={onClose}
    >
      <div
        id="book-synopsis-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Title */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              {book.genre}
            </span>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug mt-1.5 font-sans">
              {book.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{book.author}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Fechar sinopse"
            id="synopsis-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-28 h-40 shrink-0 mx-auto sm:mx-0 shadow-md rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800">
              <img
                src={book.cover_url}
                alt={`Capa de ${book.title}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 space-y-3 flex flex-col justify-center">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    <strong>Ano de Lançamento:</strong> {book.year}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    <strong>Gênero Literário:</strong> {book.genre}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
              Sinopse Completa
            </h4>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic max-h-60 overflow-y-auto whitespace-pre-line">
              {book.synopsis ? `"${book.synopsis}"` : "Nenhuma sinopse disponível para esta obra."}
            </div>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 font-semibold">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            id="synopsis-modal-cancel-btn"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              handleDownload();
              if (!isLoggedIn || userRole !== "user") {
                onClose();
              }
            }}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
              isLoggedIn
                ? userRole === "user"
                  ? "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-xs"
                : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
            id="synopsis-modal-download-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {!isLoggedIn
                ? "Cadastre-se para Baixar"
                : userRole === "user"
                ? "Privado para Admin"
                : "Baixar Livro"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
