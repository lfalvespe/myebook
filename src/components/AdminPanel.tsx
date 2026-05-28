import React, { useState, useEffect } from "react";
import { Upload, Users, BookOpen, Key, Trash2, Ban, ShieldCheck, CheckCircle2, UserCheck, RefreshCw, X, ShieldAlert, Layers, Pencil } from "lucide-react";
import { Book, UserProfile } from "../types";

interface AdminPanelProps {
  onBookAdded: () => void;
  books: Book[];
  currentUser?: UserProfile | null;
}

export default function AdminPanel({ onBookAdded, books, currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"register" | "manage-books" | "users">("register");
  
  // Book register states
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [customGenre, setCustomGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Book edit states
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editGenre, setEditGenre] = useState("Romance");
  const [editCustomGenre, setEditCustomGenre] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editEpubFile, setEditEpubFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
  const [bookLoading, setBookLoading] = useState(false);
  const [bookMessage, setBookMessage] = useState({ success: true, text: "" });

  // Users lists states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [modUserEmail, setModUserEmail] = useState("");
  const [modUserId, setModUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");
  const [userErrorMessage, setUserErrorMessage] = useState("");
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // New User Registration Form states
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");
  const [newUserRegLoading, setNewUserRegLoading] = useState(false);

  const genres = ["Romance", "Ficção Científica", "História", "Fantasia", "Biografia", "Tecnologia", "Policial / Suspense", "Outro"];

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleEpubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEpubFile(e.target.files[0]);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookLoading(true);
    setBookMessage({ success: true, text: "" });

    try {
      if (!epubFile) {
        throw new Error("Você precisa fazer o upload de um arquivo EPUB.");
      }

      let coverBase64 = "";
      if (coverFile) {
        coverBase64 = await fileToBase64(coverFile);
      }

      const epubBase64 = await fileToBase64(epubFile);
      const finalGenre = genre === "Outro" ? customGenre || "Geral" : genre;

      const payload = {
        title,
        author,
        year,
        genre: finalGenre,
        synopsis,
        cover_base64: coverBase64,
        cover_filename: coverFile?.name || "",
        epub_base64: epubBase64,
        epub_filename: epubFile.name
      };

      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao registrar.");
      }

      const msg = data.warning 
        ? `Livro cadastrado! (${data.warning})` 
        : "Livro cadastrado com sucesso e integrado ao sistema!";
      setBookMessage({ success: true, text: msg });
      setTitle("");
      setAuthor("");
      setYear("");
      setSynopsis("");
      setCoverFile(null);
      setEpubFile(null);
      setCoverPreview(null);
      
      // Notify parent to refetch books
      onBookAdded();

    } catch (err: any) {
      setBookMessage({ success: false, text: err.message || "Falha ao enviar livro." });
    } finally {
      setBookLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      setUserErrorMessage("Por favor, preencha todos os campos.");
      setTimeout(() => setUserErrorMessage(""), 3000);
      return;
    }
    if (newUserPassword.length < 4) {
      setUserErrorMessage("A senha do usuário deve ter pelo menos 4 caracteres.");
      setTimeout(() => setUserErrorMessage(""), 3000);
      return;
    }

    setNewUserRegLoading(true);
    setUserErrorMessage("");
    setUserSuccessMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.id || ""}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar usuário.");
      }

      setUserSuccessMessage(data.message || "Novo usuário cadastrado com sucesso!");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      setShowAddUserForm(false);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(""), 4000);
    } catch (err: any) {
      setUserErrorMessage(err.message || "Falha técnica ao cadastrar usuário.");
      setTimeout(() => setUserErrorMessage(""), 4000);
    } finally {
      setNewUserRegLoading(false);
    }
  };

  // Fetch registered users
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao obter usuários.");
      }
      setUsers(data);
    } catch (err: any) {
      setUsersError(err.message || "Erro para listar usuários.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Actions for users
  const toggleBanStatus = async (userId: string, currentStatus: "active" | "banned") => {
    const nextStatus = currentStatus === "active" ? "banned" : "active";
    try {
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao alterar status no servidor.");
      }
      
      setUserSuccessMessage(`Status do usuário alterado para: ${nextStatus === "active" ? 'Ativo' : 'Banido'}`);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(""), 2000);
    } catch (err: any) {
      setUserErrorMessage(err.message || "Não foi possível alterar o status do usuário.");
      setTimeout(() => setUserErrorMessage(""), 3000);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: "admin" | "user") => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const response = await fetch(`/api/users/${userId}/change-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao alterar cargo no servidor.");
      }
      
      setUserSuccessMessage(`Cargo atualizado para: ${nextRole === "admin" ? 'Admin' : 'Leitor'}`);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(""), 2000);
    } catch (err: any) {
      setUserErrorMessage(err.message || "Não foi possível alterar o cargo do usuário.");
      setTimeout(() => setUserErrorMessage(""), 3000);
    }
  };

  const startDeleteUser = (userId: string) => {
    setDeletingUserId(userId);
  };

  const confirmDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao excluir.");
      }
      
      setUserSuccessMessage("Usuário excluído com sucesso!");
      setDeletingUserId(null);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(""), 2000);
    } catch (err: any) {
      setUserErrorMessage(err.message || "Não foi possível excluir o usuário.");
      setTimeout(() => setUserErrorMessage(""), 3000);
    }
  };

  const openPasswordModal = (userId: string, userEmail: string) => {
    setModUserId(userId);
    setModUserEmail(userEmail);
    setNewPassword("");
  };

  const saveNewPassword = async () => {
    if (!modUserId) return;
    if (newPassword.length < 4) {
      setUserErrorMessage("A senha de segurança deve conter no mínimo 4 caracteres.");
      setTimeout(() => setUserErrorMessage(""), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/users/${modUserId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) throw new Error("Falha ao redefinir.");

      setUserSuccessMessage(`Senha de ${modUserEmail} alterada com sucesso!`);
      setModUserId(null);
      setNewPassword("");
      setTimeout(() => setUserSuccessMessage(""), 3000);
    } catch (err: any) {
      setUserErrorMessage("Houve um problema ao trocar a senha.");
      setTimeout(() => setUserErrorMessage(""), 3000);
    }
  };

  // Convert and setup edit book targets
  const startEditingBook = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditYear(book.year.toString());
    const isStandardGenre = genres.includes(book.genre);
    setEditGenre(isStandardGenre ? book.genre : "Outro");
    setEditCustomGenre(isStandardGenre ? "" : book.genre);
    setEditSynopsis(book.synopsis || "");
    setEditCoverFile(null);
    setEditEpubFile(null);
    setEditCoverPreview(book.cover_url || null);
    setBookMessage({ success: true, text: "" });
  };

  const handleEditCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditCoverFile(file);
      setEditCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleEditEpubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditEpubFile(e.target.files[0]);
    }
  };

  const handleEditBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    setEditLoading(true);
    setBookMessage({ success: true, text: "" });

    try {
      let editCoverBase64 = "";
      if (editCoverFile) {
        editCoverBase64 = await fileToBase64(editCoverFile);
      }

      let editEpubBase64 = "";
      if (editEpubFile) {
        editEpubBase64 = await fileToBase64(editEpubFile);
      }

      const finalGenre = editGenre === "Outro" ? editCustomGenre || "Geral" : editGenre;

      const payload = {
        title: editTitle,
        author: editAuthor,
        year: editYear,
        genre: finalGenre,
        synopsis: editSynopsis,
        cover_url: editingBook.cover_url,
        file_url: editingBook.file_url,
        cover_base64: editCoverBase64 || undefined,
        cover_filename: editCoverFile?.name || "",
        epub_base64: editEpubBase64 || undefined,
        epub_filename: editEpubFile?.name || ""
      };

      const response = await fetch(`/api/books/${editingBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao atualizar o livro.");
      }

      const msg = data.warning 
        ? `Livro atualizado! (${data.warning})` 
        : "Livro atualizado com sucesso!";
      setBookMessage({ success: true, text: msg });
      setEditingBook(null);
      onBookAdded();
    } catch (err: any) {
      setBookMessage({ success: false, text: err.message || "Falha ao atualizar livro." });
    } finally {
      setEditLoading(false);
    }
  };

  const startDeleteBook = (bookId: string) => {
    setDeletingBookId(bookId);
  };

  const confirmDeleteBook = async (bookId: string, titleName: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir o livro.");
      }
      
      setUserSuccessMessage(`Livro "${titleName}" excluído com sucesso!`);
      setDeletingBookId(null);
      setTimeout(() => setUserSuccessMessage(""), 3000);
      onBookAdded();
    } catch (err: any) {
      setUserErrorMessage(err.message || "Erro ao tentar excluir.");
      setTimeout(() => setUserErrorMessage(""), 3500);
    }
  };

  return (
    <div id="admin-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 max-w-4xl mx-auto my-8">
      
      {/* Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5 mb-6" id="panel-tabs">
        <div>
          <h2 className="text-xl font-sans font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 py-1 px-2.5 rounded-lg text-xs font-mono font-bold uppercase">Painel</span>
            Controles de Administração
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gerencie a listagem de catálogos e configure permissões de usuários vinculados.</p>
        </div>

        {/* Tabs Control */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("register")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === "register" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cadastrar Livro</span>
          </button>
          <button
            onClick={() => setActiveTab("manage-books")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === "manage-books" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gerenciar Livros</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === "users" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gerenciar Contas</span>
          </button>
        </div>
      </div>

      {userSuccessMessage && (
        <div className="mb-4 bg-emerald-600 text-white text-sm p-3 rounded-lg flex items-center gap-2 animate-bounce animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{userSuccessMessage}</span>
        </div>
      )}

      {userErrorMessage && (
        <div className="mb-4 bg-rose-600 text-white text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse animate-in fade-in duration-300">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{userErrorMessage}</span>
        </div>
      )}

      {/* View 1: Cadastrar Livro */}
      {activeTab === "register" && (
        <form onSubmit={handleBookSubmit} className="space-y-6" id="register-book-form">
          {bookMessage.text && (
            <div className={`p-4 rounded-xl flex items-start gap-2 border text-sm ${
              bookMessage.success 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {bookMessage.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />}
              <span>{bookMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Título do Livro</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dom Casmurro"
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Autor do Livro</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: Machado de Assis"
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Ano de Publicação</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ex: 1899"
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Gênero Literário</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    {genres.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {genre === "Outro" && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Especifique o Gênero</label>
                  <input
                    type="text"
                    required
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="Ex: Realismo Trágico, Autoajuda"
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1 font-semibold">Sinopse do Livro</label>
                <textarea
                  required
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Escreva uma breve sinopse ou resumo da obra..."
                  rows={4}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Upload fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Imagem de Capa (.jpg, .png)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors relative bg-slate-50/50">
                  {coverPreview ? (
                    <div className="flex flex-col items-center gap-2">
                       <img src={coverPreview} alt="Preview" className="h-28 w-20 object-cover rounded shadow-xs" referrerPolicy="no-referrer" />
                      <span className="text-[10px] text-slate-500 font-mono block line-clamp-1 h-4">{coverFile?.name}</span>
                      <button 
                        type="button" 
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Remover capa
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-6 h-28">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-600 font-medium block">Escolher Imagem de Capa</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Arraste ou clique para selecionar</span>
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Arquivo Epub (.epub)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                  {epubFile ? (
                    <div className="flex flex-col items-center justify-center py-3">
                      <CheckCircle2 className="w-8 h-8 text-blue-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-800 block md:max-w-xs truncate">{epubFile.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{(epubFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <button 
                        type="button" 
                        onClick={() => setEpubFile(null)}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer mt-2"
                      >
                        Trocar arquivo ePUB
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-6">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-600 font-medium block">Escolher Livro EPUB</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Formato aceito: .epub</span>
                      <input type="file" accept=".epub" onChange={handleEpubChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={bookLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {bookLoading ? "Enviando arquivos e cadastrando..." : "Cadastrar Livro Publicamente"}
          </button>
        </form>
      )}

      {/* View 2: Gerenciar Livros (Editar/Excluir) */}
      {activeTab === "manage-books" && (
        <div className="space-y-6" id="manage-books-group">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Livros Disponíveis no Catálogo
          </span>

          {editingBook ? (
            /* Formulário de Edição do Livro */
            <form onSubmit={handleEditBookSubmit} className="space-y-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative animate-in fade-in" id="edit-book-form">
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-200/50 transition-colors"
                title="Cancelar edição"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Editando: <strong className="text-blue-700">{editingBook.title}</strong></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Título do Livro</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Autor do Livro</label>
                    <input
                      type="text"
                      required
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Ano de Publicação</label>
                      <input
                        type="number"
                        required
                        value={editYear}
                        onChange={(e) => setEditYear(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Gênero Literário</label>
                      <select
                        value={editGenre}
                        onChange={(e) => setEditGenre(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                      >
                        {genres.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editGenre === "Outro" && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Especifique o Gênero</label>
                      <input
                        type="text"
                        required
                        value={editCustomGenre}
                        onChange={(e) => setEditCustomGenre(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1 font-semibold">Sinopse do Livro</label>
                    <textarea
                      required
                      value={editSynopsis}
                      onChange={(e) => setEditSynopsis(e.target.value)}
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Upload fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Atualizar Imagem de Capa (Opcional)</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors relative bg-white">
                      {editCoverPreview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={editCoverPreview} alt="Preview" className="h-28 w-20 object-cover rounded shadow-xs" referrerPolicy="no-referrer" />
                          <span className="text-[10px] text-slate-500 font-mono block line-clamp-1 h-4">{editCoverFile ? editCoverFile.name : "Capa atual"}</span>
                          <button 
                            type="button" 
                            onClick={() => { setEditCoverFile(null); setEditCoverPreview(null); }}
                            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer mt-1"
                          >
                            Remover imagem de capa
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center py-6 h-28 animate-in duration-300">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-600 font-medium block">Escolher Nova Imagem de Capa</span>
                          <input type="file" accept="image/*" onChange={handleEditCoverChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Atualizar Arquivo Epub (.epub) (Opcional)</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-white">
                      {editEpubFile ? (
                        <div className="flex flex-col items-center justify-center py-3">
                          <CheckCircle2 className="w-8 h-8 text-blue-500 mb-1" />
                          <span className="text-xs font-semibold text-slate-800 block md:max-w-xs truncate">{editEpubFile.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{(editEpubFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <button 
                            type="button" 
                            onClick={() => setEditEpubFile(null)}
                            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer mt-2"
                          >
                            Trocar novo ePUB
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center py-6">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-600 font-medium block">Escolher Novo Livro EPUB</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Mantenha em branco para não alterar</span>
                          <input type="file" accept=".epub" onChange={handleEditEpubChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 px-6 rounded-lg text-sm transition-colors cursor-pointer font-semibold animate-in duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-lg text-sm transition-colors cursor-pointer font-semibold animate-in duration-300"
                >
                  {editLoading ? "Salvando mudanças..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          ) : (
            /* Lista de Livros Disponíveis com botões de Editar/Excluir */
            <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
              <table className="w-full table-auto text-left text-sm" id="admin-books-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-4">Capa</th>
                    <th className="py-3 px-4">Livro</th>
                    <th className="py-3 px-4">Autor</th>
                    <th className="py-3 px-4">Gênero / Ano</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {books.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <img 
                          src={book.cover_url} 
                          alt="" 
                          className="w-10 h-14 object-cover rounded shadow-xs bg-slate-100" 
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 text-sm">{book.title}</div>
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-sm font-sans italic" title={book.synopsis}>
                          {book.synopsis ? `"${book.synopsis}"` : "Sem sinopse informada."}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">{book.author}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        <div className="font-semibold">{book.genre}</div>
                        <div>Ano: {book.year}</div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 h-12 whitespace-nowrap">
                        {deletingBookId === book.id ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-lg text-xs leading-none">
                            <span className="font-semibold text-rose-700 select-none">Excluir?</span>
                            <button
                              onClick={() => confirmDeleteBook(book.id, book.title)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1 px-2.5 rounded-md transition-colors cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeletingBookId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-2 rounded-md transition-colors cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Botão de Editar */}
                            <button
                              onClick={() => startEditingBook(book)}
                              className="p-1 px-2.5 rounded-md border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                              title="Editar informações do livro"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            {/* Botão de Excluir */}
                            <button
                              onClick={() => startDeleteBook(book.id)}
                              className="p-1 px-2.5 rounded-md border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                              title="Excluir livro do catálogo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {books.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">Nenhum livro cadastrado no sistema.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 3: Gerenciar Usuários */}
      {activeTab === "users" && (
        <div className="space-y-6" id="manage-users-group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Contas Ativas no Catálogo
              <button onClick={fetchUsers} className="p-1 text-slate-400 hover:text-slate-600" title="Recarregar Contas">
                <RefreshCw className="w-3 h-3" />
              </button>
            </span>
            <button
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{showAddUserForm ? "Cancelar Cadastro" : "Cadastrar Novo Usuário"}</span>
            </button>
          </div>

          {/* Form to register a brand new user manually from admin view */}
          {showAddUserForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cadastrar Novo Usuário Manualmente
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Como administrador, você pode adicionar novas contas de usuário diretamente, sem necessidade de confirmação externa de e-mail.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">Endereço de E-mail:</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">Senha Provisória:</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">Tipo de Acesso (Função):</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as "user" | "admin")}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                  >
                    <option value="user">User (Leitor comum)</option>
                    <option value="admin">Admin (Administrador)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserForm(false);
                    setNewUserEmail("");
                    setNewUserPassword("");
                  }}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newUserRegLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {newUserRegLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{newUserRegLoading ? "Cadastrando..." : "Confirmar Cadastro"}</span>
                </button>
              </div>
            </form>
          )}

          {usersLoading ? (
            <div className="text-center py-12">
              <span className="text-sm text-slate-500">Carregando usuários cadastrados no banco de dados...</span>
            </div>
          ) : usersError ? (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-sm text-rose-800">
              {usersError}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full table-auto text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Acesso (Role)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações de Gerência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono text-xs">{row.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs py-0.5 px-2 rounded-md font-medium ${
                          row.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                        }`}>
                          {row.role === "admin" ? "Admin" : "User (Leitor)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs py-0.5 px-2 rounded-md font-medium ${
                          row.status === "banned" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {row.status === "banned" ? "Banido" : "Ativo"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 h-12">
                        {/* Reset Password Button */}
                        <button
                          onClick={() => openPasswordModal(row.id, row.email)}
                          className="p-1 px-1.5 rounded-md border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-500 transition-colors inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                          title="Redefinir senha de segurança"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Senha</span>
                        </button>

                        {/* Ban / Unban Button */}
                        <button
                          onClick={() => toggleBanStatus(row.id, row.status)}
                          className={`p-1 px-1.5 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer ${
                            row.status === "banned" 
                              ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800"
                              : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800"
                          }`}
                          title={row.status === "banned" ? "Ativar conta" : "Banir conta do site"}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{row.status === "banned" ? "Desbanir" : "Banir"}</span>
                        </button>

                        {/* Role Swap Button */}
                        <button
                          onClick={() => toggleUserRole(row.id, row.role)}
                          className="p-1 px-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Alternar cargo administrativo"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Mudar Função</span>
                        </button>

                        {/* Delete account permanently */}
                        {deletingUserId === row.id ? (
                          <div className="inline-flex items-center gap-1 bg-rose-100 border border-rose-300 p-1 rounded-md text-[11px] leading-none">
                            <span className="font-semibold text-rose-800 px-1 select-none">Excluir?</span>
                            <button
                              onClick={() => confirmDeleteUser(row.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-0.5 px-1.5 rounded-md transition-colors cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-0.5 px-1 rounded-md transition-colors cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startDeleteUser(row.id)}
                            className="p-1 rounded-md border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors inline-flex items-center p-1.5 cursor-pointer"
                            title="Excluir conta permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-xs text-slate-400">Nenhum outro usuário registrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Inline Change Password Drawer */}
          {modUserId && (
            <div className="bg-slate-50 border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row md:items-end gap-4 animate-in slide-in-from-bottom-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    Nova Senha de Segurança para: <span className="text-blue-750 font-mono bg-blue-50 px-1.5 rounded ml-1 lowercase">{modUserEmail}</span>
                  </h4>
                  <button onClick={() => setModUserId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Informe a nova senha (min. 4 caracteres)"
                  className="w-full bg-white border border-gray-200 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={saveNewPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer h-10 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Nova Senha</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
