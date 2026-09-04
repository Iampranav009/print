import { redirect } from "next/navigation";

export default async function ShopRedirectPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  redirect(`/app/print?shop=${encodeURIComponent(shopId)}`);
}
