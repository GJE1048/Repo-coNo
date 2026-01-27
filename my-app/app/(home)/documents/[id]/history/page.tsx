import { DocumentHistoryView } from "@/modules/documents/ui/views/document-history-view";

interface DocumentHistoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

const DocumentHistoryPage = async ({ params }: DocumentHistoryPageProps) => {
  const { id } = await params;

  return <DocumentHistoryView documentId={id} />;
};

export default DocumentHistoryPage;
