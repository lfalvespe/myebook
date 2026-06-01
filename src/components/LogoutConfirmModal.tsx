import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, X } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="logout-confirm-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            id="logout-confirm-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-sm w-full overflow-hidden relative z-10"
            id="logout-confirm-card"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Fechar"
              id="logout-confirm-close-btn"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-105 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4 mx-auto border border-red-200/50 dark:border-red-900/30" id="logout-confirm-icon-box">
                <LogOut className="w-5 h-5" />
              </div>

              <h3 className="text-lg font-sans font-semibold text-slate-900 dark:text-slate-50 text-center tracking-tight mb-2" id="logout-confirm-title">
                Sair da Conta
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6" id="logout-confirm-desc">
                Tem certeza que deseja encerrar sua sessão? Você precisará entrar novamente para acessar seus favoritos, anotações e histórico de leitura.
              </p>

              {/* Actions */}
              <div className="flex gap-3" id="logout-confirm-actions">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all duration-150"
                  id="logout-confirm-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium text-white cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md"
                  id="logout-confirm-confirm-btn"
                >
                  Sair
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
