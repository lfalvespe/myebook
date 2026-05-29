import React, { useState, useEffect } from "react";
import { X, Lock, Mail, ShieldAlert, BadgeCheck } from "lucide-react";
import { UserProfile } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estágio de primeiro acesso - redefinição de senha obrigatória
  const [forceChangePasswordUser, setForceChangePasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setForceChangePasswordUser(null);
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickFill = (type: "admin" | "user") => {
    if (type === "admin") {
      setEmail("admin@livraria.com");
      setPassword("admin123");
    } else {
      setEmail("usuario@livraria.com");
      setPassword("user123");
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin ? { email, password } : { email, password, role };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro no servidor.");
      }

      if (isLogin) {
        if (data.user?.must_change_password) {
          setForceChangePasswordUser(data.user);
          setError("");
          setSuccessMsg("Olá, administrador! Este é seu primeiro acesso. Por favor, cadastre uma nova senha segura.");
        } else {
          onSuccess(data.user);
          onClose();
        }
      } else {
        setSuccessMsg(data.message || "Cadastro realizado com sucesso!");
        // Auto-switch to login after a brief pause
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMsg("");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceChangePasswordUser) return;

    if (newPassword.length < 4) {
      setError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/auth/change-password-first-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: forceChangePasswordUser.id,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao atualizar a senha.");
      }

      setSuccessMsg("Senha alterada com sucesso! Acessando painel...");
      setTimeout(() => {
        onSuccess(data.user);
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div id="auth-modal-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center relative">
          <div>
            <h3 className="text-xl font-sans font-bold tracking-tight">
              {forceChangePasswordUser 
                ? "Primeiro Acesso" 
                : isLogin ? "Acessar Conta" : "Criar uma Conta"
              }
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              {forceChangePasswordUser 
                ? "Atualize sua credencial temporária para sua segurança" 
                : isLogin ? "Faça login para baixar e-books de graça" : "Cadastre-se no nosso acervo literário"
              }
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
            aria-label="Fechar"
            id="auth-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-105 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-sm p-3 rounded-lg flex items-start gap-2 animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-105 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-sm p-3 rounded-lg flex items-start gap-2">
              <BadgeCheck className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {forceChangePasswordUser ? (
            <form onSubmit={handleForceChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    disabled
                    value={forceChangePasswordUser.email}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Defina sua nova senha"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-4"
              >
                {loading ? "Processando..." : "Salvar Nova Senha & Entrar"}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-4"
                >
                  {loading ? "Processando..." : isLogin ? "Entrar na Biblioteca" : "Finalizar Cadastro"}
                </button>
              </form>

              {/* Prompt to register or login */}
              <div className="mt-5 border-t border-gray-100 dark:border-slate-800 pt-4 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer"
                >
                  {isLogin ? "Não tem uma conta? Cadastre-se gratis" : "Já possui conta? Faça o Login aqui"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
