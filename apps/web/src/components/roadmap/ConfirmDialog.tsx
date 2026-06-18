"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "info";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to perform this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 border border-zinc-800 bg-zinc-950 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
          <div className="flex gap-4">
            {variant === "danger" && (
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <Dialog.Title className="text-lg font-bold tracking-tight text-zinc-50">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-zinc-400">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors"
              >
                {cancelText}
              </button>
            </Dialog.Close>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                variant === "danger"
                  ? "bg-red-500 hover:bg-red-400 focus-visible:ring-red-500"
                  : "bg-sky-500 hover:bg-sky-400 focus-visible:ring-sky-500"
              }`}
            >
              {confirmText}
            </button>
          </div>

          <Dialog.Close className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-zinc-800 data-[state=open]:text-zinc-400">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
