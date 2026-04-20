import { SmilePayReturnStatus } from "./return-status";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalize(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SmilePayReturnPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reference = normalize(params.reference) || "";
  const forcedStatus = normalize(params.status);
  return <SmilePayReturnStatus reference={reference} forcedStatus={forcedStatus} />;
}
