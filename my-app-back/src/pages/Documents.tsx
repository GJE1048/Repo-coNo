import { useEffect, useState } from "react";
import { 
  Search, 
  FileText,
  Loader2,
  Archive,
  Eye,
  Pencil,
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
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";

export function Documents() {
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editDocument, setEditDocument] = useState<{ id: string; title: string } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const limit = 10;
  const { data, isLoading: loading, error } = trpc.admin.getDocuments.useQuery(
    { page, limit, search },
    { keepPreviousData: true },
  );
  const updateDocumentMutation = trpc.admin.updateDocument.useMutation({
    onSuccess: () => utils.admin.getDocuments.invalidate(),
  });
  const deleteDocumentMutation = trpc.admin.deleteDocument.useMutation({
    onSuccess: () => utils.admin.getDocuments.invalidate(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resolved = (() => {
    if (Array.isArray(data) && data[0]?.result?.data?.json) {
      return data[0].result.data.json as {
        data: {
          id: string;
          title: string;
          workspaceId: string | null;
          isArchived: boolean;
          createdAt: Date | string;
          updatedAt: Date | string;
          workspace: { id: string | null; name: string | null } | null;
        }[];
        total: number;
      };
    }
    if (data && typeof data === "object" && "data" in (data as object)) {
      return data as {
        data: {
          id: string;
          title: string;
          workspaceId: string | null;
          isArchived: boolean;
          createdAt: Date | string;
          updatedAt: Date | string;
          workspace: { id: string | null; name: string | null } | null;
        }[];
        total: number;
      };
    }
    return undefined;
  })();
  const documents = resolved?.data ?? [];
  const total = resolved?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const openRenameDocument = (document: { id: string; title: string }) => {
    setEditDocument(document);
    setEditTitle(document.title);
  };

  const handleUpdateDocument = async () => {
    if (!editDocument) return;
    const title = editTitle.trim();
    if (!title) {
      setMessage("Title is required.");
      return;
    }
    if (title === editDocument.title) {
      setEditDocument(null);
      return;
    }
    try {
      await updateDocumentMutation.mutateAsync({
        id: editDocument.id,
        title,
      });
      setEditDocument(null);
    } catch (updateError) {
      console.error("Failed to update document", updateError);
      setMessage("Failed to update document.");
    }
  };

  const handleToggleArchive = async (document: { id: string; isArchived: boolean }) => {
    try {
      await updateDocumentMutation.mutateAsync({
        id: document.id,
        isArchived: !document.isArchived,
      });
    } catch (updateError) {
      console.error("Failed to update document", updateError);
      setMessage("Failed to update document.");
    }
  };

  const openDeleteDocument = (document: { id: string; title: string }) => {
    setDeleteTarget(document);
  };

  const handleDeleteDocument = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocumentMutation.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("Failed to delete document", deleteError);
      setMessage("Failed to delete document.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Manage all documents created within the platform.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                View and manage user documents.
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search documents..."
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
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
                    <TableHead>Workspace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {doc.workspace?.name ?? doc.workspaceId ?? "Personal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.isArchived ? (
                          <Badge variant="secondary" className="flex w-fit items-center gap-1">
                            <Archive className="h-3 w-3" /> Archived
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRenameDocument(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleArchive(doc)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDocument(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No documents found.
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
        open={Boolean(editDocument)}
        title="Edit Document"
        onClose={() => setEditDocument(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditDocument(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument} disabled={updateDocumentMutation.isPending}>
              {updateDocumentMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div>
          <label className="text-sm font-medium" htmlFor="modal-document-title">
            Title
          </label>
          <Input
            id="modal-document-title"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Document"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDocument}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
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
