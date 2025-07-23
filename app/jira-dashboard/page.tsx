"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/cn";

interface Issue {
  issueKey: string;
  title: string;
  state: string;
  priority?: string;
  type?: string;
  assignee?: string;
  labels?: string[];
  updatedAtISO?: string;
  createdAtISO?: string;
}

interface StatusResponse {
  connected: boolean;
  siteName?: string;
  cloudId?: string;
  scopes?: string[];
  expiresAt?: string;
  lastSyncAt?: string;
}

const STATE_ORDER = ["OPEN", "IN_PROGRESS", "DONE", "OTHER"];

// Updated column colors to match amber-rose theme
const COLUMN_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "TO DO", color: "text-amber-700", bg: "bg-gradient-to-r from-amber-50/80 to-rose-50/60" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "text-rose-700", bg: "bg-gradient-to-r from-rose-50/80 to-amber-50/60" },
  DONE: { label: "DONE", color: "text-emerald-700", bg: "bg-gradient-to-r from-emerald-50/80 to-amber-50/60" },
  OTHER: { label: "OTHER", color: "text-stone-700", bg: "bg-gradient-to-r from-stone-50/80 to-amber-50/60" },
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "bg-red-600",
  High: "bg-red-500",
  Medium: "bg-orange-500",
  Low: "bg-blue-500",
  Lowest: "bg-gray-400",
};

