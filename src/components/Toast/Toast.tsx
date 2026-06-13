import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/context";
import "./Toast.css";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
  success: "ti-check",
  error: "ti-alert-circle",
  info: "ti-info-circle",
  warning: "ti-alert-triangle",
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useT();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error   = useCallback((msg: string) => toast(msg, "error"),   [toast]);
  const info    = useCallback((msg: string) => toast(msg, "info"),    [toast]);
  const warning = useCallback((msg: string) => toast(msg, "warning"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((to) => (
          <div key={to.id} className={`toast toast--${to.type}`}>
            <i className={`ti ${ICONS[to.type]} toast__icon`} />
            <span className="toast__msg">{to.message}</span>
            <button className="toast__close" onClick={() => dismiss(to.id)} aria-label={t("common.close")}>
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast musi być użyte wewnątrz <ToastProvider>");
  return ctx;
};
