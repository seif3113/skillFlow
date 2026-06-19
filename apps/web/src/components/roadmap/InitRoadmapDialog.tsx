"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface InitRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description: string }) => void;
  initialData?: { title: string; description: string };
}

export function InitRoadmapDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: InitRoadmapDialogProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || "");
      setDescription(initialData?.description || "");
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border border-zinc-800 bg-zinc-950 p-8 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <Dialog.Title className="text-2xl font-bold tracking-tight text-zinc-50">
              {initialData ? "Edit Roadmap Info" : "Create New Roadmap"}
            </Dialog.Title>
            <Dialog.Description className="text-zinc-400">
              {initialData
                ? "Update the details for your roadmap."
                : "Give your new roadmap a title and description to get started."}
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-zinc-200"
                >
                  Title
                </label>
                <input
                  id="title"
                  autoFocus
                  className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-50 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g., Learn Advanced React Patterns"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-zinc-200"
                >
                  Description <span className="text-zinc-500">(Optional)</span>
                </label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-50 transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="What is the goal of this roadmap?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-800 text-zinc-300 mt-2 sm:mt-0"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!title.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50"
              >
                {initialData ? "Save Changes" : "Get Started"}
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-6 top-6 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-zinc-800 data-[state=open]:text-zinc-400">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