export default function JiraDashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filtered, setFiltered] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [relativeClock, setRelativeClock] = useState<number>(0);

  // ---- Fetchers ----
  async function fetchStatus() {
    const res = await fetch("/api/connectors/jira/status");
    const data = await res.json();
    setStatus(data);
  }

  async function fetchIssues() {
    setLoadingIssues(true);
    const res = await fetch("/api/connectors/jira/issues?limit=200");
    const data = await res.json();
    if (data.ok) {
      setIssues(data.issues);
      setLoadingIssues(false);
    } else {
      setLoadingIssues(false);
    }
  }

  async function syncNow() {
    if (!status?.connected) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/connectors/jira/sync", { method: "POST" });
      const data = await res.json();
      console.log("Sync result", data);
      await fetchIssues();
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  }

  const connect = () => {
    window.location.href = "/api/connectors/jira/oauth/start";
  };

  // relative clock update every 60s
  useEffect(() => {
    const id = setInterval(() => setRelativeClock(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchIssues();
  }, []);

  // ---- Filtering Logic ----
  useEffect(() => {
    let base = [...issues];
    if (search) {
      const s = search.toLowerCase();
      base = base.filter(
        i =>
          i.issueKey.toLowerCase().includes(s) ||
          i.title.toLowerCase().includes(s) ||
          (i.labels || []).some(l => l.toLowerCase().includes(s))
      );
    }
    if (priorityFilter !== "ALL") {
      base = base.filter(i => (i.priority || "") === priorityFilter);
    }
    if (assigneeFilter !== "ALL") {
      base = base.filter(i => (i.assignee || "") === assigneeFilter);
    }
    setFiltered(base);
  }, [issues, search, priorityFilter, assigneeFilter]);

  // Derive lists
  const assignees = useMemo(
    () => Array.from(new Set(issues.map(i => i.assignee).filter(Boolean))).sort(),
    [issues]
  );
  const priorities = useMemo(
    () =>
      Array.from(new Set(issues.map(i => i.priority).filter(Boolean))).sort((a, b) =>
        (a || "").localeCompare(b || "")
      ),
    [issues]
  );

  // Group by state
  const grouped = useMemo(() => {
    const g: Record<string, Issue[]> = { OPEN: [], IN_PROGRESS: [], DONE: [], OTHER: [] };
    filtered.forEach(i => {
      if (!g[i.state]) g.OTHER.push(i);
      else g[i.state].push(i);
    });
    return g;
  }, [filtered]);

  function relTime(iso?: string) {
    if (!iso) return "";
    const delta = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const lastSync = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : "—";

  // ---- UI components ----
  const StatusPill = ({ connected }: { connected: boolean }) => (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold font-inter backdrop-blur-sm shadow-sm",
        connected
          ? "bg-emerald-50/80 text-emerald-800 border border-emerald-200/60"
          : "bg-red-50/80 text-red-800 border border-red-200/60"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full shadow-sm",
          connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
        )}
      />
      {connected ? "Connected" : "Not Connected"}
    </span>
  );

  const IssueCard = ({ issue }: { issue: Issue }) => {
    const priorityColor = PRIORITY_COLORS[issue.priority || ""] || "bg-gray-400";
    return (
      <button
        onClick={() => setSelectedIssue(issue)}
        className="w-full text-left group rounded-xl border border-amber-200/40 bg-gradient-to-br from-white/90 to-amber-50/60 hover:border-rose-300/60 hover:shadow-lg hover:shadow-amber-200/25 transition-all duration-200 p-4 backdrop-blur-sm hover:scale-[1.02] font-inter"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-rose-600 bg-rose-50/80 px-2 py-1 rounded-md">
            {issue.issueKey}
          </span>
          {issue.priority && (
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full shadow-sm",
                priorityColor
              )}
              title={issue.priority}
            />
          )}
        </div>
        <p className="text-sm font-semibold text-amber-900 leading-snug line-clamp-3 mb-3">
          {issue.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels?.slice(0, 3).map(l => (
            <span
              key={l}
              className="bg-gradient-to-r from-amber-100/80 to-rose-100/80 text-amber-800 rounded-full px-2 py-1 text-[10px] font-semibold border border-amber-200/50"
            >
              {l}
            </span>
          ))}
          {issue.labels && issue.labels.length > 3 && (
            <span className="text-[10px] text-amber-600 font-semibold">
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
        <div className="mt-3 text-[11px] text-rose-700 font-medium flex justify-between">
          <span>{issue.assignee || "Unassigned"}</span>
          <span>{relTime(issue.updatedAtISO)}</span>
        </div>
      </button>
    );
  };

  const SkeletonCard = () => (
    <div className="animate-pulse rounded-xl bg-gradient-to-br from-white/60 to-amber-50/40 h-32 border border-amber-200/40" />
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50/40 relative overflow-hidden font-inter">
      {/* Background Pattern with Amber/Rose Fade */}
      <div className="absolute inset-0 opacity-8 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-rose-200/25"></div>
        <div className="absolute top-[-10%] left-[-15%] w-1/2 h-[380px] bg-gradient-to-br from-amber-300/30 to-rose-200/0 blur-3xl rounded-full opacity-45" />
        <div className="absolute bottom-[-16%] right-[-10%] w-1/3 h-[370px] bg-gradient-to-tl from-rose-300/25 to-amber-100/0 blur-2xl rounded-full opacity-40" />
      </div>

      {/* Top Bar */}
      <header className="relative border-b border-amber-200/40 bg-white/85 backdrop-blur-lg shadow-sm z-10">
        <div className="px-8 py-6 flex items-center gap-6">
          {/* Back Button & Logo */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-4 py-2 rounded-xl border border-rose-200/50 hover:border-rose-300/60"
            >
              ← Back to AutoBrief
            </button>
            <div className="relative w-10 h-10 bg-gradient-to-br from-amber-500 via-rose-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-sm transform rotate-3"></div>
                <div className="relative bg-white/90 rounded-sm px-1.5 py-0.5 shadow-inner">
                  <span className="text-amber-800 text-xs font-black tracking-tight font-mono">AB</span>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-amber-900 tracking-tight">
            Jira Dashboard
          </h1>

          <div className="ml-auto flex items-center gap-4">
            <StatusPill connected={!!status?.connected} />
            {status?.connected && (
              <div className="text-sm text-amber-700 font-medium hidden sm:block bg-gradient-to-r from-amber-50/80 to-rose-50/60 px-3 py-2 rounded-lg border border-amber-200/50">
                Last Sync: {lastSync}
              </div>
            )}
            {!status?.connected && (
              <button
                onClick={connect}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm px-6 py-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
              >
                Connect Jira
              </button>
            )}
            {status?.connected && (
              <button
                onClick={syncNow}
                disabled={syncing}
                className={cn(
                  "rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm px-6 py-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 flex items-center gap-2"
                )}
              >
                {syncing && (
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            )}
            <button
              onClick={() => {
                fetchStatus();
                fetchIssues();
              }}
              className="rounded-xl bg-white/90 border-2 border-amber-300/70 hover:bg-amber-50/80 hover:border-amber-400 text-amber-800 text-sm px-6 py-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="relative border-b border-amber-200/40 bg-white/75 backdrop-blur-lg z-10">
        <div className="px-8 py-4 flex flex-wrap gap-4 items-center">
          <input
            placeholder="Search issues (key, title, label)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-amber-300/50 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm font-medium text-amber-900 placeholder-amber-600/70 outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400 transition-all duration-200"
          />
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-amber-300/50 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-amber-900 outline-none focus:ring-2 focus:ring-rose-400/50"
          >
            <option value="ALL">All Priorities</option>
            {priorities.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="rounded-xl border border-amber-300/50 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-amber-900 outline-none focus:ring-2 focus:ring-rose-400/50"
          >
            <option value="ALL">All Assignees</option>
            {assignees.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {(priorityFilter !== "ALL" || assigneeFilter !== "ALL" || search) && (
            <button
              onClick={() => {
                setSearch("");
                setPriorityFilter("ALL");
                setAssigneeFilter("ALL");
              }}
              className="text-sm text-rose-600 hover:text-rose-800 font-semibold bg-rose-50/80 hover:bg-rose-100/80 px-4 py-2 rounded-lg border border-rose-200/50 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <main className="relative flex-1 overflow-auto px-8 py-8 z-10">
        {!status?.connected && (
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-12 shadow-lg inline-block">
              <p className="text-amber-800 text-xl font-semibold">
                Connect Jira to load issues and start managing your project workflow.
              </p>
            </div>
          </div>
        )}
        {status?.connected && (
          <div className="grid gap-8 md:grid-cols-4">
            {STATE_ORDER.map(stateKey => {
              const meta = COLUMN_META[stateKey] || COLUMN_META.OTHER;
              const columnIssues = grouped[stateKey] || [];
              return (
                <div
                  key={stateKey}
                  className="flex flex-col rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white/90 to-amber-50/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className={cn(
                      "px-6 py-4 border-b border-rose-200/50 flex items-center justify-between rounded-t-2xl",
                      meta.bg
                    )}
                  >
                    <span className={cn("text-sm font-bold tracking-wide", meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 bg-white/80 text-amber-800 rounded-full border border-amber-200/50 shadow-sm">
                      {columnIssues.length}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 overflow-y-auto min-h-[300px] max-h-[70vh]">
                    {loadingIssues &&
                      Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    {!loadingIssues && columnIssues.length === 0 && (
                      <div className="text-sm text-amber-600 text-center py-8 font-medium">
                        No issues in this column
                      </div>
                    )}
                    {!loadingIssues &&
                      columnIssues.map(issue => (
                        <IssueCard key={issue.issueKey} issue={issue} />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Side Drawer for Selected Issue */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedIssue(null)}
          />
          <div className="w-full sm:w-[540px] max-w-full h-full bg-gradient-to-br from-white/95 to-amber-50/80 border-l border-amber-200/60 shadow-2xl p-8 overflow-y-auto backdrop-blur-lg">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-rose-600 bg-rose-50/80 px-3 py-1 rounded-lg mb-2">
                  {selectedIssue.issueKey}
                </h2>
                <p className="text-xl font-bold text-amber-900 leading-tight">
                  {selectedIssue.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-amber-600 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-sm">
              <div className="flex flex-wrap gap-3">
                {selectedIssue.priority && (
                  <span
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-bold text-white shadow-sm",
                      PRIORITY_COLORS[selectedIssue.priority] || "bg-gray-500"
                    )}
                  >
                    {selectedIssue.priority} Priority
                  </span>
                )}
                <span className="px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-100/80 to-rose-100/80 text-amber-800 border border-amber-200/50">
                  {selectedIssue.type || "Issue"}
                </span>
                <span className="px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-100/80 to-amber-100/80 text-rose-800 border border-rose-200/50">
                  {COLUMN_META[selectedIssue.state]?.label || selectedIssue.state}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-white/80 to-amber-50/60 p-4 rounded-xl border border-amber-200/50">
                  <p className="text-xs uppercase tracking-wide text-amber-600 font-bold mb-2">
                    Assignee
                  </p>
                  <p className="font-semibold text-amber-900">
                    {selectedIssue.assignee || "Unassigned"}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-white/80 to-rose-50/60 p-4 rounded-xl border border-rose-200/50">
                  <p className="text-xs uppercase tracking-wide text-rose-600 font-bold mb-2">
                    Updated
                  </p>
                  <p className="font-semibold text-rose-900">
                    {selectedIssue.updatedAtISO
                      ? new Date(selectedIssue.updatedAtISO).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-white/80 to-amber-50/60 p-4 rounded-xl border border-amber-200/50">
                  <p className="text-xs uppercase tracking-wide text-amber-600 font-bold mb-2">
                    Created
                  </p>
                  <p className="font-semibold text-amber-900">
                    {selectedIssue.createdAtISO
                      ? new Date(selectedIssue.createdAtISO).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedIssue.labels && selectedIssue.labels.length > 0 && (
                <div className="bg-gradient-to-r from-white/80 to-rose-50/60 p-4 rounded-xl border border-rose-200/50">
                  <p className="text-xs uppercase tracking-wide text-rose-600 font-bold mb-3">
                    Labels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedIssue.labels.map(l => (
                      <span
                        key={l}
                        className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-100/80 to-rose-100/80 text-amber-800 border border-amber-200/50"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-amber-200/50">
                <p className="text-sm text-amber-600 font-medium bg-amber-50/80 p-4 rounded-xl border border-amber-200/50">
                  Issue details and comments will be displayed here in future updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}