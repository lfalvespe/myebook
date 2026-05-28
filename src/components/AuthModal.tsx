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
      <div id="auth-modal-card" className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
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
            <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm p-3 rounded-lg flex items-start gap-2 animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2">
              <BadgeCheck className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {forceChangePasswordUser ? (
            <form onSubmit={handleForceChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={forceChangePasswordUser.email}
                    className="w-full bg-slate-100 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Defina sua nova senha"
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
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
                  <label className="text-xs font-medium text-slate-500 block mb-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Role selection only on SignUp */}
                {!isLogin && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Cargo Desejado (Nível de Acesso)</label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setRole("user")}
                        className={`py-2 px-3 border rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          role === "user"
                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                            : "border-gray-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        Usuário Leitor (User)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("admin")}
                        className={`py-2 px-3 border rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          role === "admin"
                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                            : "border-gray-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        Administrador (Admin)
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      *Para fins de avaliação neste protótipo, você pode criar uma conta Admin diretamente.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-4"
                >
                  {loading ? "Processando..." : isLogin ? "Entrar na Biblioteca" : "Finalizar Cadastro"}
                </button>
              </form>

              {/* Prompt to register or login */}
              <div className="mt-5 border-t border-gray-100 pt-4 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {isLogin ? "Não tem uma conta? Cadastre-se gratis" : "Já possui conta? Faça o Login aqui"}
                </button>
              </div>

              {/* Quick-select Test Logins */}
              {isLogin && (
                <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-dashed border-gray-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    ⚡ Login Rápido de Teste (Local)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickFill("user")}
                      className="bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-800 text-xs py-1.5 px-3 rounded-lg flex-1 font-medium transition-all cursor-pointer"
                    >
                      Perfil Leitor (User)
                    </button>
                    <button
                      onClick={() => handleQuickFill("admin")}
                      className="bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-800 text-xs py-1.5 px-3 rounded-lg flex-1 font-medium transition-all cursor-pointer"
                    >
                      Perfil Administrador (Admin)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Substitua as credenciais se for conectar seu próprio Supabase!
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
