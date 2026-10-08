import "server-only";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const AIRTABLE_BASE_ID = () => requireEnv("AIRTABLE_BASE_ID");
export const TABLE_UNITS = () => requireEnv("AIRTABLE_TABLE_UNITS");
export const TABLE_JOBS = () => requireEnv("AIRTABLE_TABLE_JOBS");
export const TABLE_BUNDLES = () => requireEnv("AIRTABLE_TABLE_BUNDLES");
export const TABLE_STAFF = () => requireEnv("AIRTABLE_TABLE_STAFF");
export const TABLE_REPORTS = () => requireEnv("AIRTABLE_TABLE_REPORTS");

export interface AirtableRecord<TFields = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: TFields;
}

interface ListResponse<TFields> {
  records: AirtableRecord<TFields>[];
  offset?: string;
}

class AirtableError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
    this.name = "AirtableError";
  }
}

async function airtableFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const apiKey = requireEnv("AIRTABLE_API_KEY");
  const res = await fetch(`${AIRTABLE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new AirtableError(
      `Airtable request failed: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }

  return res.json() as Promise<T>;
}

export async function listRecords<TFields = Record<string, unknown>>(
  tableId: string,
  params?: { filterByFormula?: string; sort?: { field: string; direction?: "asc" | "desc" }[] }
): Promise<AirtableRecord<TFields>[]> {
  const baseId = AIRTABLE_BASE_ID();
  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const search = new URLSearchParams();
    if (params?.filterByFormula) {
      search.set("filterByFormula", params.filterByFormula);
    }
    params?.sort?.forEach((s, i) => {
      search.set(`sort[${i}][field]`, s.field);
      search.set(`sort[${i}][direction]`, s.direction ?? "asc");
    });
    if (offset) search.set("offset", offset);

    const query = search.toString();
    const page = await airtableFetch<ListResponse<TFields>>(
      `/${baseId}/${tableId}${query ? `?${query}` : ""}`
    );
    records.push(...page.records);
    offset = page.offset;
  } while (offset);

  return records;
}

export async function updateRecord<TFields = Record<string, unknown>>(
  tableId: string,
  recordId: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields>> {
  const baseId = AIRTABLE_BASE_ID();
  return airtableFetch<AirtableRecord<TFields>>(
    `/${baseId}/${tableId}/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    }
  );
}

export async function createRecord<TFields = Record<string, unknown>>(
  tableId: string,
  fields: TFields
): Promise<AirtableRecord<TFields>> {
  const baseId = AIRTABLE_BASE_ID();
  return airtableFetch<AirtableRecord<TFields>>(`/${baseId}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}
