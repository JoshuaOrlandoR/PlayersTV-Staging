import { NextResponse } from "next/server"

import {
  createInvestorProfile,
  createDealInvestor,
  isDealmakerConfigured,
  type DealMakerApiError,
  type InvestorType,
  type UtmParams,
} from "@/lib/dealmaker"

// Country dial codes mapping (must match COUNTRIES in step-two-details.tsx)
const COUNTRY_DIAL_CODES: Record<string, string> = {
  US: "+1",
  CA: "+1",
  GB: "+44",
  AU: "+61",
  DE: "+49",
  FR: "+33",
  IT: "+39",
  ES: "+34",
  NL: "+31",
  CH: "+41",
  JP: "+81",
  SG: "+65",
  HK: "+852",
  MX: "+52",
  BR: "+55",
}

/**
 * Convert phone number to E.164 format
 * Input can be: (416) 206-8506, 03-1234-5678 (Japan), etc.
 * Uses the country code to determine the correct dial code prefix
 */
function toE164(phone: string, countryCode = "US"): string {
  // Strip all non-digit characters except leading +
  const hasPlus = phone.startsWith("+")
  const digits = phone.replace(/\D/g, "")
  
  // If already in E.164 format with + and enough digits, return as-is
  if (hasPlus && digits.length >= 7) {
    return `+${digits}`
  }
  
  // Get the dial code for the country
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || "+1"
  const dialDigits = dialCode.replace(/\D/g, "")
  
  // Check if the number already starts with the country dial code
  if (digits.startsWith(dialDigits)) {
    return `+${digits}`
  }
  
  // Remove leading zero if present (common in many countries like UK, Japan, Australia)
  const normalizedDigits = digits.startsWith("0") ? digits.slice(1) : digits
  
  // Add the dial code prefix
  return `${dialCode}${normalizedDigits}`
}

/**
 * POST /api/investor/create
 * Creates a complete investor profile with all details from Step 2.
 * This is called when user completes Step 2 (the details form).
 */
export async function POST(request: Request) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured. Add API credentials to proceed." },
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
    investorType = "individual",
    streetAddress,
    unit,
    city,
    postalCode,
    country,
    state,
    dateOfBirth,
    jointFirstName,
    jointLastName,
    entityName,
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
    // Build the profile data
    const profileData: Record<string, unknown> = {
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    }

    // Add phone in E.164 format (required by DealMaker)
    const e164Phone = phone ? toE164(phone, country || "US") : undefined
    if (e164Phone) {
      profileData.phone_number = e164Phone
    }

    // Add address fields per DealMaker OpenAPI spec (createIndividualProfile schema)
    if (streetAddress) {
      profileData.street_address = streetAddress
      profileData.city = city
      profileData.postal_code = postalCode
      profileData.country = country // e.g., "US", "CA" 
      // Only send region if it has a value (some countries don't have states)
      if (state && state.trim()) {
        profileData.region = state // DealMaker uses "region" for state/province
      }
      if (unit) profileData.unit2 = unit // DealMaker uses "unit2" not "unit"
    }

    // Add date of birth in YYYY-MM-DD format (DealMaker required format)
    // Use T12:00:00Z (noon UTC) to prevent timezone shift issues
    // (midnight UTC can shift back a day when converted to US timezones)
    if (dateOfBirth) {
      const parts = dateOfBirth.split("/")
      if (parts.length === 3) {
        const [month, day, year] = parts
        profileData.date_of_birth = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`
      }
    }

    // Build UTM params
    const utmParams: UtmParams = {}
    if (utm_source) utmParams.utm_source = utm_source
    if (utm_medium) utmParams.utm_medium = utm_medium
    if (utm_campaign) utmParams.utm_campaign = utm_campaign
    if (utm_content) utmParams.utm_content = utm_content
    if (utm_term) utmParams.utm_term = utm_term

    // Determine profile type and create profile
    // Joint requires taxpayer_id which we don't collect - skip profile, user selects Joint in checkout
    let type: InvestorType = "individual"
    let profileId: number | undefined
    
    if (investorType === "joint") {
      // Skip profile creation for Joint - user will select Joint in DealMaker checkout
      // and enter SSN/SIN there (Joint profile requires taxpayer_id)
      console.log("[v0] Skipping profile creation for Joint - user will complete in checkout")
    } else if (investorType === "corporation") {
      type = "corporation"
      if (entityName) profileData.name = entityName
      console.log("[v0] Creating corporation profile")
      const profile = await createInvestorProfile(type, profileData)
      profileId = profile.id
    } else if (investorType === "trust") {
      type = "trust"
      if (entityName) profileData.name = entityName
      console.log("[v0] Creating trust profile")
      const profile = await createInvestorProfile(type, profileData)
      profileId = profile.id
    } else {
      // individual or ira
      type = "individual"
      console.log("[v0] Creating individual profile")
      const profile = await createInvestorProfile(type, profileData)
      profileId = profile.id
    }
    
    if (profileId) {
      console.log("[v0] Profile created with ID:", profileId)
    }

    // Create the investor record in the deal
    const investorData: {
      email: string
      first_name: string
      last_name: string
      phone_number: string
      investment_value: number
      allocation_unit: string
      investor_profile_id?: number
    } = {
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: e164Phone,
      investment_value: investmentAmount,
      allocation_unit: "amount",
    }
    
    // Only attach profile if we created one
    if (profileId) {
      investorData.investor_profile_id = profileId
    }
    
    const investor = await createDealInvestor(dealId, investorData, utmParams)
    console.log("[v0] Investor created successfully:", investor.id)

    return NextResponse.json({
      success: true,
      investorId: investor.id,
      profileId: profileId,
      subscriptionId: investor.subscription_id,
      state: investor.state,
    })
  } catch (error) {
    console.error("[v0] Failed to create investor:", error)

    const apiErr = error as Partial<DealMakerApiError>
    const status = apiErr.status || 500
    const responseBody = apiErr.responseBody || ""
    
    console.error("[v0] DealMaker API error status:", status)
    console.error("[v0] DealMaker API error body:", responseBody)
    
    let userMessage = "Something went wrong. Please try again."

    if (status === 409) {
      userMessage = "An investor with this email already exists for this deal."
    } else if (status === 422) {
      userMessage = `Invalid data provided. Please check your information and try again. (${responseBody})`
    } else if (status === 400) {
      userMessage = `Bad request. ${responseBody}`
    }

    return NextResponse.json({ error: userMessage }, { status })
  }
}
