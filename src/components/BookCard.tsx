import React, { useState } from "react";
import { Download, Book, Calendar, User, Eye, X, BookOpen } from "lucide-react";
import { Book as BookType } from "../types";

interface BookCardProps {
  book: BookType;
  isLoggedIn: boolean;
  userRole?: 'admin' | 'user';
  onDownloadRequest: () => void;
  onUnauthorizedDownload?: () => void;
  key?: string;
}

export default function BookCard({ book, isLoggedIn, userRole, onDownloadRequest, onUnauthorizedDownload }: BookCardProps) {
  const [showSynopsisModal, setShowSynopsisModal] = useState(false);

  const handleDownload = () => {
    if (!isLoggedIn) {
      onDownloadRequest();
    } else if (userRole === "user") {
      if (onUnauthorizedDownload) {
        onUnauthorizedDownload();
      }
    } else {
      // For standard files, open in new tab or trigger an HTML download
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
      id={`book-card-${book.id}`}
      className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-xs hover:shadow-sm transition-all duration-300 group flex flex-col h-full"
    >
      {/* Cover Image container */}
      <div 
        onClick={() => setShowSynopsisModal(true)}
        className="relative aspect-[15/17] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 cursor-pointer"
        title="Clique para ver a sinopse"
      >
        <img 
          src={book.cover_url} 
          alt={`Capa do livro ${book.title}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-100 font-semibold py-2 px-4 rounded-full text-xs flex items-center justify-center gap-1.5 shadow-md transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Ver Sinopse</span>
          </div>
        </div>

        {/* Genre Badge */}
        <span className="absolute top-3 left-3 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
          {book.genre}
        </span>
      </div>

      {/* Book details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 
            onClick={() => setShowSynopsisModal(true)}
            className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug hover:text-blue-700 dark:hover:text-blue-400 transition-colors line-clamp-2 cursor-pointer" 
            title="Clique para ver a sinopse"
          >
            {book.title}
          </h4>
          
          <div className="hidden sm:block mt-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="line-clamp-1">{book.author}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>Ano: {book.year}</span>
            </div>
          </div>

          {book.synopsis && (
            <>
              {/* Desktop Synopsis Preview Box */}
              <div 
                onClick={() => setShowSynopsisModal(true)}
                className="hidden sm:block mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed max-h-24 overflow-y-auto cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-850/60 transition-colors" 
                title="Clique para ver a sinopse completa"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Sinopse:</span>
                <p className="italic text-[11px] line-clamp-3">"{book.synopsis}"</p>
              </div>

              {/* Mobile Synopsis Button */}
              <button 
                onClick={() => setShowSynopsisModal(true)}
                className="sm:hidden w-full mt-3 text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-105 dark:hover:bg-slate-850 text-slate-705 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sinopse</span>
              </button>
            </>
          )}
        </div>

        {/* Action Button at bottom */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 mt-4">
          <button
            onClick={handleDownload}
            className={`w-full text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 border cursor-pointer transition-all ${
              isLoggedIn 
                ? userRole === "user"
                  ? "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border-rose-250 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 pointer-events-auto"
                  : "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-250 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 pointer-events-auto"
                : "bg-gray-150 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-705 border-gray-250 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {!isLoggedIn 
                ? "Cadastre-se para Baixar" 
                : userRole === "user"
                  ? "Baixar (Apenas Admin)"
                  : "Baixar Livro"}
            </span>
          </button>
        </div>
      </div>

      {showSynopsisModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-250 cursor-default"
          onClick={() => setShowSynopsisModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Title */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {book.genre}
                </span>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-105 leading-snug mt-1.5">
                  {book.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{book.author}</span>
                </p>
              </div>
              <button
                onClick={() => setShowSynopsisModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
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
                      <span><strong>Ano de Lançamento:</strong> {book.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span><strong>Gênero Literário:</strong> {book.genre}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Sinopse Completa</h4>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic max-h-60 overflow-y-auto whitespace-pre-line">
                  {book.synopsis ? `"${book.synopsis}"` : "Nenhuma sinopse disponível para esta obra."}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 font-semibold">
              <button
                onClick={() => setShowSynopsisModal(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  if (!isLoggedIn || userRole !== "user") {
                    setShowSynopsisModal(false);
                  }
                }}
                className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
                  isLoggedIn 
                    ? userRole === "user"
                      ? "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-xs" 
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
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
      )}
    </div>
  );
}
