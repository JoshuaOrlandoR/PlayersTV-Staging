import { NextResponse } from "next/server"

import {
  createInvestorProfile,
  createDealInvestor,
  updateDealInvestor,
  getInvestorAccessLink,
  isDealmakerConfigured,
  type DealMakerApiError,
  type InvestorType,
  type UtmParams,
} from "@/lib/dealmaker"

export async function POST(request: Request) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured. Add API credentials to proceed." },
      { status: 503 }
    )
  }

  const dealId = process.env.DEALMAKER_DEAL_ID!
  const body = await request.json()

  try {
    // 1. Build type-specific profile payload
    const investorType: InvestorType = body.investorType || "individual"
    let profileData: Record<string, unknown> = { email: body.email }

    switch (investorType) {
      case "individual":
        profileData.first_name = body.firstName
        profileData.last_name = body.lastName
        break
      case "joint":
        profileData.first_name = body.firstName
        profileData.last_name = body.lastName
        profileData.joint_holder_first_name = body.jointFirstName || ""
        profileData.joint_holder_last_name = body.jointLastName || ""
        break
      case "corporation":
        profileData.name = body.corporationName || ""
        profileData.signing_officer_first_name = body.firstName
        profileData.signing_officer_last_name = body.lastName
        break
      case "trust":
        profileData.name = body.trustName || ""
        profileData.trustees = [{
          first_name: body.firstName,
          last_name: body.lastName,
        }]
        break
      default:
        profileData.first_name = body.firstName
        profileData.last_name = body.lastName
    }

    console.log("[v0] Creating investor profile:", { type: investorType, payload: profileData })
    const profile = await createInvestorProfile(investorType, profileData)
    console.log("[v0] Profile created:", JSON.stringify(profile))

    // 2. Extract UTM params from request body
    const utmParams: UtmParams = {}
    if (body.utm_source) utmParams.utm_source = body.utm_source
    if (body.utm_medium) utmParams.utm_medium = body.utm_medium
    if (body.utm_campaign) utmParams.utm_campaign = body.utm_campaign
    if (body.utm_content) utmParams.utm_content = body.utm_content
    if (body.utm_term) utmParams.utm_term = body.utm_term

    // 3. Create the deal investor with the profile ID and UTM params
    console.log("[v0] Creating deal investor with profile_id:", profile.id, "UTM:", utmParams)
    const investor = await createDealInvestor(dealId, {
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      investment_value: body.investmentAmount,
      allocation_unit: "amount",
      investor_profile_id: profile.id,
    }, utmParams)
    console.log("[v0] Investor created:", JSON.stringify(investor))

    // Get DealMaker's OTP access link for the investor to complete payment
    let paymentUrl: string | null = null
    try {
      const accessLink = await getInvestorAccessLink(dealId, investor.id)
      paymentUrl = accessLink.access_link || null
    } catch (accessError) {
      console.error("Failed to get investor access link:", accessError)
    }

    return NextResponse.json({
      investorId: investor.id,
      subscriptionId: investor.subscription_id,
      state: investor.state,
      paymentUrl,
    })
  } catch (error) {
    console.error("Failed to create investor:", error)

    const apiErr = error as Partial<DealMakerApiError>
    const status = apiErr.status || 0
    let userMessage = "Something went wrong. Please try again or contact support."

    // Try to parse structured error details from DealMaker's response
    let apiErrors: Record<string, string[]> = {}
    if (apiErr.responseBody) {
      try {
        const parsed = JSON.parse(apiErr.responseBody)
        // DealMaker returns errors as { "errors": { "field": ["message", ...] } }
        // or { "error": "message" } or { "message": "..." }
        if (parsed.errors && typeof parsed.errors === "object") {
          apiErrors = parsed.errors
        } else if (parsed.error) {
          userMessage = String(parsed.error)
        } else if (parsed.message) {
          userMessage = String(parsed.message)
        }
      } catch {
        // responseBody was not JSON, fall through to status-based handling
      }
    }

    // Build field-specific error messages
    const fieldMessages = Object.entries(apiErrors).map(([field, messages]) => {
      const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      return `${label}: ${(messages as string[]).join(", ")}`
    })

    if (fieldMessages.length > 0) {
      userMessage = fieldMessages.join(". ") + "."
    } else if (status === 422) {
      if (!body.email || !body.firstName || !body.lastName) {
        userMessage = "Please fill in all required fields (first name, last name, and email)."
      } else {
        userMessage = "The information provided could not be processed. Please check your details and try again."
      }
    } else if (status === 409) {
      userMessage = "An investor with this email already exists for this deal. Please use a different email address, or use the 'Resume Investment' option above."
    } else if (status === 401) {
      userMessage = "Authentication error. Please try again later."
    } else if (status === 404) {
      userMessage = "The investment deal could not be found. Please try again later."
    } else if (status === 429) {
      userMessage = "Too many requests. Please wait a moment and try again."
    }

    return NextResponse.json(
      { error: userMessage },
      { status: status >= 400 ? status : 500 }
    )
  }
}

export async function PATCH(request: Request) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured" },
      { status: 503 }
    )
  }

  const dealId = process.env.DEALMAKER_DEAL_ID!
  const body = await request.json()

  try {
    const updated = await updateDealInvestor(dealId, body.investorId, {
      current_step: body.currentStep,
    })

    return NextResponse.json({
      investorId: updated.id,
      state: updated.state,
      currentStep: updated.current_step,
    })
  } catch (error) {
    console.error("Failed to update investor:", error)
    return NextResponse.json(
      { error: "Failed to update investor record" },
      { status: 500 }
    )
  }
}
