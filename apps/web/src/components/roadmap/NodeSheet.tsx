"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { RoadmapNodeData } from "./RoadmapNode";

interface NodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string | null;
  nodeData: RoadmapNodeData | null;
  onSave: (nodeId: string, data: Partial<RoadmapNodeData>) => void;
}

export function NodeSheet({ open, onOpenChange, nodeId, nodeData, onSave }: NodeSheetProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [resources, setResources] = useState<{ title: string; url: string; description?: string; type?: string; }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (nodeData) {
      setTimeout(() => {
        setLabel(nodeData.label);
        setDescription(nodeData.description);
        setResources(nodeData.resources);
        setCompleted(nodeData.completed);
      }, 0);
    }
  }, [nodeData]);

  const handleSave = () => {
    if (nodeId) {
      onSave(nodeId, { label, description, resources, completed });
      onOpenChange(false);
    }
  };

  const addResource = () => {
    if (newResourceTitle.trim() && newResourceUrl.trim()) {
      setResources([...resources, { title: newResourceTitle.trim(), url: newResourceUrl.trim() }]);
      setNewResourceTitle("");
      setNewResourceUrl("");
    }
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  if (!nodeData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="bg-background border-border w-full flex flex-col h-dvh sm:h-full sm:max-w-lg p-0 gap-0"
      >
        <SheetHeader className="px-6 py-4 pb-2 shrink-0">
          <SheetTitle className="text-foreground flex items-center gap-2">
            Step Details
            {completed && (
              <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">
                Completed
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            View and edit the details of this learning step
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 w-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-8 py-4">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label" className="text-foreground/80">
                Step Name
              </Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="bg-muted/50 border-border text-foreground focus-visible:ring-0 focus-visible:border-sky-500 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground/80">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-muted/50 border-border text-foreground focus-visible:ring-0 focus-visible:border-sky-500 transition-colors min-h-[120px] wrap-break-word"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              />
            </div>

            {/* Completed Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div>
                <p className="text-foreground font-medium">Mark as Completed</p>
                <p className="text-muted-foreground text-sm">Track your progress</p>
              </div>
              <Button
                variant={completed ? "default" : "outline"}
                size="sm"
                onClick={() => setCompleted(!completed)}
                className={completed
                  ? "bg-sky-500 hover:bg-sky-600 text-white border-none"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                {completed ? "Completed" : "Not Done"}
              </Button>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <Label className="text-foreground/80 text-base">Resources</Label>

              {resources.length > 0 && (
                <div className="space-y-3">
                  {resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border group"
                    >
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:text-sky-400 text-sm font-bold truncate flex-1"
                      >
                        {resource.title}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeResource(index)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new resource */}
              <div className="p-4 rounded-xl border border-dashed border-border space-y-3">
                <Input
                  placeholder="Resource title"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  className="bg-muted/50 border-border text-foreground text-sm focus-visible:ring-0 focus-visible:border-sky-500 transition-colors"
                />
                <Input
                  placeholder="https://..."
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  className="bg-muted/50 border-border text-foreground text-sm focus-visible:ring-0 focus-visible:border-sky-500 transition-colors"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addResource}
                  disabled={!newResourceTitle.trim() || !newResourceUrl.trim()}
                  className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  Add Resource
                </Button>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0 pb-6 sm:pb-4">
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 text-white border-none"
              style={{ background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)' }}
            >
              Save Changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
