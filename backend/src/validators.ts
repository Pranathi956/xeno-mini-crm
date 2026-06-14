import * as zod from "zod";

export const HealthCheckResponse = zod.object({ status: zod.string() });

export const ListCustomersQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  city: zod.coerce.string().optional(),
  minSpent: zod.coerce.number().optional(),
  maxSpent: zod.coerce.number().optional(),
});

export const BulkCreateCustomersBody = zod.object({
  customers: zod.array(
    zod.object({
      name: zod.string(),
      email: zod.string(),
      phone: zod.string(),
      city: zod.string(),
      totalSpent: zod.number().optional(),
      visitCount: zod.number().optional(),
      lastPurchaseDate: zod.string().nullish(),
    })
  ),
});

export const BulkCreateOrdersBody = zod.object({
  orders: zod.array(
    zod.object({
      customerId: zod.number(),
      amount: zod.number(),
      productName: zod.string(),
      status: zod.string(),
    })
  ),
});

export const PreviewSegmentBody = zod.object({ segmentQuery: zod.string() });

export const CreateCampaignBody = zod.object({
  name: zod.string(),
  segmentQuery: zod.string(),
  message: zod.string(),
  channel: zod.string(),
  sentByAi: zod.boolean().optional(),
});

export const GetCampaignParams = zod.object({ id: zod.coerce.number() });
export const SendCampaignParams = zod.object({ id: zod.coerce.number() });
export const GetCampaignStatsParams = zod.object({ id: zod.coerce.number() });

export const CreateReceiptBody = zod.object({
  communicationId: zod.number(),
  status: zod.string(),
});

export const AiChatBody = zod.object({
  message: zod.string(),
  history: zod
    .array(zod.object({ role: zod.string(), content: zod.string() }))
    .optional(),
});
