import { useSyncExternalStore } from "react";

type Variant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  title?: string;
  description?: string;
  variant: Variant;
}

let nextId = 1;
let listeners: Array<() => void> = [];
let toasts: ToastItem[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export function toast(opts: { title?: string; description?: string; variant?: Variant }) {
  const item: ToastItem = {
    id: nextId++,
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? "default",
  };
  toasts = [...toasts, item];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    emit();
  }, 4000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
}
