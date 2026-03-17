import { notFound } from "next/navigation";
import { getClientDetail, getMissingTemplates } from "../actions";
import { ClientDetailView } from "./client-detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientDetail(id);
  return {
    title: client
      ? `${client.name} | 期限管理システム`
      : "利用者が見つかりません",
  };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, missingTemplates] = await Promise.all([
    getClientDetail(id),
    getMissingTemplates(id),
  ]);

  if (!client) {
    notFound();
  }

  return <ClientDetailView client={client} missingTemplates={missingTemplates} />;
}
