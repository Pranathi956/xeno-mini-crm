import { useQuery, useMutation } from "@tanstack/react-query";
import type { StatsOverview, CampaignWithStats, Customer, SegmentPreview, Campaign, CampaignInput, SendResult } from "./api-types";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const getGetStatsOverviewQueryKey = () => ["/api/stats/overview"] as const;
export const getListCampaignsQueryKey = () => ["/api/campaigns"] as const;
export const getListCustomersQueryKey = (params?: { search?: string; city?: string; minSpent?: number; maxSpent?: number }) =>
  ["/api/customers", params] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGetStatsOverview(options?: { query?: object }) {
  return useQuery<StatsOverview>({
    queryKey: getGetStatsOverviewQueryKey(),
    queryFn: () => apiFetch<StatsOverview>("/api/stats/overview"),
    ...((options as { query?: object } | undefined)?.query ?? {}),
  });
}

export function useListCampaigns(options?: { query?: object }) {
  return useQuery<CampaignWithStats[]>({
    queryKey: getListCampaignsQueryKey(),
    queryFn: () => apiFetch<CampaignWithStats[]>("/api/campaigns"),
    ...((options as { query?: object } | undefined)?.query ?? {}),
  });
}

export function useListCustomers(
  params?: { search?: string; city?: string; minSpent?: number; maxSpent?: number },
  options?: { query?: object }
) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.city) searchParams.set("city", params.city);
  if (params?.minSpent != null) searchParams.set("minSpent", String(params.minSpent));
  if (params?.maxSpent != null) searchParams.set("maxSpent", String(params.maxSpent));
  const qs = searchParams.toString();

  return useQuery<Customer[]>({
    queryKey: getListCustomersQueryKey(params),
    queryFn: () => apiFetch<Customer[]>(`/api/customers${qs ? `?${qs}` : ""}`),
    ...((options as { query?: object } | undefined)?.query ?? {}),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function usePreviewSegment() {
  return useMutation<SegmentPreview, Error, { data: { segmentQuery: string } }>({
    mutationFn: ({ data }) =>
      apiFetch<SegmentPreview>("/api/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useCreateCampaign() {
  return useMutation<Campaign, Error, { data: CampaignInput }>({
    mutationFn: ({ data }) =>
      apiFetch<Campaign>("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useSendCampaign() {
  return useMutation<SendResult, Error, { id: number }>({
    mutationFn: ({ id }) =>
      apiFetch<SendResult>(`/api/campaigns/${id}/send`, { method: "POST" }),
  });
}
