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
  showProfile: boolean;
  onToggleProfile: () => void;
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
  showProfile,
  onToggleProfile,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 relative z-10 animate-in slide-in-from-top-4 duration-300" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* LAYOUT PARA DESKTOP (telas sm e maiores) */}
        <div className="hidden sm:flex justify-between items-center gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => { if(showAdminPanel) onToggleAdminPanel(); if(showProfile) onToggleProfile(); }}>
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
          <div className="flex items-center gap-3 animate-in fade-in" id="header-nav-group-desktop">
            
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-150 dark:border-slate-700/60"
              title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              id="theme-toggler-desktop"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
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
                      <span className="hidden sm:inline">Voltar para Home</span>
                    </>
                  ) : (
                    "Painel Administrador"
                  )}
                </span>
              </button>
            )}

            {/* Profile Button for Logged-in Users */}
            {user && (
              <button
                onClick={onToggleProfile}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  showProfile 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-150 dark:border-slate-700/60 hover:bg-slate-150 dark:hover:bg-slate-700"
                }`}
                title="Meu Perfil"
              >
                <User className="w-4 h-4" />
                <span>{showProfile ? "Catálogo" : "Meu Perfil"}</span>
              </button>
            )}

            {/* Auth/User Actions */}
            {user ? (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 py-1 pl-3.5 pr-1 rounded-xl border border-gray-200 dark:border-slate-700/60">
                {user.name && user.avatar ? (
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full object-cover border border-blue-500 shadow-xs shrink-0" 
                    />
                    <div className="text-right">
                      <span className="block text-xs font-semibold text-slate-850 dark:text-slate-100">{user.name}</span>
                      <span className={`inline-block text-[9px] font-mono font-bold leading-none py-1 px-1.5 rounded border uppercase tracking-wide ${
                        user.role === "admin" 
                          ? "bg-amber-100/80 text-amber-900 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/40" 
                          : "bg-blue-100/80 text-blue-900 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/40"
                      }`}>
                        {user.role === "admin" ? "Administrador" : "Leitor"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">{user.email}</span>
                    <span className={`inline-block text-[9px] font-mono font-bold leading-none py-1 px-1.5 rounded border uppercase tracking-wide ${
                      user.role === "admin" 
                        ? "bg-amber-100/80 text-amber-900 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/40" 
                        : "bg-blue-100/80 text-blue-900 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/40"
                    }`}>
                      {user.role === "admin" ? "Administrador" : "Leitor"}
                    </span>
                  </div>
                )}
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

        {/* LAYOUT PARA MOBILE (telas menores que sm) */}
        <div className="flex sm:hidden flex-col gap-4 animate-in fade-in" id="header-nav-mobile">
          
          {/* Row 1: Logo (Left) & Meu Perfil / Botão de Login (Right) */}
          <div className="flex justify-between items-center w-full">
            {/* Logo esquerda */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { if(showAdminPanel) onToggleAdminPanel(); if(showProfile) onToggleProfile(); }}>
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-sans font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  Minha <span className="text-blue-600 dark:text-blue-400 font-display">Estante</span>
                </h1>
              </div>
            </div>

            {/* Perfil botão/Mudar para Catálogo ou Sair na direita */}
            {user ? (
              <button
                onClick={onToggleProfile}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  showProfile 
                    ? "bg-blue-600 text-white decoration-none" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-150 dark:border-slate-700/60"
                }`}
                title="Meu Perfil"
              >
                <User className="w-3.5 h-3.5" />
                <span>{showProfile ? "Catálogo" : "Meu Perfil"}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>

          {/* Row 2: Controlos e Dados do Usuário por baixo */}
          {user && (
            <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                
                {/* Dados do usuário logado */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 py-1.5 px-3 rounded-xl border border-slate-150 dark:border-slate-800/60 flex-1 min-w-[180px]">
                  {user.name && user.avatar ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-7 h-7 rounded-full object-cover border border-blue-500 shadow-xs shrink-0" 
                      />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-slate-850 dark:text-slate-100 leading-tight">{user.name}</span>
                        <span className={`inline-block text-[8px] font-mono font-bold leading-none py-0.5 px-1 rounded border uppercase tracking-wide mt-0.5 ${
                          user.role === "admin" 
                            ? "bg-amber-100/80 text-amber-900 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/40" 
                            : "bg-blue-100/80 text-blue-900 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/40"
                        }`}>
                          {user.role === "admin" ? "Administrador" : "Leitor"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{user.email}</span>
                      <span className={`inline-block text-[8px] font-mono font-bold leading-none py-0.5 px-1 rounded border uppercase tracking-wide mt-0.5 ${
                        user.role === "admin" 
                          ? "bg-amber-100/80 text-amber-900 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/40" 
                          : "bg-blue-100/80 text-blue-900 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/40"
                      }`}>
                        {user.role === "admin" ? "Administrador" : "Leitor"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações adicionais */}
                <div className="flex items-center gap-2 shrink-0">
                  
                  {/* Alternador de Tema */}
                  <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-150 dark:border-slate-800"
                    title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>

                  {/* Painel do Administrador (se for Admin) */}
                  {user.role === "admin" && (
                    <button
                      onClick={onToggleAdminPanel}
                      className={`p-2 rounded-lg cursor-pointer transition-all border ${
                        showAdminPanel 
                          ? "bg-blue-600 text-white border-blue-500 shadow-xs" 
                          : "bg-amber-100/80 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-305 dark:border-amber-900/65"
                      }`}
                      title={showAdminPanel ? "Voltar ao Catálogo" : "Painel Administrador"}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </button>
                  )}

                  {/* Botão Sair */}
                  <button
                    onClick={onLogout}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-850 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 p-2 rounded-lg cursor-pointer transition-all"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Tema rápido quando deslogado no mobile */}
          {!user && (
            <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center gap-1.5 text-[10px] border border-slate-200 dark:border-slate-700/60"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
