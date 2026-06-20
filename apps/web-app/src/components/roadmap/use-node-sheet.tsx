import {
  createContext,
  use,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"
import type { RoadmapNode } from "@/lib/roadmap-graph"

// External store linking the node (trigger, deep in the canvas) to the node
// detail sheet (mounted far away, outside the provider). Because the sheet
// subscribes via useSyncExternalStore, it re-renders ONLY when the open node
// changes — never during the canvas's frequent re-renders (drag/zoom/streaming/
// polling), which would otherwise interrupt base-ui's open/close transition.
type NodeSheetCallbacks = {
  onPassed?: () => void
  onUpdated?: (node: RoadmapNode) => void
  onAdapted?: () => void
  // Whether the node's prerequisites aren't all complete (quiz is gated).
  locked?: boolean
}

type NodeSheetSnapshot = {
  node: RoadmapNode | null
  onPassed: (() => void) | null
  onUpdated: ((node: RoadmapNode) => void) | null
  onAdapted: (() => void) | null
  locked: boolean
}

type NodeSheetStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => NodeSheetSnapshot
  open: (node: RoadmapNode, callbacks?: NodeSheetCallbacks) => void
  close: () => void
}

function createNodeSheetStore(): NodeSheetStore {
  let snapshot: NodeSheetSnapshot = {
    node: null,
    onPassed: null,
    onUpdated: null,
    onAdapted: null,
    locked: false,
  }
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const l of listeners) l()
  }
  return {
    subscribe: (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    getSnapshot: () => snapshot,
    open: (node, callbacks) => {
      snapshot = {
        node,
        onPassed: callbacks?.onPassed ?? null,
        onUpdated: callbacks?.onUpdated ?? null,
        onAdapted: callbacks?.onAdapted ?? null,
        locked: callbacks?.locked ?? false,
      }
      emit()
    },
    close: () => {
      if (snapshot.node === null) return
      snapshot = { ...snapshot, node: null }
      emit()
    },
  }
}

const NodeSheetContext = createContext<NodeSheetStore | null>(null)

export function NodeSheetProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<NodeSheetStore | null>(null)
  if (ref.current === null) ref.current = createNodeSheetStore()
  return <NodeSheetContext value={ref.current}>{children}</NodeSheetContext>
}

function useStore(): NodeSheetStore {
  const store = use(NodeSheetContext)
  if (!store) {
    throw new Error("useNodeSheet must be used within <NodeSheetProvider>")
  }
  return store
}

// Stable open/close. Does NOT subscribe, so openers (the canvas) never
// re-render when the sheet opens or closes.
export function useNodeSheetControls() {
  const store = useStore()
  return useMemo(() => ({ open: store.open, close: store.close }), [store])
}

// Subscribes to the open node — only the (far-away) sheet uses this, so only
// the sheet re-renders on open/close.
export function useNodeSheetState() {
  const store = useStore()
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
  return {
    node: snapshot.node,
    onPassed: snapshot.onPassed,
    onUpdated: snapshot.onUpdated,
    onAdapted: snapshot.onAdapted,
    locked: snapshot.locked,
    close: store.close,
  }
}
