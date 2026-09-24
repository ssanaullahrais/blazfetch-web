import { useSyncExternalStore, type ReactNode } from "react";
import {
  Toaster,
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

type ToastId = string | number;
type ToastOptions = ExternalToast & { id?: ToastId };
type ToastItem = { id: ToastId; visible: boolean };

const DEFAULT_DURATION = 4000;
let generatedId = 0;
let trackedToasts: ToastItem[] = [];
let snapshot = { toasts: trackedToasts };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitStore() {
  snapshot = { toasts: trackedToasts };
  listeners.forEach((listener) => listener());
}

function upsertToast(id: ToastId) {
  trackedToasts = [{ id, visible: true }, ...trackedToasts.filter((toast) => toast.id !== id)].slice(0, 6);
  emitStore();
}

function hideToast(id?: ToastId) {
  trackedToasts = id == null
    ? trackedToasts.map((toast) => ({ ...toast, visible: false }))
    : trackedToasts.map((toast) => toast.id === id ? { ...toast, visible: false } : toast);
  emitStore();
}

function scheduleHide(id: ToastId, duration?: number) {
  const delay = duration ?? DEFAULT_DURATION;
  if (delay === Infinity) return;
  window.setTimeout(() => hideToast(id), delay + 250);
}

function resolveId(result: ToastId | undefined, options?: ToastOptions) {
  return options?.id ?? result ?? `toast-${++generatedId}`;
}

function show(
  variant: "default" | "success" | "error" | "warning" | "info" | "loading",
  message: ReactNode,
  options?: ToastOptions
) {
  const id = resolveId(
    variant === "default"
      ? sonnerToast(message, options)
      : sonnerToast[variant](message, options),
    options
  );
  upsertToast(id);
  scheduleHide(id, options?.duration);
  return id;
}

const toast = Object.assign(
  (message: ReactNode, options?: ToastOptions) => show("default", message, options),
  {
    success: (message: ReactNode, options?: ToastOptions) => show("success", message, options),
    error: (message: ReactNode, options?: ToastOptions) => show("error", message, options),
    warning: (message: ReactNode, options?: ToastOptions) => show("warning", message, options),
    info: (message: ReactNode, options?: ToastOptions) => show("info", message, options),
    loading: (message: ReactNode, options?: ToastOptions) => show("loading", message, { duration: Infinity, ...options }),
    dismiss: (id?: ToastId) => {
      sonnerToast.dismiss(id);
      hideToast(id);
    },
    promise: sonnerToast.promise,
    custom: sonnerToast.custom,
  }
);

function getSnapshot() {
  return snapshot;
}

export function useToasterStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { Toaster };
export default toast;
