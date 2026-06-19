"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Plus,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Video,
  FileText,
  GraduationCap,
} from "lucide-react";
import { useSearchNodeResources } from "@/hooks/useRoadmap";
import { useDebounce } from "@/hooks/useDebounce";

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

interface NodeEditorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (node: NodeDraft) => void;
  onDelete?: () => void;
  initialData?: NodeDraft | null;
  isSaving?: boolean;
}

export function NodeEditorSidebar({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isSaving = false,
}: NodeEditorSidebarProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [resources, setResources] = useState<NodeDraft["resources"]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchLimit, setSearchLimit] = useState(10);
  const [searchType, setSearchType] = useState<string>("all");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isFetching } = useSearchNodeResources(
    debouncedSearch,
    searchLimit,
    searchType,
  );

  // Helper to reset state to initial data
  const resetToInitial = () => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setTagsInput(initialData.tags ? initialData.tags.join(", ") : "");
      setResources(initialData.resources || []);
      setIsCompleted(initialData.isCompleted || false);
    } else {
      setTitle("");
      setDescription("");
      setTagsInput("");
      setResources([]);
      setIsCompleted(false);
    }
    setSearchQuery("");
    setSearchLimit(10);
    setSearchType("all");
    setShowSearch(false);
  };

  // Initialize state when opening or when initialData changes
  useEffect(() => {
    if (isOpen) {
      resetToInitial();
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  if (!isOpen) return null;

  const handleCancel = () => {
    resetToInitial();
    onClose();
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      id: initialData?.id,
      title,
      description,
      tags,
      resources,
      isCompleted,
    });
  };

  const addResource = (res: NodeDraft["resources"][0]) => {
    if (res.url && !resources.find((r) => r.url === res.url)) {
      setResources([...resources, res]);
    }
  };

  const removeResource = (url: string) => {
    setResources(resources.filter((r) => r.url !== url));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col bg-background border-l border-border shadow-2xl transition-transform duration-300 translate-x-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">
          {initialData ? "Edit Node" : "Add Node"}
        </h2>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-55"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g., React Hooks"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="Briefly explain this topic..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="frontend, react, hooks (comma separated)"
            />
          </div>

          <label
            htmlFor="isCompleted"
            className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/65 border border-border rounded-xl transition-all duration-300 cursor-pointer group"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground group-hover:text-foreground/90 transition-colors">
                Mark topic as completed
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Update progress on this roadmap
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="isCompleted"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-muted border border-border rounded-full transition-all duration-300 peer-checked:bg-teal-500/20 peer-checked:border-teal-500/40" />
              <div className="absolute left-1 w-4 h-4 bg-muted-foreground rounded-full transition-all duration-300 peer-checked:translate-x-4 peer-checked:bg-teal-400" />
            </div>
          </label>
        </div>

        {/* Resources Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resources ({resources.length})
            </label>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1 text-[10px] font-bold text-sky-500 uppercase tracking-widest hover:text-sky-400 transition-colors"
            >
              {showSearch ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Hide Search
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" /> Find Resources
                </>
              )}
            </button>
          </div>

          {resources.length > 0 && (
            <div className="space-y-2">
              {resources.map((res, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-card border border-border group transition-all hover:bg-accent/40"
                >
                  <div className="mt-1 shrink-0 bg-sky-500/5 p-2 rounded-xl border border-sky-500/10">
                    <ResourceIcon type={res.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p
                        className="text-sm font-medium text-foreground truncate max-w-[200px]"
                        title={res.title}
                      >
                        {res.title}
                      </p>
                      {res.type && (
                        <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[9px] rounded uppercase font-bold tracking-wider shrink-0 border border-border">
                          {res.type}
                        </span>
                      )}
                    </div>
                    {res.description && (
                      <p className="text-[11px] text-muted-foreground mb-1 line-clamp-1 italic">
                        {res.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-400 hover:underline truncate block font-medium"
                      >
                        View Resource
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => removeResource(res.url)}
                    className="text-muted-foreground hover:text-red-400 transition-colors mt-0.5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSearch && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
                  placeholder="Find more resources..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">All Types</option>
                    <option value="course">Course</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Limit (1-20)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={searchLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setSearchLimit(Math.min(20, Math.max(1, val)));
                      } else {
                        setSearchLimit(1);
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.length > 2 && (
                <div className="bg-card rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  {isFetching && (
                    <div className="flex items-center justify-center p-8">
                      <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-3 text-xs text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                        Scanning content...
                      </span>
                    </div>
                  )}
                  {!isFetching && searchResults?.length === 0 && (
                    <p className="text-xs text-muted-foreground p-6 text-center italic">
                      No results found for "{searchQuery}"
                    </p>
                  )}
                  {!isFetching && searchResults && searchResults.length > 0 && (
                    <div className="divide-y divide-border/50">
                      {searchResults.map((res: any, i: number) => {
                        const item = res?.resource || res;
                        const resTitle = item.title || "Untitled Resource";
                        const resUrl = item.url || "";
                        const resDescription = item.description || "";
                        const resType = item.type || "";

                        const isAdded = resources.some((r) => r.url === resUrl);

                        return (
                          <div
                            key={i}
                            className="p-4 flex items-start gap-4 hover:bg-accent/40 transition-colors group/item"
                          >
                            <div className="mt-1 shrink-0 bg-sky-500/5 p-2 rounded-xl border border-sky-500/10 group-hover/item:border-sky-500/30 transition-colors">
                              <ResourceIcon type={resType} />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className="text-sm font-bold text-foreground leading-snug line-clamp-2"
                                  title={resTitle}
                                >
                                  {resTitle}
                                </p>
                              </div>

                              {resDescription && (
                                <p
                                  className="text-[11px] text-muted-foreground line-clamp-1 italic font-medium"
                                  title={resDescription}
                                >
                                  {resDescription}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                                <div className="flex items-center gap-1.5">
                                  {resType && (
                                    <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[9px] rounded uppercase font-black tracking-tighter border border-border">
                                      {resType}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                addResource({
                                  title: resTitle,
                                  url: resUrl,
                                  description: resDescription,
                                  type: resType,
                                })
                              }
                              disabled={isAdded || !resUrl}
                              className={`p-2 rounded-xl transition-all shrink-0 ${
                                isAdded
                                  ? "text-emerald-500 bg-emerald-500/10 cursor-default"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent bg-secondary border border-border shadow-sm"
                              }`}
                            >
                              {isAdded ? (
                                <CheckIcon />
                              ) : (
                                <Plus className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-6 flex items-center justify-between bg-background/80 backdrop-blur-md">
        {initialData && onDelete ? (
          <button
            onClick={onDelete}
            disabled={isSaving}
            className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div /> // Spacer
        )}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{initialData ? "Save Changes" : "Create Node"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
