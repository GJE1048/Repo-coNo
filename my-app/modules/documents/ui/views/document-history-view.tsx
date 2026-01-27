"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, Clock, RotateCcw, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentHistoryViewProps {
  documentId: string;
}

export const DocumentHistoryView = ({ documentId }: DocumentHistoryViewProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const { data: document, isLoading: docLoading } = trpc.documents.getDocument.useQuery({ id: documentId });
  const { data: historyData, isLoading: historyLoading } = trpc.documents.getDocumentVersions.useQuery({ documentId });
  
  const restoreMutation = trpc.documents.restoreDocumentVersion.useMutation({
    onSuccess: (data) => {
      alert(`成功回退到版本 ${data.restoredVersion}`);
      utils.documents.getDocumentVersions.invalidate({ documentId });
      // Optionally redirect back to document
      router.push(`/documents/${documentId}`);
    },
    onError: (err) => {
      alert(`回退失败: ${err.message}`);
      setRestoringId(null);
    }
  });

  const handleRestore = (version: number) => {
    if (confirm(`确定要回退到版本 ${version} 吗？当前未保存的内容将会丢失。`)) {
      setRestoringId(version);
      restoreMutation.mutate({ documentId, version });
    }
  };

  if (docLoading || historyLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p>文档不存在</p>
        <Button onClick={() => router.push("/")}>返回首页</Button>
      </div>
    );
  }

  const versions = historyData?.versions || [];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/documents/${documentId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{document.title} - 版本历史</h1>
            <p className="text-muted-foreground text-sm">
              查看文档的历史版本并进行回退操作
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {versions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无历史版本记录
            </CardContent>
          </Card>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background">v{version.version}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  {historyData?.currentVersion === version.version && (
                    <Badge variant="default" className="bg-green-600">当前版本</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={version.creator?.imageUrl || ""} />
                        <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {version.creator?.name || "未知用户"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {version.reason === 'auto' ? '自动保存' : version.reason}
                      </span>
                    </div>
                  </div>
                  
                  {historyData?.currentVersion !== version.version && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(version.version)}
                      disabled={restoringId === version.version || restoreMutation.isPending}
                    >
                      {restoringId === version.version ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-2" />
                      )}
                      回退至此版本
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
