"use client";

import { X, BookOpen, Star, Users, GraduationCap, Clock3, Video, FileText } from "lucide-react";
import { useEffect } from "react";

function ResourceIcon({ type, className }: { type?: string; className?: string }) {
  const cn = className || "w-4 h-4 text-sky-500";
  switch (type?.toLowerCase()) {
    case "video":
      return <Video className={cn} />;
    case "article":
      return <FileText className={cn} />;
    case "course":
      return <GraduationCap className={cn} />;
    default:
      return <BookOpen className={cn} />;
  }
}

export interface NodeDraft {
  id?: string;
  title: string;
  description: string;
  tags: string[];
  resources: {
    title: string;
    url: string;
    description?: string;
    type?: string;
  }[];
  isCompleted?: boolean;
}

interface NodeViewerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: NodeDraft | null;
}

export function NodeViewerSidebar({
  isOpen,
  onClose,
  initialData,
}: NodeViewerSidebarProps) {
  useEffect(() => {
    // Add any analytics or layout adjustments when sidebar opens if necessary
  }, [isOpen, initialData]);

  if (!isOpen || !initialData) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl transition-transform duration-300 translate-x-0">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h2 className="text-lg font-bold text-zinc-50">Node Details</h2>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Title
            </label>
            <h3 className="text-xl font-bold text-zinc-50">{initialData.title}</h3>
          </div>

          {initialData.description && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Description
              </label>
              <p className="text-sm text-zinc-300 leading-relaxed white-space-pre-wrap">
                {initialData.description}
              </p>
            </div>
          )}

          {initialData.tags && initialData.tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {initialData.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
            Resources ({initialData.resources?.length || 0})
          </label>

          {initialData.resources && initialData.resources.length > 0 ? (
            <div className="space-y-3">
              {initialData.resources.map((res, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 group hover:border-zinc-700 transition-all"
                >
                  <div className="mt-1 shrink-0 bg-sky-500/5 p-2 rounded-xl border border-sky-500/10">
                    <ResourceIcon type={res.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p
                        className="text-sm font-bold text-zinc-200 line-clamp-2"
                        title={res.title}
                      >
                        {res.title}
                      </p>
                      {res.type && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] rounded uppercase font-bold tracking-wider shrink-0 border border-zinc-700">
                          {res.type}
                        </span>
                      )}
                    </div>
                    {res.description && (
                      <p className="text-[11px] text-zinc-500 mb-1.5 line-clamp-2 italic">
                        {res.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-bold transition-colors"
                      >
                        View Link →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No resources added to this topic yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
