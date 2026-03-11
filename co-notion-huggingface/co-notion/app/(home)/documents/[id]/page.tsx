import { trpc } from "@/trpc/server";
import { DocumentView } from "@/modules/documents/ui/views/document-view";

interface DocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { id } = await params;

  if (process.env.NODE_ENV === "production") {
    void trpc.documents.getDocument.prefetch({ id });
    void trpc.documents.getDocumentBlocksPage.prefetch({
      documentId: id,
      cursor: 0,
      limit: 30,
    });
  }

  return <DocumentView documentId={id} />;
};

export default DocumentPage;
