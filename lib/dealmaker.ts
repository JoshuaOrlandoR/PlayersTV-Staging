export interface DealMakerApiError extends Error {
  status: number
  responseBody: string
}

const API_BASE = process.env.DEALMAKER_API_URL || "https://api.dealmaker.tech"
const TOKEN_URL = "https://app.dealmaker.tech/oauth/token"

export interface DealmakerDeal {
  id: number
  name: string
  price_per_security: number
  minimum_investment: number
  maximum_investment: number
  currency: string
  currency_symbol: string
  security_type: string
  funding_goal_cents: number
  funded_amount_cents: number
  investors_count: number
  status: string
}

export interface IncentiveTier {
  id: number
  minimum_amount: number
  bonus_percentage: number
  free_shares: number
}

export interface IncentivePlan {
  tiers: IncentiveTier[]
}

export interface InvestorProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  phone_number: string
}

export interface DealInvestor {
  id: number
  investor_profile_id: number
  subscription_id: string
  investment_value: number
  number_of_securities: number
  state: string
  current_step: string
  name?: string
  created_at?: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const clientId = process.env.DEALMAKER_CLIENT_ID
  const clientSecret = process.env.DEALMAKER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("DEALMAKER_CLIENT_ID and DEALMAKER_CLIENT_SECRET are required")
  }

  const params: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }

  const scope = process.env.DEALMAKER_SCOPES || "deals.read deals.write deals.investors.read deals.investors.write companies.read companies.write webhooks.read webhooks.write"
  if (scope) {
    params.scope = scope
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "")
    throw new Error(`DealMaker auth failed: ${res.status} - ${errorBody}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return cachedToken.token
}

async function dmFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken()

  const url = `${API_BASE}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.dealmaker-v1+json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`DealMaker API ${res.status}: ${path} - ${body}`)
    ;(err as DealMakerApiError).status = res.status
    ;(err as DealMakerApiError).responseBody = body
    throw err
  }

  return res.json()
}

export async function getDeal(dealId: string): Promise<DealmakerDeal> {
  return dmFetch<DealmakerDeal>(`/deals/${dealId}`)
}

export async function getDealIncentiveTiers(dealId: string): Promise<IncentiveTier[]> {
  const data = await dmFetch<IncentiveTier[]>(`/deals/${dealId}/incentive_plan/tiers`)
  return data
}

export type InvestorType = "individual" | "joint" | "corporation" | "trust" | "ira" | "llc" | "partnership" | "managed"

const PROFILE_ENDPOINTS: Record<InvestorType, string> = {
  individual: "/investor_profiles/individuals",
  joint: "/investor_profiles/joints",
  corporation: "/investor_profiles/corporations",
  trust: "/investor_profiles/trusts",
  ira: "/investor_profiles/individuals", // IRA uses individual profile
  llc: "/investor_profiles/corporations", // LLC uses corporation profile
  partnership: "/investor_profiles/corporations", // Partnership uses corporation profile
  managed: "/investor_profiles/managed",
}

/**
 * Creates an investor profile for the given type.
 * Sends all available fields to pre-fill the DealMaker checkout.
 */
export async function createInvestorProfile(
  type: InvestorType,
  data: Record<string, unknown>
): Promise<InvestorProfile> {
  const endpoint = PROFILE_ENDPOINTS[type]
  console.log("[v0] DealMaker createInvestorProfile endpoint:", endpoint)
  console.log("[v0] DealMaker createInvestorProfile payload:", JSON.stringify(data, null, 2))
  
  const result = await dmFetch<InvestorProfile>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  })
  
  console.log("[v0] DealMaker createInvestorProfile response:", JSON.stringify(result, null, 2))
  return result
}

/**
 * Patches an existing investor profile with additional data.
 * Useful to ensure address and other fields are persisted.
 */
export async function patchInvestorProfile(
  type: InvestorType,
  profileId: number,
  data: Record<string, unknown>
): Promise<InvestorProfile> {
  const baseEndpoint = PROFILE_ENDPOINTS[type]
  const endpoint = `${baseEndpoint}/${profileId}`
  console.log("[v0] DealMaker patchInvestorProfile endpoint:", endpoint)
  console.log("[v0] DealMaker patchInvestorProfile payload:", JSON.stringify(data, null, 2))
  
  const result = await dmFetch<InvestorProfile>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  
  console.log("[v0] DealMaker patchInvestorProfile response:", JSON.stringify(result, null, 2))
  return result
}

export interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export async function createDealInvestor(
  dealId: string,
  data: {
    email: string
    first_name: string
    last_name: string
    phone?: string
    investment_value: number
    allocation_unit?: string
    investor_profile_id?: number
  },
  utmParams?: UtmParams
): Promise<DealInvestor> {
  // Build UTM headers for DealMaker's UtmExtractorMiddleware
  const utmHeaders: Record<string, string> = {}
  if (utmParams?.utm_source) utmHeaders["X-DealMaker-UTM-Source"] = utmParams.utm_source
  if (utmParams?.utm_medium) utmHeaders["X-DealMaker-UTM-Medium"] = utmParams.utm_medium
  if (utmParams?.utm_campaign) utmHeaders["X-DealMaker-UTM-Campaign"] = utmParams.utm_campaign
  if (utmParams?.utm_content) utmHeaders["X-DealMaker-UTM-Content"] = utmParams.utm_content
  if (utmParams?.utm_term) utmHeaders["X-DealMaker-UTM-Term"] = utmParams.utm_term

  return dmFetch<DealInvestor>(`/deals/${dealId}/investors`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: utmHeaders,
  })
}

export async function updateDealInvestor(
  dealId: string,
  investorId: number,
  data: { current_step?: string; investor_profile_id?: number }
): Promise<DealInvestor> {
  return dmFetch<DealInvestor>(`/deals/${dealId}/investors/${investorId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function searchDealInvestors(
  dealId: string,
  query: string
): Promise<unknown> {
  const encoded = encodeURIComponent(query)
  // Return raw response -- caller handles paginated vs bare array
  return dmFetch<unknown>(`/deals/${dealId}/investors?q=${encoded}&per_page=5`)
}

export async function getInvestorAccessLink(
  dealId: string,
  investorId: number
): Promise<{ access_link: string }> {
  return dmFetch<{ access_link: string }>(`/deals/${dealId}/investors/${investorId}/otp_access_link`)
}

export function isDealmakerConfigured(): boolean {
  return !!(
    process.env.DEALMAKER_CLIENT_ID &&
    process.env.DEALMAKER_CLIENT_SECRET &&
    process.env.DEALMAKER_DEAL_ID
  )
}
