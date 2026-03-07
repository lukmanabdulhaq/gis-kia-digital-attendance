import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ScrollText, RefreshCw } from "lucide-react";

interface LogEntry {
  id: number;
  userId: number | null;
  fullName: string | null;
  staffId: string | null;
  action: string;
  details: string | null;
  createdAt: Date;
}

const actionBadge: Record<string, string> = {
  login: "bg-[#006400]/10 text-[#006400] dark:text-green-400",
  clock_in: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  clock_out: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  create_user: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  update_user: "bg-[#FFD700]/20 text-[#B8860B] dark:text-[#FFD700]",
  delete_user: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function SystemLogsPage() {
  const { token } = useAuth();
  const client = useBackend(token);
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await client.logs.listLogs();
      setLogs(resp.logs);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-[#006400]" /> System Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Last 100 system events</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-[#006400]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Time</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-GH")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#006400] dark:text-green-400 font-semibold">
                      {log.staffId ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{log.fullName ?? "System"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge[log.action] ?? "bg-muted text-muted-foreground"}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.details ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No logs found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
}
