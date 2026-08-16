import React, { useState, useEffect } from "react";
import { Search, Filter, BookOpen, Layers, User as UserIcon, BookDown, AlertCircle, Database, HelpCircle, LayoutGrid, Layers3, FlameKindling, ChevronLeft, ChevronRight } from "lucide-react";
import { Book, UserProfile, SupabaseConfigStatus } from "./types";
import Header from "./components/Header";
import BookCard from "./components/BookCard";
import AuthModal from "./components/AuthModal";
import AdminPanel from "./components/AdminPanel";
import DashboardDocs from "./components/DashboardDocs";
import ProfilePanel from "./components/ProfilePanel";
import LogoutConfirmModal from "./components/LogoutConfirmModal";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("livraria_user");
    if (!saved) return null;
    try {
      const parsed: UserProfile = JSON.parse(saved);
      if (parsed.email?.toLowerCase() === "lfalvespe@gmail.com") {
        if (parsed.role !== "admin") {
          parsed.role = "admin";
          localStorage.setItem("livraria_user", JSON.stringify(parsed));
        }
      } else {
        if (parsed.role !== "user") {
          parsed.role = "user";
          localStorage.setItem("livraria_user", JSON.stringify(parsed));
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("livraria_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("livraria_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };
  
  const [configStatus, setConfigStatus] = useState<SupabaseConfigStatus | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewGroupBy, setViewGroupBy] = useState<"none" | "genre" | "author">("none");
  const [activeTabGenre, setActiveTabGenre] = useState<string>("Todos");

  // Pagination & limits for books
  const [galleryPage, setGalleryPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [expandedGenres, setExpandedGenres] = useState<Record<string, boolean>>({});
  const [expandedAuthors, setExpandedAuthors] = useState<Record<string, boolean>>({});

  // Reset page when search term or groups change
  useEffect(() => {
    setGalleryPage(1);
  }, [searchQuery, viewGroupBy, itemsPerPage]);
  
  // UI states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [alertDownload, setAlertDownload] = useState(false);
  const [alertRoleDownload, setAlertRoleDownload] = useState(false);

  // Fetch configuration status
  const checkConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error("Falha ao obter status de config", err);
    }
  };

  // Fetch all books
  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (err) {
      console.error("Erro ao carregar livros", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfigStatus();
    loadBooks();
  }, []);

  // Guardar ref do usuário mais recente para evitar closures obsoletas (stale closures) no polling do effect
  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const hasProfileDiff = (u1: UserProfile | null, u2: UserProfile | null) => {
    if (!u1 || !u2) return true;
    if (u1.id !== u2.id) return true;
    if ((u1.name || "") !== (u2.name || "")) return true;
    if ((u1.avatar || "") !== (u2.avatar || "")) return true;
    if ((u1.status_message || "") !== (u2.status_message || "")) return true;
    if (u1.role !== u2.role) return true;
    if (u1.status !== u2.status) return true;
    
    const f1 = u1.favorites || [];
    const f2 = u2.favorites || [];
    if (f1.length !== f2.length || f1.some((v, i) => v !== f2[i])) return true;

    const r1 = u1.read_books || [];
    const r2 = u2.read_books || [];
    if (r1.length !== r2.length || r1.some((v, i) => v !== r2[i])) return true;

    if (JSON.stringify(u1.annotations || {}) !== JSON.stringify(u2.annotations || {})) return true;

    return false;
  };

  const syncProfileData = async () => {
    const currentUser = userRef.current;
    if (!currentUser?.id) return;

    try {
      const res = await fetch(`/api/users/${currentUser.id}/profile`);
      if (!res.ok) {
        throw new Error("Erro ao sincronizar dados mais recentes do perfil");
      }
      const updatedUser = await res.json();

      // Ler diretamente do localStorage para comparar e evitar re-render loop nas dependências do hook
      const savedStr = localStorage.getItem("livraria_user");
      if (!savedStr) {
        setUser(updatedUser);
        localStorage.setItem("livraria_user", JSON.stringify(updatedUser));
        return;
      }

      const localUser = JSON.parse(savedStr);
      const localFavoritesCount = localUser.favorites?.length || 0;
      const localReadBooksCount = localUser.read_books?.length || 0;
      const localHasName = !!localUser.name;
      const localHasStatus = !!localUser.status_message;

      const serverFavoritesCount = updatedUser.favorites?.length || 0;
      const serverReadBooksCount = updatedUser.read_books?.length || 0;
      const serverHasName = !!updatedUser.name;
      const serverHasStatus = !!updatedUser.status_message;

      // Se o servidor voltou zerado/incompleto mas temos dados locais robustos, significa que o servidor
      // perdeu o estado (ex: após redeploy no Render) ou falhou ao persistir. Vamos restaurar de forma bidirecional!
      const needsRestore = (
        (localFavoritesCount > serverFavoritesCount) ||
        (localReadBooksCount > serverReadBooksCount) ||
        (localHasName && !serverHasName) ||
        (localHasStatus && !serverHasStatus)
      );

      if (needsRestore) {
        console.log("Detectado que o servidor perdeu estado do usuário. Restaurando a partir dos dados locais...");
        try {
          const syncRes = await fetch(`/api/users/${currentUser.id}/sync-restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: localUser.email,
              name: localUser.name,
              avatar: localUser.avatar,
              status_message: localUser.status_message,
              favorites: localUser.favorites || [],
              read_books: localUser.read_books || [],
              annotations: localUser.annotations || {}
            })
          });
          
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.user) {
              if (hasProfileDiff(userRef.current, syncData.user)) {
                setUser(syncData.user);
              }
              localStorage.setItem("livraria_user", JSON.stringify(syncData.user));
              return;
            }
          }
        } catch (err) {
          console.error("Falha ao restaurar dados locais no servidor:", err);
        }
      }

      // Caso contrário ou se o restore falhar, aceitamos os dados do servidor se houver real diferença
      if (hasProfileDiff(userRef.current, updatedUser)) {
        setUser(updatedUser);
        localStorage.setItem("livraria_user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.warn("Não foi possível carregar os dados mais recentes do perfil do servidor:", err);
    }
  };

  // Sincronizar dados do usuário salvos no localStorage com os dados em tempo real no servidor (para sincronia multi-dispositivo)
  useEffect(() => {
    if (user?.id) {
      // Sincronizar na carga inicial / login
      syncProfileData();

      // Sincronizar ao retornar o foco à aba/janela do navegador (tab-focus synchronization)
      const handleFocus = () => {
        syncProfileData();
      };
      window.addEventListener("focus", handleFocus);

      // Sincronizar periodicamente em background a cada 10 segundos
      const intervalId = setInterval(() => {
        syncProfileData();
      }, 10000);

      return () => {
        window.removeEventListener("focus", handleFocus);
        clearInterval(intervalId);
      };
    }
  }, [user?.id]);

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    localStorage.setItem("livraria_user", JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setShowAdminPanel(false);
    setShowProfile(false);
    localStorage.removeItem("livraria_user");
  };

  const handleToggleFavorite = async (bookId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("livraria_user", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Erro ao favoritar livro", err);
    }
  };

  const handleToggleRead = async (bookId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/read/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("livraria_user", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Erro ao marcar livro como lido", err);
    }
  };

  // Filter books inside the app based on query
  const filteredBooks = books.filter(book => {
    const term = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term) ||
      book.genre.toLowerCase().includes(term)
    );
  });

  // Paginated books calculations
  const totalFiltered = filteredBooks.length;
  const startIndex = (galleryPage - 1) * itemsPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Calculate stats
  const totalBooksCount = books.length;
  const genresSet = Array.from(new Set(books.map(b => b.genre)));
  const authorsSet = Array.from(new Set(books.map(b => b.author)));

  // Generate Grouped Collections
  const groupedByGenre = filteredBooks.reduce((acc, book) => {
    if (!acc[book.genre]) acc[book.genre] = [];
    acc[book.genre].push(book);
    return acc;
  }, {} as Record<string, Book[]>);

  const groupedByAuthor = filteredBooks.reduce((acc, book) => {
    if (!acc[book.author]) acc[book.author] = [];
    acc[book.author].push(book);
    return acc;
  }, {} as Record<string, Book[]>);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900" id="app-root">
      
      {/* Global Header */}
      <Header
        user={user}
        configStatus={configStatus}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        showAdminPanel={showAdminPanel}
        onToggleAdminPanel={() => {
          setShowAdminPanel(!showAdminPanel);
          if (showDocs) setShowDocs(false);
          if (showProfile) setShowProfile(false);
        }}
        showProfile={showProfile}
        onToggleProfile={() => {
          setShowProfile(!showProfile);
          if (showAdminPanel) setShowAdminPanel(false);
          if (showDocs) setShowDocs(false);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Warning popup for downloads if visitor is not logged in */}
      {alertDownload && (
        <div id="download-warning-banner" className="bg-amber-500 text-white text-xs sm:text-sm py-3 px-4 font-medium flex items-center justify-between shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-100" />
            <span>Você precisa estar logado na biblioteca para acessar e realizar o download dos arquivos em formato ePUB!</span>
            <button
              onClick={() => {
                setAlertDownload(false);
                setIsAuthModalOpen(true);
              }}
              className="bg-white text-slate-900 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-150 cursor-pointer ml-3 shrink-0"
            >
              Fazer Login / Cadastrar
            </button>
          </div>
          <button onClick={() => setAlertDownload(false)} className="text-white hover:text-amber-100 font-bold ml-2">×</button>
        </div>
      )}

      {/* Warning popup for downloads if user role is user (Leitor) */}
      {alertRoleDownload && (
        <div id="role-download-warning-banner" className="bg-rose-650 text-white text-xs sm:text-sm py-3 px-4 font-medium flex items-center justify-between shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-205" />
            <span>Seu perfil de <strong>Leitor</strong> não possui permissão de download. Faça login como <strong>Administrador</strong> para baixar as obras!</span>
          </div>
          <button onClick={() => setAlertRoleDownload(false)} className="text-white hover:text-rose-100 font-bold ml-2">×</button>
        </div>
      )}

      {/* Main hero sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Toggleable Admin Panel */}
        {showAdminPanel && user?.role === "admin" && (
          <AdminPanel onBookAdded={loadBooks} books={books} currentUser={user} onBackToHome={() => setShowAdminPanel(false)} />
        )}

        {/* Toggleable Profile Panel */}
        {showProfile && user && (
          <ProfilePanel user={user} books={books} onBackToHome={() => setShowProfile(false)} onUpdateUser={(updated) => { setUser(updated); localStorage.setItem("livraria_user", JSON.stringify(updated)); }} />
        )}

        {/* Toggleable Documentation / Comparison Panel */}
        {showDocs && <DashboardDocs />}

        {/* Standard Content Section */}
        {!showAdminPanel && !showDocs && !showProfile && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Catalog Hero Stats bento */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 md:p-10 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="space-y-3 text-center md:text-left">
                <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold tracking-widest font-mono uppercase px-3 py-1 rounded-sm border border-blue-100 dark:border-blue-900/60">
                  Coleção Literária
                </span>
                <h3 className="text-2xl md:text-3xl font-sans font-bold tracking-tight text-slate-900 dark:text-white">
                  Qual o seu próximo livro favorito?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                  Uma coleção de obras de gêneros variados, clássicos, contemporâneos e atemporais.
                </p>
              </div>

              {/* Little stats block */}
              <div className="grid grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-6 rounded-xl border border-gray-200 dark:border-slate-800 divide-x divide-gray-150 dark:divide-slate-800 shrink-0 w-full md:w-auto">
                <div className="px-3 text-center">
                  <span className="block text-xl md:text-2xl font-bold font-display text-blue-600 dark:text-blue-400">{totalBooksCount}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Obras</span>
                </div>
                <div className="px-3 text-center">
                  <span className="block text-xl md:text-2xl font-bold font-display text-blue-600 dark:text-blue-400">{genresSet.length}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Gêneros</span>
                </div>
                <div className="px-3 text-center">
                  <span className="block text-xl md:text-2xl font-bold font-display text-blue-600 dark:text-blue-400">{authorsSet.length}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Autores</span>
                </div>
              </div>
            </div>

            {/* Filter controls / Search bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-4 flex flex-col md:flex-row items-center gap-4 justify-between" id="search-filter-box">
              
              {/* Search input */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquise por título, autor ou gênero..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>

              {/* Grouping Selectors (Genre, Autor, Todos) */}
              <div className="flex items-center gap-2 self-stretch md:self-auto scrollbar-none overflow-x-auto w-full md:w-auto shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-medium uppercase tracking-wide">Exibir em:</span>
                
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setViewGroupBy("none")}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      viewGroupBy === "none" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Galeria</span>
                  </button>
                  <button
                    onClick={() => setViewGroupBy("genre")}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      viewGroupBy === "genre" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Layers3 className="w-3.5 h-3.5" />
                    <span>Por Gênero</span>
                  </button>
                  <button
                    onClick={() => setViewGroupBy("author")}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      viewGroupBy === "author" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Por Autor</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Catalog list Loader states */}
            {loading ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xs">
                <div className="animate-pulse space-y-4 max-w-sm mx-auto">
                  <div className="bg-slate-200 dark:bg-slate-800 h-10 w-10 mx-auto rounded-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xs">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-755 mx-auto mb-3" />
                <h4 className="text-base font-sans font-semibold text-slate-800 dark:text-slate-200">Nenhum livro encontrado</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tente substituir os termos pesquisados ou cadastre novas obras usando uma conta Admin!</p>
              </div>
            ) : (
              <div id="catalog-main-content">
                
                {/* Mode A: Standard Gallery (No grouping) */}
                {viewGroupBy === "none" && (
                  <div className="space-y-8" id="no-grouping-wrapper">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" id="no-grouping-grid">
                      {paginatedBooks.map((book) => (
                        <BookCard
                          key={book.id}
                          book={book}
                          isLoggedIn={Boolean(user)}
                          userRole={user?.role}
                          isFavorite={user?.favorites?.includes(book.id)}
                          isRead={user?.read_books?.includes(book.id)}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleRead={handleToggleRead}
                          onDownloadRequest={() => setAlertDownload(true)}
                          onUnauthorizedDownload={() => setAlertRoleDownload(true)}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalFiltered > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800/80" id="gallery-pagination">
                        {/* Summary / Stats info */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
                          Exibindo <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(startIndex + 1, totalFiltered)}</span> a{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(startIndex + itemsPerPage, totalFiltered)}</span> de{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{totalFiltered}</span> livros
                        </div>

                        {/* Pagination Selector buttons */}
                        {totalPages > 1 && (
                          <div className="flex items-center gap-1.5" id="page-num-selectors">
                            <button
                              onClick={() => setGalleryPage(prev => Math.max(prev - 1, 1))}
                              disabled={galleryPage === 1}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 disabled:opacity-55 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Página Anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: totalPages }).map((_, idx) => {
                              const pageNum = idx + 1;
                              const isCurrent = pageNum === galleryPage;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setGalleryPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg text-xs font-semibold font-mono tracking-tight transition-all cursor-pointer flex items-center justify-center border ${
                                    isCurrent
                                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => setGalleryPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={galleryPage === totalPages}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 disabled:opacity-55 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Próxima Página"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2" id="page-size-selector">
                          <span className="text-[11px] text-slate-450 dark:text-slate-450 font-medium uppercase tracking-wider">Itens por página:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                          >
                            <option value={8}>8</option>
                            <option value={12}>12 (Padrão)</option>
                            <option value={24}>24</option>
                            <option value={48}>48</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode B: Grouped By Genre */}
                {viewGroupBy === "genre" && (
                   <div className="space-y-10" id="grouped-by-genre-container">
                    {(Object.entries(groupedByGenre) as [string, Book[]][]).map(([genreName, bookList]) => {
                      const isExpanded = expandedGenres[genreName];
                      const limit = 4;
                      const hasMore = bookList.length > limit;
                      const displayedBooks = isExpanded ? bookList : bookList.slice(0, limit);

                      return (
                        <div key={genreName} className="space-y-4 animate-in duration-300" id={`genre-section-${genreName}`}>
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 text-xs font-bold uppercase py-0.5 px-2 rounded font-mono">{bookList.length}</span>
                              <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-150 tracking-tight">Obras de <span className="text-blue-600 dark:text-blue-400">{genreName}</span></h3>
                            </div>
                            {hasMore && (
                              <button
                                onClick={() => setExpandedGenres(prev => ({ ...prev, [genreName]: !prev[genreName] }))}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                {isExpanded ? "Mostrar menos" : `Ver todos os ${bookList.length} livros`}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayedBooks.map((book) => (
                              <BookCard
                                key={book.id}
                                book={book}
                                isLoggedIn={Boolean(user)}
                                userRole={user?.role}
                                isFavorite={user?.favorites?.includes(book.id)}
                                isRead={user?.read_books?.includes(book.id)}
                                onToggleFavorite={handleToggleFavorite}
                                onToggleRead={handleToggleRead}
                                onDownloadRequest={() => setAlertDownload(true)}
                                onUnauthorizedDownload={() => setAlertRoleDownload(true)}
                              />
                            ))}
                          </div>
                          
                          {/* Sleek bottom card expander button */}
                          {hasMore && !isExpanded && (
                            <div className="flex justify-center pt-2">
                              <button
                                onClick={() => setExpandedGenres(prev => ({ ...prev, [genreName]: true }))}
                                className="text-xs bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 rounded-lg py-2 px-6 font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                Ver mais {bookList.length - limit} livros de {genreName}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mode C: Grouped By Author */}
                {viewGroupBy === "author" && (
                   <div className="space-y-10" id="grouped-by-author-container">
                    {(Object.entries(groupedByAuthor) as [string, Book[]][]).map(([authorName, bookList]) => {
                      const isExpanded = expandedAuthors[authorName];
                      const limit = 4;
                      const hasMore = bookList.length > limit;
                      const displayedBooks = isExpanded ? bookList : bookList.slice(0, limit);

                      return (
                        <div key={authorName} className="space-y-4 animate-in duration-300" id={`author-section-${authorName}`}>
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 text-xs font-bold uppercase py-0.5 px-2 rounded font-mono">{bookList.length}</span>
                              <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-150 tracking-tight font-sans">Obras de <span className="text-blue-600 dark:text-blue-400">{authorName}</span></h3>
                            </div>
                            {hasMore && (
                              <button
                                onClick={() => setExpandedAuthors(prev => ({ ...prev, [authorName]: !prev[authorName] }))}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                {isExpanded ? "Mostrar menos" : `Ver todos os ${bookList.length} livros`}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayedBooks.map((book) => (
                              <BookCard
                                key={book.id}
                                book={book}
                                isLoggedIn={Boolean(user)}
                                userRole={user?.role}
                                isFavorite={user?.favorites?.includes(book.id)}
                                isRead={user?.read_books?.includes(book.id)}
                                onToggleFavorite={handleToggleFavorite}
                                onToggleRead={handleToggleRead}
                                onDownloadRequest={() => setAlertDownload(true)}
                                onUnauthorizedDownload={() => setAlertRoleDownload(true)}
                              />
                            ))}
                          </div>

                          {/* Sleek bottom card expander button */}
                          {hasMore && !isExpanded && (
                            <div className="flex justify-center pt-2">
                              <button
                                onClick={() => setExpandedAuthors(prev => ({ ...prev, [authorName]: true }))}
                                className="text-xs bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 rounded-lg py-2 px-6 font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                Ver mais {bookList.length - limit} livros por {authorName}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
            
          </div>
        )}

      </main>

      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          handleLogout();
          setIsLogoutConfirmOpen(false);
        }}
      />

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 py-8 text-xs mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Minha Estante. Todos os direitos reservados.</p>
          <div className="flex flex-col items-center sm:items-end text-center sm:text-right gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Fernando Alves</span>
            <a href="mailto:lfalvespe@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              lfalvespe@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
