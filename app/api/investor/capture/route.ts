// === EARLY_CAPTURE: This entire file is part of early capture feature ===
// To revert: Delete this file and remove calls to /api/investor/capture

import { NextResponse } from "next/server"

import {
  createInvestorProfile,
  createDealInvestor,
  isDealmakerConfigured,
  type DealMakerApiError,
  type UtmParams,
} from "@/lib/dealmaker"

/**
 * POST /api/investor/capture
 * Creates a basic investor profile when user completes Step 1.
 * This captures the lead early (email, name, phone, amount) before they
 * complete the full details in Step 2.
 */
export async function POST(request: Request) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured." },
      { status: 503 }
    )
  }

  const dealId = process.env.DEALMAKER_DEAL_ID!
  const body = await request.json()

  const { 
    email, 
    firstName, 
    lastName, 
    phone, 
    investmentAmount,
    utm_source, 
    utm_medium, 
    utm_campaign, 
    utm_content, 
    utm_term 
  } = body

  if (!email || !investmentAmount || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Email, name, and investment amount are required." },
      { status: 400 }
    )
  }

  try {
    // Build minimal profile data for early capture
    const profileData: Record<string, unknown> = {
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    }

    // Add phone if provided (not in E.164 yet - we don't have country)
    // We'll use US as default for now, will be updated in Step 2
    if (phone) {
      // Simple conversion assuming US/CA format
      const digits = phone.replace(/\D/g, "")
      if (digits.length === 10) {
        profileData.phone_number = `+1${digits}`
      } else if (digits.length === 11 && digits.startsWith("1")) {
        profileData.phone_number = `+${digits}`
      } else if (phone.startsWith("+")) {
        profileData.phone_number = `+${digits}`
      }
    }

    // Build UTM params
    const utmParams: UtmParams = {}
    if (utm_source) utmParams.utm_source = utm_source
    if (utm_medium) utmParams.utm_medium = utm_medium
    if (utm_campaign) utmParams.utm_campaign = utm_campaign
    if (utm_content) utmParams.utm_content = utm_content
    if (utm_term) utmParams.utm_term = utm_term

    console.log("[v0] Early capture - Creating individual profile")
    const profile = await createInvestorProfile("individual", profileData)
    const profileId = profile.id
    console.log("[v0] Early capture - Profile created with ID:", profileId)

    // Create the investor record in the deal
    const investorData: {
      email: string
      first_name: string
      last_name: string
      phone_number?: string
      investment_value: number
      allocation_unit: string
      investor_profile_id: number
    } = {
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      investment_value: investmentAmount,
      allocation_unit: "amount",
      investor_profile_id: profileId,
    }
    
    if (profileData.phone_number) {
      investorData.phone_number = profileData.phone_number as string
    }
    
    const investor = await createDealInvestor(dealId, investorData, utmParams)
    console.log("[v0] Early capture - Investor created with ID:", investor.id)

    return NextResponse.json({
      success: true,
      investorId: investor.id,
      profileId: profileId,
      subscriptionId: investor.subscription_id,
      state: investor.state,
    })
  } catch (error) {
    console.error("[v0] Early capture failed:", error)

    const apiErr = error as Partial<DealMakerApiError>
    const status = apiErr.status || 500
    const responseBody = apiErr.responseBody || ""
    
    // If 409 conflict, the investor already exists - that's okay for early capture
    // We can try to find the existing investor or just proceed without capturing
    if (status === 409) {
      console.log("[v0] Early capture - Investor already exists, continuing without new capture")
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: "Investor already exists for this deal"
      })
    }

    return NextResponse.json({ error: responseBody || "Failed to capture investor" }, { status })
  }
}
