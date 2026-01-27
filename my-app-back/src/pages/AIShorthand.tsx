import { useEffect, useState } from "react";
import { 
  Eye,
  Loader2,
  FileAudio,
  Trash2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { trpc } from "../lib/api";
import type { AIShorthandRecord } from "../types";
import { Modal } from "../components/ui/modal";

export function AIShorthand() {
  const [records, setRecords] = useState<AIShorthandRecord[]>([]);
  const [page, setPage] = useState(1);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIShorthandRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const utils = trpc.useUtils();

  const { data, isLoading: loading, error } = trpc.admin.getAIShorthandRecords.useQuery(
    { page, limit },
    { keepPreviousData: true },
  );
  const deleteMutation = trpc.admin.deleteAIShorthandRecord.useMutation({
    onSuccess: () => utils.admin.getAIShorthandRecords.invalidate(),
  });
  const detailQuery = trpc.admin.getAIShorthandDetail.useQuery(
    { id: viewRecordId ?? "" },
    { enabled: Boolean(viewRecordId) },
  );

  const resolved = (() => {
    if (Array.isArray(data) && data[0]?.result?.data?.json) {
      return data[0].result.data.json as { data: AIShorthandRecord[]; total: number };
    }
    if (data && typeof data === "object" && "data" in (data as object)) {
      return data as { data: AIShorthandRecord[]; total: number };
    }
    return undefined;
  })();

  useEffect(() => {
    if (!resolved) return;
    setRecords(resolved.data ?? []);
    setTotal(resolved.total ?? 0);
  }, [resolved]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const getStatusBadge = (status: AIShorthandRecord['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'recording':
        return <Badge className="bg-blue-500 animate-pulse">Recording</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const resolveUserLabel = (record: {
    user?: { username?: string | null; clerkId?: string | null } | null;
    userId?: string | null;
  }) => {
    return record.user?.username || record.user?.clerkId || record.userId || "-";
  };

  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      if (viewRecordId === deleteTarget.id) {
        setViewRecordId(null);
      }
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("Failed to delete AI record", deleteError);
      setMessage("删除录音记录失败，请稍后重试。");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Shorthand</h2>
          <p className="text-muted-foreground">
            Monitor AI voice transcription and summarization tasks.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voice Records</CardTitle>
              <CardDescription>
                List of all voice notes and their transcription status.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex h-40 items-center justify-center text-red-500">
              Error: {error.message}
            </div>
          ) : loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{record.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{resolveUserLabel(record)}</TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewRecordId(record.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(viewRecordId)}
        title={detailQuery.data?.title ?? "AI Shorthand Detail"}
        onClose={() => setViewRecordId(null)}
        actions={<Button onClick={() => setViewRecordId(null)}>Close</Button>}
      >
        <div className="space-y-4">
          {detailQuery.error ? (
            <div className="text-sm text-red-500">{detailQuery.error.message}</div>
          ) : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载录音详情中...
            </div>
          ) : (
            <>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">用户</span>
                  <span>{detailQuery.data ? resolveUserLabel(detailQuery.data) : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">状态</span>
                  <span>{detailQuery.data ? getStatusBadge(detailQuery.data.status) : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">录音日期</span>
                  <span>{detailQuery.data ? formatDate(detailQuery.data.date) : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">时长</span>
                  <span>{detailQuery.data?.duration ?? 0}s</span>
                </div>
              </div>

              {detailQuery.data?.audioUrl ? (
                <audio controls className="w-full">
                  <source src={detailQuery.data.audioUrl} />
                </audio>
              ) : null}

              <div>
                <h4 className="text-sm font-medium">摘要</h4>
                <div className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                  {detailQuery.data?.summary || "暂无摘要"}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium">笔记</h4>
                <div className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                  {detailQuery.data?.notes || "暂无笔记"}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium">逐字稿</h4>
                <div className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                  {detailQuery.data?.transcript || "暂无内容"}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete AI Record"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRecord}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">
            {deleteTarget?.title}
          </span>
          ? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(message)}
        title="Notice"
        onClose={() => setMessage(null)}
        actions={<Button onClick={() => setMessage(null)}>OK</Button>}
      >
        <p className="text-sm text-muted-foreground">{message}</p>
      </Modal>
    </div>
  );
}
