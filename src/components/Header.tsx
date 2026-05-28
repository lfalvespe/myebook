import React from "react";
import { BookOpen, LogOut, User, LayoutDashboard, HelpCircle, AlertCircle, Database } from "lucide-react";
import { UserProfile, SupabaseConfigStatus } from "../types";

interface HeaderProps {
  user: UserProfile | null;
  configStatus: SupabaseConfigStatus | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  showAdminPanel: boolean;
  onToggleAdminPanel: () => void;
  showDocs: boolean;
  onToggleDocs: () => void;
}

export default function Header({
  user,
  configStatus,
  onOpenAuth,
  onLogout,
  showAdminPanel,
  onToggleAdminPanel,
  showDocs,
  onToggleDocs
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 text-slate-900 relative z-10" id="app-header">
      {/* Dynamic Status / Banner for Local Fallback VS Supabase */}
      <div 
        className={`text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2 ${
          configStatus?.isConfigured 
            ? "bg-blue-50 text-blue-800 border-b border-blue-150/40" 
            : "bg-amber-50 text-amber-800 border-b border-amber-150/40"
        }`}
        id="db-status-banner"
      >
        <Database className="w-3.5 h-3.5 shrink-0" />
        <span>
          {configStatus?.isConfigured 
            ? "Conectado ao Banco e Storage do Supabase (Modo Real)" 
            : "Executando em Modo Demonstrativo Local (Configure o arquivo .env para ligar seu Supabase)"}
        </span>
        <button 
          onClick={onToggleDocs}
          className="ml-2 underline hover:text-blue-750 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
        >
          <HelpCircle className="w-3 h-3" /> Ver Detalhes
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if(showAdminPanel) onToggleAdminPanel(); if(showDocs) onToggleDocs(); }}>
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Livraria <span className="text-blue-600 font-display">Supabase</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                Sua biblioteca digital epub gratuita
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3" id="header-nav-group">
            
            {/* Documentation Analysis Toggle */}
            <button
              onClick={onToggleDocs}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                showDocs 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-gray-100 hover:bg-gray-200 text-slate-700"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Análise de Hospedagens</span>
            </button>

            {/* Conditionally show Admin Panel Button if user has role === admin */}
            {user?.role === "admin" && (
              <button
                onClick={onToggleAdminPanel}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  showAdminPanel 
                    ? "bg-blue-600 text-white shadow-xs" 
                    : "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-150"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel Administrador</span>
              </button>
            )}

            {/* Auth/User Actions */}
            {user ? (
              <div className="flex items-center gap-3 bg-gray-50 py-1 pl-3.5 pr-1 rounded-xl border border-gray-200">
                <div className="text-right">
                  <span className="block text-xs font-medium text-slate-800">{user.email}</span>
                  <span className={`inline-block text-[9px] font-mono font-bold leading-none py-0.5 px-1.5 rounded-sm uppercase tracking-wide ${
                    user.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {user.role === "admin" ? "Administrador" : "Leitor"}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-500 hover:text-slate-950 p-2 rounded-lg cursor-pointer transition-all"
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
