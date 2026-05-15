// === EARLY_CAPTURE: This entire file is part of early capture feature ===
// To revert: Delete this file and update step-two-details.tsx to always use /api/investor/create

import { NextResponse } from "next/server"

import {
  patchInvestorProfile,
  updateDealInvestor,
  isDealmakerConfigured,
  type DealMakerApiError,
  type InvestorType,
} from "@/lib/dealmaker"

// Country dial codes mapping
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
 */
function toE164(phone: string, countryCode = "US"): string {
  const hasPlus = phone.startsWith("+")
  const digits = phone.replace(/\D/g, "")
  
  if (hasPlus && digits.length >= 7) {
    return `+${digits}`
  }
  
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || "+1"
  const dialDigits = dialCode.replace(/\D/g, "")
  
  if (digits.startsWith(dialDigits)) {
    return `+${digits}`
  }
  
  const normalizedDigits = digits.startsWith("0") ? digits.slice(1) : digits
  return `${dialCode}${normalizedDigits}`
}

/**
 * POST /api/investor/update
 * Updates an existing investor profile with additional details from Step 2.
 * This is called when early capture already created a basic investor in Step 1.
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
    existingInvestorId,
    existingProfileId,
    firstName, 
    lastName, 
    phone, 
    investorType = "individual",
    streetAddress,
    unit,
    city,
    postalCode,
    country,
    state,
    dateOfBirth,
    entityName,
  } = body

  if (!existingInvestorId || !existingProfileId) {
    return NextResponse.json(
      { error: "Missing existing investor or profile ID." },
      { status: 400 }
    )
  }

  try {
    // Build the profile update data
    const profileData: Record<string, unknown> = {}

    // Add phone in E.164 format
    const e164Phone = phone ? toE164(phone, country || "US") : undefined
    if (e164Phone) {
      profileData.phone_number = e164Phone
    }

    // Add address fields
    if (streetAddress) {
      profileData.street_address = streetAddress
      profileData.city = city
      profileData.postal_code = postalCode
      profileData.country = country
      if (state && state.trim()) {
        profileData.region = state
      }
      if (unit) profileData.unit2 = unit
    }

    // Add date of birth
    if (dateOfBirth) {
      const parts = dateOfBirth.split("/")
      if (parts.length === 3) {
        const [month, day, year] = parts
        profileData.date_of_birth = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`
      }
    }

    // Add entity name for corporation/trust
    if (entityName && ["corporation", "trust", "llc", "partnership"].includes(investorType)) {
      profileData.name = entityName
    }

    // Determine profile type
    let type: InvestorType = "individual"
    if (investorType === "corporation" || investorType === "llc" || investorType === "partnership") {
      type = "corporation"
    } else if (investorType === "trust") {
      type = "trust"
    }

    console.log("[v0] Updating profile:", existingProfileId, "with data:", JSON.stringify(profileData, null, 2))

    // Patch the existing profile with address and additional details
    if (Object.keys(profileData).length > 0) {
      const patchResult = await patchInvestorProfile(type, existingProfileId, profileData)
      console.log("[v0] Profile PATCH result:", JSON.stringify(patchResult, null, 2))
    }

    // Update the investor record if needed (e.g., if investor type changed)
    // For now, we just return success with the existing IDs
    console.log("[v0] Update complete for investor:", existingInvestorId)

    return NextResponse.json({
      success: true,
      investorId: existingInvestorId,
      profileId: existingProfileId,
    })
  } catch (error) {
    console.error("[v0] Failed to update investor:", error)

    const apiErr = error as Partial<DealMakerApiError>
    const status = apiErr.status || 500
    const responseBody = apiErr.responseBody || ""
    
    console.error("[v0] DealMaker API error status:", status)
    console.error("[v0] DealMaker API error body:", responseBody)
    
    let userMessage = "Something went wrong. Please try again."
    if (status === 422) {
      userMessage = `Invalid data provided. Please check your information. (${responseBody})`
    } else if (status === 400) {
      userMessage = `Bad request. ${responseBody}`
    }

    return NextResponse.json({ error: userMessage }, { status })
  }
}
