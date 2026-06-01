import React, { useState, useRef } from "react";
import { User, Camera, Star, BookOpen, FileText, ArrowLeft, Save, CheckCircle, Heart, Notebook } from "lucide-react";
import { UserProfile, Book } from "../types";

interface ProfilePanelProps {
  user: UserProfile;
  books: Book[];
  onBackToHome: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function ProfilePanel({ user, books, onBackToHome, onUpdateUser }: ProfilePanelProps) {
  const [name, setName] = useState(user.name || "");
  const [statusMessage, setStatusMessage] = useState(user.status_message || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit annotation state per book
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>(() => {
    return user.annotations || {};
  });
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"favorites" | "read">("favorites");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter favorite and read books
  const favoriteBooksList = books.filter(b => user.favorites?.includes(b.id));
  const readBooksList = books.filter(b => user.read_books?.includes(b.id));
  
  // Calculate stats
  const totalFavorites = user.favorites?.length || 0;
  const totalRead = user.read_books?.length || 0;

  // Handle Image Upload Action
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          status_message: statusMessage,
          avatar
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar perfil.");
      }

      const data = await response.json();
      onUpdateUser(data.user);
      setSuccessMsg("Perfil atualizado com sucesso!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível atualizar o perfil.");
    } finally {
      setLoading(false);
    }
  };

  // Submit/Save Book Annotation
  const handleSaveAnnotation = async (bookId: string) => {
    setSavingNoteId(bookId);
    const noteText = editingNotes[bookId] || "";

    try {
      const response = await fetch(`/api/users/${user.id}/favorites/annotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bookId,
          note: noteText
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar anotação.");
      }

      const data = await response.json();
      onUpdateUser(data.user);
      setEditingNotes(prev => ({ ...prev, [bookId]: noteText }));
      
      // Temporary check visual alert
      const buttonEl = document.getElementById(`save-btn-${bookId}`);
      if (buttonEl) {
        const originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = "Salvo! ✓";
        buttonEl.style.backgroundColor = "#10b981";
        setTimeout(() => {
          buttonEl.innerHTML = originalText;
          buttonEl.style.backgroundColor = "";
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar sua anotação no momento.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleAnnotationChange = (bookId: string, val: string) => {
    setEditingNotes(prev => ({
      ...prev,
      [bookId]: val
    }));
  };

  return (
    <div id="user-profile-panel" className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Upper header action line */}
      <div className="px-6 py-5 border-b border-gray-150 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Catálogo</span>
        </button>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Perfil do Leitor
        </h2>
      </div>

      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Bio and Edit Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-50/80 dark:bg-slate-950/20 rounded-xl p-5 border border-slate-150 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Editar Informações Básicas</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Profile image picker container */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-dashed border-blue-500 flex items-center justify-center transition-all group-hover:opacity-90">
                    {avatar ? (
                      <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-450 dark:text-slate-500" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Clique na imagem acima para enviar uma foto
                </span>
              </div>

              {/* Editable Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-450 uppercase tracking-wide block">
                  Seu Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome do usuário"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Editable Status Message Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-450 uppercase tracking-wide block font-sans">
                  Mensagem de Status
                </label>
                <textarea
                  placeholder="Estou lendo..."
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                />
              </div>

              {/* Status information alerts */}
              {successMsg && (
                <div className="p-3 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 animate-in fade-in">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-455 animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? "Salvando..." : "Salvar Perfil"}</span>
              </button>
            </form>
          </div>

          {/* Quick Metrics display */}
          <div className="bg-slate-50/50 dark:bg-slate-950/10 p-5 rounded-xl border border-slate-150 dark:border-slate-850 grid grid-cols-2 gap-4">
            <div className="text-center p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
              <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1 fill-rose-500/20" />
              <span className="block text-xl font-bold text-slate-850 dark:text-white font-display">{totalFavorites}</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">Favoritos</span>
            </div>
            
            <div className="text-center p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <span className="block text-xl font-bold text-slate-850 dark:text-white font-display">{totalRead}</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">Lidos</span>
            </div>
          </div>
        </div>

        {/* Right Column: Favorites, Read Books & Custom Annotations List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 bg-white dark:bg-slate-900/60 flex flex-col h-full min-h-[450px]">
            
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-5 gap-4">
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold transition-all relative cursor-pointer ${
                  activeTab === "favorites"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Star className={`w-4 h-4 ${activeTab === "favorites" ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                <span>Favoritos ({totalFavorites})</span>
                {activeTab === "favorites" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("read")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold transition-all relative cursor-pointer ${
                  activeTab === "read"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${activeTab === "read" ? "text-emerald-500 fill-emerald-500/10" : "text-slate-400"}`} />
                <span>Lidos ({totalRead})</span>
                {activeTab === "read" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Dynamic Content List */}
            {(() => {
              const currentBooksList = activeTab === "favorites" ? favoriteBooksList : readBooksList;

              if (currentBooksList.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                    {activeTab === "favorites" ? (
                      <>
                        <Star className="w-10 h-10 text-slate-300 dark:text-slate-755 mb-2.5" />
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-350">Nenhum favorito ainda</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                          Navegue pelo catálogo e favorite seus livros clicando no ícone de estrela.
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-10 h-10 text-slate-300 dark:text-slate-755 mb-2.5" />
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-350">Nenhum livro lido ainda</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                          Navegue pelo catálogo e marque seus livros lidos clicando no ícone de check.
                        </p>
                      </>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
                  {currentBooksList.map((book) => {
                    const hasReadBadge = user.read_books?.includes(book.id);
                    const hasFavoriteBadge = user.favorites?.includes(book.id);
                    const annotation = editingNotes[book.id] || "";

                    return (
                      <div 
                        key={book.id} 
                        className="p-4 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col sm:flex-row sm:space-y-0 sm:gap-4 items-start animate-in fade-in duration-200"
                        id={`${activeTab}-book-item-${book.id}`}
                      >
                        {/* Left Thumbnail */}
                        <div className="w-16 h-20 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 p-1 self-center sm:self-start">
                          <img 
                            src={book.cover_url} 
                            alt={book.title} 
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>

                        {/* Right Details & Note */}
                        <div className="flex-1 space-y-2 w-full">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="text-xs font-bold text-slate-850 dark:text-white line-clamp-1">{book.title}</h4>
                              <span className="text-[9px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 px-1.5 py-0.2 rounded-sm">{book.genre}</span>
                              {hasFavoriteBadge && (
                                <span className="text-[9px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-750 dark:text-amber-400 border border-amber-105 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">★ Favorito</span>
                              )}
                              {hasReadBadge && (
                                <span className="text-[9px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">✓ Lido</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-550 dark:text-slate-400">por {book.author}</p>
                          </div>

                          {/* Custom Annotation Block */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-150 dark:border-slate-800/50">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest flex items-center gap-1 font-mono">
                              <Notebook className="w-3 h-3 text-slate-400" />
                              <span>Minha Anotação</span>
                            </label>
                            <div className="flex gap-2">
                              <textarea
                                placeholder="Adicione um comentário, resumo ou anotação pessoal sobre este livro..."
                                value={annotation}
                                onChange={(e) => handleAnnotationChange(book.id, e.target.value)}
                                rows={2}
                                className="flex-1 text-xs bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-2 text-slate-850 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                              />
                              <button
                                id={`save-btn-${book.id}`}
                                onClick={() => handleSaveAnnotation(book.id)}
                                disabled={savingNoteId === book.id}
                                className="px-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-250 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-400 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center shrink-0 cursor-pointer transition-all gap-1 h-auto min-h-[46px]"
                                title="Salvar Anotação"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span className="text-[9px]">Salvar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

      </div>

    </div>
  );
}
