import React from "react";
import { BookOpen, LogOut, User, LayoutDashboard, HelpCircle, AlertCircle, Database, Sun, Moon } from "lucide-react";
import { UserProfile, SupabaseConfigStatus } from "../types";

interface HeaderProps {
  user: UserProfile | null;
  configStatus: SupabaseConfigStatus | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  showAdminPanel: boolean;
  onToggleAdminPanel: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({
  user,
  configStatus,
  onOpenAuth,
  onLogout,
  showAdminPanel,
  onToggleAdminPanel,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 relative z-10 animate-in slide-in-from-top-4 duration-300" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => { if(showAdminPanel) onToggleAdminPanel(); }}>
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-sans font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Minha <span className="text-blue-600 dark:text-blue-400 font-display">Estante</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Biblioteca digital
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3" id="header-nav-group">
            
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-150 dark:border-slate-700/60"
              title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              id="theme-toggler"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Conditionally show Admin Panel Button if user has role === admin */}
            {user?.role === "admin" && (
              <button
                onClick={onToggleAdminPanel}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  showAdminPanel 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs" 
                    : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/65 hover:bg-amber-150 dark:hover:bg-amber-950/70"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>
                  {showAdminPanel ? (
                    <>
                      <span className="sm:hidden">Catálogo</span>
                      <span className="hidden sm:inline">Voltar para Home</span>
                    </>
                  ) : (
                    "Painel Administrador"
                  )}
                </span>
              </button>
            )}

            {/* Auth/User Actions */}
            {user ? (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 py-1 pl-3.5 pr-1 rounded-xl border border-gray-200 dark:border-slate-700/60">
                <div className="text-right">
                  <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">{user.email}</span>
                  <span className={`inline-block text-[9px] font-mono font-bold leading-none py-0.5 px-1.5 rounded-sm uppercase tracking-wide ${
                    user.role === "admin" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-305" : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-305"
                  }`}>
                    {user.role === "admin" ? "Administrador" : "Leitor"}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 p-2 rounded-lg cursor-pointer transition-all"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs hover:shadow-sm"
              >
                <User className="w-4 h-4" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}
            
          </div>
        </div>
      </div>
    </header>
  );
}
