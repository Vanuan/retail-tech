"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  RefreshCw,
  Filter,
  Copy,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  MoreVertical,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dal } from "@vst/data-access";
import { PlanogramConfig } from "@vst/vocabulary-types";

// Mock token data generator using real planograms
const generateMockTokens = (planograms: PlanogramConfig[]) => {
  if (planograms.length === 0) return [];

  const statuses = ["completed", "started", "not_started"];

  const tokens = [];
  for (let i = 1; i <= 50; i++) {
    const sessionToken = Math.random().toString(36).substring(2, 15);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const planogram = planograms[Math.floor(Math.random() * planograms.length)];

    const createdAt = new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    );

    let startedAt = null;
    let completedAt = null;
    let timeToComplete = null;
    let interactions = 0;

    if (status === "started" || status === "completed") {
      startedAt = new Date(
        createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000,
      );
      interactions = Math.floor(Math.random() * 25) + 5;
    }

    if (status === "completed" && startedAt) {
      const completionTime = Math.floor(Math.random() * 180) + 30;
      completedAt = new Date(startedAt.getTime() + completionTime * 1000);
      timeToComplete = completionTime;
    }

    // For the prototype, we use the planogram ID as the token parameter
    // so the test page can load the config. The session ID is appended as metadata.
    const url = `${window.location.origin}/test?token=${planogram.id}&session=${sessionToken}`;

    tokens.push({
      id: `tok-${i}`,
      token: sessionToken, // The unique session identifier
      planogramId: planogram.id,
      url: url,
      variant: { id: planogram.id, name: planogram.name },
      status,
      createdAt: createdAt.toISOString(),
      startedAt: startedAt?.toISOString() || null,
      completedAt: completedAt?.toISOString() || null,
      timeToComplete,
      interactions,
      ipAddress:
        status !== "not_started"
          ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          : null,
    });
  }

  return tokens.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export default function TokenTrackingDashboard() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [planograms, setPlanograms] = useState<PlanogramConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [variantFilter, setVariantFilter] = useState("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load planograms on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await dal.initialize();
        const items = await dal.planograms.listAll();
        setPlanograms(items);
        setTokens(generateMockTokens(items));
      } catch (err) {
        console.error("Failed to load planograms", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="border-green-500/20 bg-green-500/10 text-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "started":
        return (
          <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-500">
            <Clock className="mr-1 h-3 w-3" />
            Started
          </Badge>
        );
      case "not_started":
        return (
          <Badge className="border-gray-500/20 bg-gray-500/10 text-gray-500">
            <Circle className="mr-1 h-3 w-3" />
            Not Started
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRefresh = () => {
    setTokens(generateMockTokens(planograms));
  };

  const handleExport = () => {
    const csv = [
      [
        "Token",
        "URL",
        "Variant",
        "Status",
        "Created",
        "Started",
        "Completed",
        "Time to Complete (s)",
        "Interactions",
        "IP Address",
      ],
      ...filteredTokens.map((token) => [
        token.token,
        token.url,
        token.variant.name,
        token.status,
        new Date(token.createdAt).toLocaleString(),
        token.startedAt ? new Date(token.startedAt).toLocaleString() : "",
        token.completedAt ? new Date(token.completedAt).toLocaleString() : "",
        token.timeToComplete || "",
        token.interactions || "",
        token.ipAddress || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `token-tracking-${Date.now()}.csv`;
    a.click();
  };

  const handleDelete = (tokenId: string) => {
    if (confirm("Are you sure you want to delete this token?")) {
      setTokens(tokens.filter((t) => t.id !== tokenId));
    }
  };

  // Filter logic
  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.variant.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || token.status === statusFilter;
    const matchesVariant =
      variantFilter === "all" || token.variant.id === variantFilter;

    return matchesSearch && matchesStatus && matchesVariant;
  });

  // Statistics
  const stats = {
    total: tokens.length,
    completed: tokens.filter((t) => t.status === "completed").length,
    started: tokens.filter((t) => t.status === "started").length,
    notStarted: tokens.filter((t) => t.status === "not_started").length,
    completionRate:
      tokens.length > 0
        ? Math.round(
            (tokens.filter((t) => t.status === "completed").length /
              tokens.length) *
              100,
          )
        : 0,
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-mono text-sm font-semibold text-foreground">
              VST Token Tracking
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Virtual Store Technology
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              Token Tracking Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor participant token status and completion metrics
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground">Total Tokens</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-500">
                {stats.completed}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-500">
                {stats.started}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-gray-500">
                {stats.notStarted}
              </div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">
                {stats.completionRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                Completion Rate
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by token or variant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                </SelectContent>
              </Select>
              <Select value={variantFilter} onValueChange={setVariantFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Variants</SelectItem>
                  {planograms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Session Token
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Participant Link
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Planogram
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Started
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Interactions
                    </th>
                    <th className="px-4 py-3 w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTokens.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Search className="mb-2 h-8 w-8" />
                          <p>No tokens found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTokens.map((token) => (
                      <tr
                        key={token.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {getStatusBadge(token.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-muted-foreground">
                              {token.token.substring(0, 8)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopy(token.token)}
                            >
                              {copiedToken === token.token ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                window.open(token.url, "_blank");
                              }}
                            >
                              <ExternalLink className="mr-1.5 h-3 w-3" />
                              Open
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopy(token.url)}
                            >
                              {copiedToken === token.url ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {token.variant.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {token.startedAt ? (
                            <>
                              {new Date(token.startedAt).toLocaleDateString()}
                              <div className="text-xs text-muted-foreground/70">
                                {new Date(token.startedAt).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {token.completedAt ? (
                            <>
                              {new Date(token.completedAt).toLocaleDateString()}
                              <div className="text-xs text-muted-foreground/70">
                                {new Date(
                                  token.completedAt,
                                ).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {token.timeToComplete ? (
                            <span className="font-mono text-xs text-foreground">
                              {formatTime(token.timeToComplete)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {token.interactions > 0 ? (
                            <span className="font-mono text-xs text-foreground">
                              {token.interactions}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  window.open(token.url, "_blank");
                                }}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Test as Shopper
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopy(token.url)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy URL
                              </DropdownMenuItem>
                              {token.status === "completed" && (
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Data
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(token.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredTokens.length} of {tokens.length} tokens
            </span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
