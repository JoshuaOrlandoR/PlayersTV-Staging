"use client"

import { useState } from "react"
import { ArrowRight, HelpCircle, User, MapPin, Building, Phone, Calendar } from "lucide-react"
import { StepTimeline } from "@/components/step-timeline"
import {
  FALLBACK_CONFIG,
  type InvestmentConfig,
} from "@/lib/investment-utils"
import type { ReviewData } from "@/components/step-three-review"

interface StepTwoDetailsProps {
  initialAmount: number
  investorEmail: string
  investorFirstName: string
  investorLastName: string
  investorPhone: string
  utmParams?: Record<string, string>
  // === EARLY_CAPTURE: START ===
  existingInvestorId?: number
  existingProfileId?: number
  // === EARLY_CAPTURE: END ===
  onBack: () => void
  onContinue: (data: ReviewData) => void
  config?: InvestmentConfig
}

// Types for DealMaker countries/states
interface DealMakerState {
  name: string
  code: string
}

interface DealMakerCountry {
  name: string
  code: string
  states: DealMakerState[]
}

// Dial codes for phone formatting
const DIAL_CODES: Record<string, string> = {
  US: "+1", CA: "+1", GB: "+44", AU: "+61", DE: "+49", FR: "+33",
  IT: "+39", ES: "+34", NL: "+31", CH: "+41", JP: "+81", SG: "+65",
  HK: "+852", MX: "+52", BR: "+55", IN: "+91", CN: "+86", RU: "+7",
  KR: "+82", ID: "+62", PH: "+63", TH: "+66", MY: "+60", VN: "+84",
  PK: "+92", BD: "+880", EG: "+20", TR: "+90", SA: "+966", AE: "+971",
  IL: "+972", ZA: "+27", NG: "+234", KE: "+254", AR: "+54", CO: "+57",
  CL: "+56", PE: "+51", VE: "+58", PL: "+48", UA: "+380", RO: "+40",
  CZ: "+420", GR: "+30", PT: "+351", SE: "+46", NO: "+47", DK: "+45",
  FI: "+358", IE: "+353", AT: "+43", BE: "+32", NZ: "+64",
}

// DealMaker supported investor types (LLC and Partnership not available in happy path)
const INVESTOR_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "joint", label: "Joint" },
  { value: "corporation", label: "Corporation" },
  { value: "trust", label: "Trust" },
  { value: "ira", label: "IRA" },
]

// DealMaker supported countries with states/provinces where applicable
const SUPPORTED_COUNTRIES: DealMakerCountry[] = [
  { code: "US", name: "United States", states: [
    { name: "Alabama", code: "AL" }, { name: "Alaska", code: "AK" }, { name: "Arizona", code: "AZ" },
    { name: "Arkansas", code: "AR" }, { name: "California", code: "CA" }, { name: "Colorado", code: "CO" },
    { name: "Connecticut", code: "CT" }, { name: "Delaware", code: "DE" }, { name: "District of Columbia", code: "DC" },
    { name: "Florida", code: "FL" }, { name: "Georgia", code: "GA" }, { name: "Hawaii", code: "HI" },
    { name: "Idaho", code: "ID" }, { name: "Illinois", code: "IL" }, { name: "Indiana", code: "IN" },
    { name: "Iowa", code: "IA" }, { name: "Kansas", code: "KS" }, { name: "Kentucky", code: "KY" },
    { name: "Louisiana", code: "LA" }, { name: "Maine", code: "ME" }, { name: "Maryland", code: "MD" },
    { name: "Massachusetts", code: "MA" }, { name: "Michigan", code: "MI" }, { name: "Minnesota", code: "MN" },
    { name: "Mississippi", code: "MS" }, { name: "Missouri", code: "MO" }, { name: "Montana", code: "MT" },
    { name: "Nebraska", code: "NE" }, { name: "Nevada", code: "NV" }, { name: "New Hampshire", code: "NH" },
    { name: "New Jersey", code: "NJ" }, { name: "New Mexico", code: "NM" }, { name: "New York", code: "NY" },
    { name: "North Carolina", code: "NC" }, { name: "North Dakota", code: "ND" }, { name: "Ohio", code: "OH" },
    { name: "Oklahoma", code: "OK" }, { name: "Oregon", code: "OR" }, { name: "Pennsylvania", code: "PA" },
    { name: "Rhode Island", code: "RI" }, { name: "South Carolina", code: "SC" }, { name: "South Dakota", code: "SD" },
    { name: "Tennessee", code: "TN" }, { name: "Texas", code: "TX" }, { name: "Utah", code: "UT" },
    { name: "Vermont", code: "VT" }, { name: "Virginia", code: "VA" }, { name: "Washington", code: "WA" },
    { name: "West Virginia", code: "WV" }, { name: "Wisconsin", code: "WI" }, { name: "Wyoming", code: "WY" },
  ]},
  { code: "CA", name: "Canada", states: [
    { name: "Alberta", code: "AB" }, { name: "British Columbia", code: "BC" }, { name: "Manitoba", code: "MB" },
    { name: "New Brunswick", code: "NB" }, { name: "Newfoundland and Labrador", code: "NL" },
    { name: "Northwest Territories", code: "NT" }, { name: "Nova Scotia", code: "NS" }, { name: "Nunavut", code: "NU" },
    { name: "Ontario", code: "ON" }, { name: "Prince Edward Island", code: "PE" }, { name: "Quebec", code: "QC" },
    { name: "Saskatchewan", code: "SK" }, { name: "Yukon", code: "YT" },
  ]},
  { code: "AF", name: "Afghanistan", states: [] },
  { code: "AL", name: "Albania", states: [] },
  { code: "DZ", name: "Algeria", states: [] },
  { code: "AD", name: "Andorra", states: [] },
  { code: "AO", name: "Angola", states: [] },
  { code: "AG", name: "Antigua and Barbuda", states: [] },
  { code: "AR", name: "Argentina", states: [] },
  { code: "AM", name: "Armenia", states: [] },
  { code: "AU", name: "Australia", states: [
    { name: "Australian Capital Territory", code: "ACT" }, { name: "New South Wales", code: "NSW" },
    { name: "Northern Territory", code: "NT" }, { name: "Queensland", code: "QLD" },
    { name: "South Australia", code: "SA" }, { name: "Tasmania", code: "TAS" },
    { name: "Victoria", code: "VIC" }, { name: "Western Australia", code: "WA" },
  ]},
  { code: "AT", name: "Austria", states: [] },
  { code: "AZ", name: "Azerbaijan", states: [] },
  { code: "BS", name: "Bahamas", states: [] },
  { code: "BH", name: "Bahrain", states: [] },
  { code: "BD", name: "Bangladesh", states: [] },
  { code: "BB", name: "Barbados", states: [] },
  { code: "BY", name: "Belarus", states: [] },
  { code: "BE", name: "Belgium", states: [] },
  { code: "BZ", name: "Belize", states: [] },
  { code: "BJ", name: "Benin", states: [] },
  { code: "BT", name: "Bhutan", states: [] },
  { code: "BO", name: "Bolivia", states: [] },
  { code: "BA", name: "Bosnia and Herzegovina", states: [] },
  { code: "BW", name: "Botswana", states: [] },
  { code: "BR", name: "Brazil", states: [] },
  { code: "BN", name: "Brunei", states: [] },
  { code: "BG", name: "Bulgaria", states: [] },
  { code: "BF", name: "Burkina Faso", states: [] },
  { code: "BI", name: "Burundi", states: [] },
  { code: "KH", name: "Cambodia", states: [] },
  { code: "CM", name: "Cameroon", states: [] },
  { code: "CV", name: "Cape Verde", states: [] },
  { code: "CF", name: "Central African Republic", states: [] },
  { code: "TD", name: "Chad", states: [] },
  { code: "CL", name: "Chile", states: [] },
  { code: "CN", name: "China", states: [] },
  { code: "CO", name: "Colombia", states: [] },
  { code: "KM", name: "Comoros", states: [] },
  { code: "CG", name: "Congo", states: [] },
  { code: "CR", name: "Costa Rica", states: [] },
  { code: "HR", name: "Croatia", states: [] },
  { code: "CU", name: "Cuba", states: [] },
  { code: "CY", name: "Cyprus", states: [] },
  { code: "CZ", name: "Czech Republic", states: [] },
  { code: "DK", name: "Denmark", states: [] },
  { code: "DJ", name: "Djibouti", states: [] },
  { code: "DM", name: "Dominica", states: [] },
  { code: "DO", name: "Dominican Republic", states: [] },
  { code: "EC", name: "Ecuador", states: [] },
  { code: "EG", name: "Egypt", states: [] },
  { code: "SV", name: "El Salvador", states: [] },
  { code: "GQ", name: "Equatorial Guinea", states: [] },
  { code: "ER", name: "Eritrea", states: [] },
  { code: "EE", name: "Estonia", states: [] },
  { code: "ET", name: "Ethiopia", states: [] },
  { code: "FJ", name: "Fiji", states: [] },
  { code: "FI", name: "Finland", states: [] },
  { code: "FR", name: "France", states: [] },
  { code: "GA", name: "Gabon", states: [] },
  { code: "GM", name: "Gambia", states: [] },
  { code: "GE", name: "Georgia", states: [] },
  { code: "DE", name: "Germany", states: [] },
  { code: "GH", name: "Ghana", states: [] },
  { code: "GR", name: "Greece", states: [] },
  { code: "GD", name: "Grenada", states: [] },
  { code: "GT", name: "Guatemala", states: [] },
  { code: "GN", name: "Guinea", states: [] },
  { code: "GW", name: "Guinea-Bissau", states: [] },
  { code: "GY", name: "Guyana", states: [] },
  { code: "HT", name: "Haiti", states: [] },
  { code: "HN", name: "Honduras", states: [] },
  { code: "HK", name: "Hong Kong", states: [] },
  { code: "HU", name: "Hungary", states: [] },
  { code: "IS", name: "Iceland", states: [] },
  { code: "IN", name: "India", states: [] },
  { code: "ID", name: "Indonesia", states: [] },
  { code: "IR", name: "Iran", states: [] },
  { code: "IQ", name: "Iraq", states: [] },
  { code: "IE", name: "Ireland", states: [] },
  { code: "IL", name: "Israel", states: [] },
  { code: "IT", name: "Italy", states: [] },
  { code: "JM", name: "Jamaica", states: [] },
  { code: "JP", name: "Japan", states: [] },
  { code: "JO", name: "Jordan", states: [] },
  { code: "KZ", name: "Kazakhstan", states: [] },
  { code: "KE", name: "Kenya", states: [] },
  { code: "KI", name: "Kiribati", states: [] },
  { code: "KP", name: "North Korea", states: [] },
  { code: "KR", name: "South Korea", states: [] },
  { code: "KW", name: "Kuwait", states: [] },
  { code: "KG", name: "Kyrgyzstan", states: [] },
  { code: "LA", name: "Laos", states: [] },
  { code: "LV", name: "Latvia", states: [] },
  { code: "LB", name: "Lebanon", states: [] },
  { code: "LS", name: "Lesotho", states: [] },
  { code: "LR", name: "Liberia", states: [] },
  { code: "LY", name: "Libya", states: [] },
  { code: "LI", name: "Liechtenstein", states: [] },
  { code: "LT", name: "Lithuania", states: [] },
  { code: "LU", name: "Luxembourg", states: [] },
  { code: "MO", name: "Macau", states: [] },
  { code: "MK", name: "North Macedonia", states: [] },
  { code: "MG", name: "Madagascar", states: [] },
  { code: "MW", name: "Malawi", states: [] },
  { code: "MY", name: "Malaysia", states: [] },
  { code: "MV", name: "Maldives", states: [] },
  { code: "ML", name: "Mali", states: [] },
  { code: "MT", name: "Malta", states: [] },
  { code: "MH", name: "Marshall Islands", states: [] },
  { code: "MR", name: "Mauritania", states: [] },
  { code: "MU", name: "Mauritius", states: [] },
  { code: "MX", name: "Mexico", states: [] },
  { code: "FM", name: "Micronesia", states: [] },
  { code: "MD", name: "Moldova", states: [] },
  { code: "MC", name: "Monaco", states: [] },
  { code: "MN", name: "Mongolia", states: [] },
  { code: "ME", name: "Montenegro", states: [] },
  { code: "MA", name: "Morocco", states: [] },
  { code: "MZ", name: "Mozambique", states: [] },
  { code: "MM", name: "Myanmar", states: [] },
  { code: "NA", name: "Namibia", states: [] },
  { code: "NR", name: "Nauru", states: [] },
  { code: "NP", name: "Nepal", states: [] },
  { code: "NL", name: "Netherlands", states: [] },
  { code: "NZ", name: "New Zealand", states: [] },
  { code: "NI", name: "Nicaragua", states: [] },
  { code: "NE", name: "Niger", states: [] },
  { code: "NG", name: "Nigeria", states: [] },
  { code: "NO", name: "Norway", states: [] },
  { code: "OM", name: "Oman", states: [] },
  { code: "PK", name: "Pakistan", states: [] },
  { code: "PW", name: "Palau", states: [] },
  { code: "PS", name: "Palestine", states: [] },
  { code: "PA", name: "Panama", states: [] },
  { code: "PG", name: "Papua New Guinea", states: [] },
  { code: "PY", name: "Paraguay", states: [] },
  { code: "PE", name: "Peru", states: [] },
  { code: "PH", name: "Philippines", states: [] },
  { code: "PL", name: "Poland", states: [] },
  { code: "PT", name: "Portugal", states: [] },
  { code: "QA", name: "Qatar", states: [] },
  { code: "RO", name: "Romania", states: [] },
  { code: "RU", name: "Russia", states: [] },
  { code: "RW", name: "Rwanda", states: [] },
  { code: "KN", name: "Saint Kitts and Nevis", states: [] },
  { code: "LC", name: "Saint Lucia", states: [] },
  { code: "VC", name: "Saint Vincent and the Grenadines", states: [] },
  { code: "WS", name: "Samoa", states: [] },
  { code: "SM", name: "San Marino", states: [] },
  { code: "ST", name: "Sao Tome and Principe", states: [] },
  { code: "SA", name: "Saudi Arabia", states: [] },
  { code: "SN", name: "Senegal", states: [] },
  { code: "RS", name: "Serbia", states: [] },
  { code: "SC", name: "Seychelles", states: [] },
  { code: "SL", name: "Sierra Leone", states: [] },
  { code: "SG", name: "Singapore", states: [] },
  { code: "SK", name: "Slovakia", states: [] },
  { code: "SI", name: "Slovenia", states: [] },
  { code: "SB", name: "Solomon Islands", states: [] },
  { code: "SO", name: "Somalia", states: [] },
  { code: "ZA", name: "South Africa", states: [] },
  { code: "SS", name: "South Sudan", states: [] },
  { code: "ES", name: "Spain", states: [] },
  { code: "LK", name: "Sri Lanka", states: [] },
  { code: "SD", name: "Sudan", states: [] },
  { code: "SR", name: "Suriname", states: [] },
  { code: "SZ", name: "Eswatini", states: [] },
  { code: "SE", name: "Sweden", states: [] },
  { code: "CH", name: "Switzerland", states: [] },
  { code: "SY", name: "Syria", states: [] },
  { code: "TW", name: "Taiwan", states: [] },
  { code: "TJ", name: "Tajikistan", states: [] },
  { code: "TZ", name: "Tanzania", states: [] },
  { code: "TH", name: "Thailand", states: [] },
  { code: "TL", name: "Timor-Leste", states: [] },
  { code: "TG", name: "Togo", states: [] },
  { code: "TO", name: "Tonga", states: [] },
  { code: "TT", name: "Trinidad and Tobago", states: [] },
  { code: "TN", name: "Tunisia", states: [] },
  { code: "TR", name: "Turkey", states: [] },
  { code: "TM", name: "Turkmenistan", states: [] },
  { code: "TV", name: "Tuvalu", states: [] },
  { code: "UG", name: "Uganda", states: [] },
  { code: "UA", name: "Ukraine", states: [] },
  { code: "AE", name: "United Arab Emirates", states: [] },
  { code: "GB", name: "United Kingdom", states: [] },
  { code: "UY", name: "Uruguay", states: [] },
  { code: "UZ", name: "Uzbekistan", states: [] },
  { code: "VU", name: "Vanuatu", states: [] },
  { code: "VA", name: "Vatican City", states: [] },
  { code: "VE", name: "Venezuela", states: [] },
  { code: "VN", name: "Vietnam", states: [] },
  { code: "YE", name: "Yemen", states: [] },
  { code: "ZM", name: "Zambia", states: [] },
  { code: "ZW", name: "Zimbabwe", states: [] },
]

// Validation regex patterns
const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s'-]{2,50}$/, // Letters, spaces, apostrophes, hyphens; 2-50 chars
  streetAddress: /^[a-zA-Z0-9\s.,#'-]{5,100}$/, // Alphanumeric with common address characters
  unit: /^[a-zA-Z0-9\s#-]{0,20}$/, // Optional, alphanumeric with # and -
  city: /^[a-zA-Z\s'-]{2,50}$/, // Letters, spaces, apostrophes, hyphens
  postalCodeUS: /^\d{5}(-\d{4})?$/, // US ZIP: 12345 or 12345-6789
  postalCodeCA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, // Canadian: A1A 1A1
  postalCodeGeneric: /^[a-zA-Z0-9\s-]{3,10}$/, // Generic postal code
  phone: /^[\d\s()-]{10,20}$/, // Digits with formatting; at least 10 digits
  dateOfBirth: /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19|20)\d{2}$/, // MM/DD/YYYY
  entityName: /^[a-zA-Z0-9\s.,&'-]{2,100}$/, // Business/entity names
}

export function StepTwoDetails({ 
  initialAmount, 
  investorEmail, 
  investorFirstName,
  investorLastName,
  investorPhone,
  utmParams,
  // === EARLY_CAPTURE: START ===
  existingInvestorId,
  existingProfileId,
  // === EARLY_CAPTURE: END ===
  onBack, 
  onContinue, 
  config = FALLBACK_CONFIG 
}: StepTwoDetailsProps) {
  // Form state - pre-fill from Step 1
  const [investorType, setInvestorType] = useState("individual")
  const [firstName, setFirstName] = useState(investorFirstName)
  const [lastName, setLastName] = useState(investorLastName)
  const [streetAddress, setStreetAddress] = useState("")
  const [unit, setUnit] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("US")
  const [state, setState] = useState("")
  const [phone, setPhone] = useState(() => {
    // Format the incoming phone number if provided
    if (investorPhone) {
      const digits = investorPhone.replace(/\D/g, "").slice(0, 10)
      if (digits.length >= 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return investorPhone
    }
    return ""
  })
  const [dateOfBirth, setDateOfBirth] = useState("")
  
  // Type-specific fields
  const [jointFirstName, setJointFirstName] = useState("")
  const [jointLastName, setJointLastName] = useState("")
  const [entityName, setEntityName] = useState("") // For corporation, trust, llc, partnership

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  
  // DealMaker only supports US and Canada (regulatory compliance)
  const countries = SUPPORTED_COUNTRIES

  // Get states/provinces based on country
  const getRegions = (): DealMakerState[] => {
    const selectedCountry = countries.find((c) => c.code === country)
    return selectedCountry?.states || []
  }

  // Get country dial code
  const getDialCode = () => {
    const selectedCountry = countries.find((c) => c.code === country)
    const dialCode = DIAL_CODES[country] || "+1"
    return selectedCountry ? `${selectedCountry.name} ${dialCode}` : country
  }

  // Validate a single field
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return `${field === "firstName" ? "First" : "Last"} name is required`
        if (!VALIDATION_PATTERNS.name.test(value)) return "Please enter a valid name (letters only, 2-50 characters)"
        return ""
      
      case "jointFirstName":
      case "jointLastName":
        if (!value.trim()) return `Joint holder ${field === "jointFirstName" ? "first" : "last"} name is required`
        if (!VALIDATION_PATTERNS.name.test(value)) return "Please enter a valid name (letters only, 2-50 characters)"
        return ""

      case "entityName":
        if (!value.trim()) return `${investorType === "corporation" ? "Corporation" : investorType === "trust" ? "Trust" : investorType === "llc" ? "LLC" : "Partnership"} name is required`
        if (!VALIDATION_PATTERNS.entityName.test(value)) return "Please enter a valid entity name"
        return ""

      case "streetAddress":
        if (!value.trim()) return "Street address is required"
        if (!VALIDATION_PATTERNS.streetAddress.test(value)) return "Please enter a valid street address"
        return ""

      case "city":
        if (!value.trim()) return "City is required"
        if (!VALIDATION_PATTERNS.city.test(value)) return "Please enter a valid city name"
        return ""

      case "postalCode":
        if (!value.trim()) return "Postal code is required"
        if (country === "US" && !VALIDATION_PATTERNS.postalCodeUS.test(value)) return "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)"
        if (country === "CA" && !VALIDATION_PATTERNS.postalCodeCA.test(value)) return "Please enter a valid postal code (e.g., A1A 1A1)"
        if (country !== "US" && country !== "CA" && !VALIDATION_PATTERNS.postalCodeGeneric.test(value)) return "Please enter a valid postal code"
        return ""

      case "state":
        if ((country === "US" || country === "CA") && !value) return "State/Province is required"
        return ""

      case "phone":
        if (!value.trim()) return "Phone number is required"
        const digitsOnly = value.replace(/\D/g, "")
        // Validation based on country
        if (country === "US" || country === "CA") {
          if (digitsOnly.length !== 10) return "Please enter a valid 10-digit phone number"
        } else if (country === "GB") {
          if (digitsOnly.length < 10 || digitsOnly.length > 11) return "Please enter a valid UK phone number"
        } else if (country === "AU") {
          if (digitsOnly.length !== 10) return "Please enter a valid 10-digit phone number"
        } else {
          if (digitsOnly.length < 7 || digitsOnly.length > 15) return "Please enter a valid phone number (7-15 digits)"
        }
        return ""

      case "dateOfBirth":
        if (!value) return "Date of birth is required"
        if (!VALIDATION_PATTERNS.dateOfBirth.test(value)) return "Please enter a valid date (MM/DD/YYYY)"
        // Additional age validation (must be 18+)
        const [month, day, year] = value.split("/").map(Number)
        const birthDate = new Date(year, month - 1, day)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        if (age < 18 || (age === 18 && today < new Date(today.getFullYear(), month - 1, day))) {
          return "You must be at least 18 years old to invest"
        }
        return ""

      default:
        return ""
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Core fields
    newErrors.firstName = validateField("firstName", firstName)
    newErrors.lastName = validateField("lastName", lastName)
    newErrors.streetAddress = validateField("streetAddress", streetAddress)
    newErrors.city = validateField("city", city)
    newErrors.postalCode = validateField("postalCode", postalCode)
    newErrors.state = validateField("state", state)
    newErrors.phone = validateField("phone", phone)
    newErrors.dateOfBirth = validateField("dateOfBirth", dateOfBirth)
    
    // Type-specific validation
    if (investorType === "joint") {
      newErrors.jointFirstName = validateField("jointFirstName", jointFirstName)
      newErrors.jointLastName = validateField("jointLastName", jointLastName)
    }
    if (["corporation", "trust", "llc", "partnership"].includes(investorType)) {
      newErrors.entityName = validateField("entityName", entityName)
    }

    // Filter out empty errors
    const filteredErrors: Record<string, string> = {}
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key]) filteredErrors[key] = newErrors[key]
    })

    setErrors(filteredErrors)
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    Object.keys(newErrors).forEach(key => { allTouched[key] = true })
    setTouched(prev => ({ ...prev, ...allTouched }))
    
    return Object.keys(filteredErrors).length === 0
  }

  const handleContinue = async () => {
    if (!validateForm()) return
    
    setSubmitError("")
    setIsSubmitting(true)

    try {
      // === EARLY_CAPTURE: START ===
      // If we have existing IDs from early capture, pass them to update the existing investor
      // Otherwise, create a new investor profile
      const endpoint = existingInvestorId ? "/api/investor/update" : "/api/investor/create"
      // === EARLY_CAPTURE: END ===
      
      // Create or update the investor profile in DealMaker
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: investorEmail,
          firstName,
          lastName,
          phone,
          investmentAmount: initialAmount,
          investorType,
          streetAddress,
          unit,
          city,
          postalCode,
          country,
          state,
          dateOfBirth,
          ...(investorType === "joint" && { jointFirstName, jointLastName }),
          ...(["corporation", "trust", "llc", "partnership"].includes(investorType) && { entityName }),
          ...utmParams,
          // === EARLY_CAPTURE: START ===
          existingInvestorId,
          existingProfileId,
          // === EARLY_CAPTURE: END ===
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle error - could be string or object with field errors
        let errorMessage = "Something went wrong. Please try again."
        if (typeof data.error === "string") {
          errorMessage = data.error
        } else if (typeof data.error === "object" && data.error !== null) {
          // Extract first error message from object like {taxpayer_id: ["invalid format"]}
          const firstKey = Object.keys(data.error)[0]
          const firstError = data.error[firstKey]
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = `${firstKey.replace(/_/g, " ")}: ${firstError[0]}`
          } else if (typeof firstError === "string") {
            errorMessage = `${firstKey.replace(/_/g, " ")}: ${firstError}`
          }
        }
        setSubmitError(errorMessage)
        setIsSubmitting(false)
        return
      }

      // Fire dataLayer event
      if (typeof window !== "undefined") {
        (window as Record<string, unknown[]>).dataLayer = (window as Record<string, unknown[]>).dataLayer || []
        ;(window as Record<string, unknown[]>).dataLayer.push({
          event: "investor_profile_created",
          investmentAmount: initialAmount,
          investorType,
          currency: "USD",
        })
      }

      const countryData = countries.find(c => c.code === country)
      const reviewData: ReviewData = {
        firstName,
        lastName,
        email: investorEmail,
        phone,
        investorType,
        streetAddress,
        unit,
        city,
        postalCode,
        country: countryData?.name || country,
        countryCode: country,
        state,
        dateOfBirth,
        investmentAmount: initialAmount,
        investorId: data.investorId,
        ...(investorType === "joint" && { jointFirstName, jointLastName }),
        ...(["corporation", "trust", "llc", "partnership"].includes(investorType) && { entityName }),
      }
      onContinue(reviewData)
    } catch {
      setSubmitError("Unable to connect. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    // Validate on blur
    const value = getFieldValue(field)
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const getFieldValue = (field: string): string => {
    const fieldMap: Record<string, string> = {
      firstName, lastName, streetAddress, unit, city, postalCode, state, phone, dateOfBirth,
      jointFirstName, jointLastName, entityName
    }
    return fieldMap[field] || ""
  }

  // Format DOB input (MM/DD/YYYY)
  const formatDOB = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  // Format phone input based on country
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "")
    
    if (country === "US" || country === "CA") {
      // North American format: (XXX) XXX-XXXX
      const limited = digits.slice(0, 10)
      if (limited.length <= 3) return limited
      if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    } else if (country === "GB") {
      // UK format: XXXXX XXXXXX (11 digits)
      const limited = digits.slice(0, 11)
      if (limited.length <= 5) return limited
      return `${limited.slice(0, 5)} ${limited.slice(5)}`
    } else if (country === "AU") {
      // Australia format: XXXX XXX XXX (10 digits)
      const limited = digits.slice(0, 10)
      if (limited.length <= 4) return limited
      if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`
    } else {
      // Generic international format: group in 3s, max 15 digits
      const limited = digits.slice(0, 15)
      const groups = []
      for (let i = 0; i < limited.length; i += 3) {
        groups.push(limited.slice(i, i + 3))
      }
      return groups.join(" ")
    }
  }

  const inputClass = (field: string) => 
    `w-full pl-10 pr-4 py-3.5 border rounded-lg text-white text-base bg-[#242424] placeholder:text-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 transition-all ${
      touched[field] && errors[field] ? "border-[#ff4444]" : "border-[#333333]"
    }`

  const inputClassNoIcon = (field: string) => 
    `w-full px-4 py-3.5 border rounded-lg text-white text-base bg-[#242424] placeholder:text-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 transition-all ${
      touched[field] && errors[field] ? "border-[#ff4444]" : "border-[#333333]"
    }`

  const selectClass = (field: string) =>
    `w-full px-4 py-3.5 border rounded-lg text-white text-base bg-[#242424] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 transition-all appearance-none cursor-pointer ${
      touched[field] && errors[field] ? "border-[#ff4444]" : "border-[#333333]"
    }`

  // Helper to get entity name placeholder
  const getEntityPlaceholder = () => {
    switch (investorType) {
      case "corporation": return "Corporation Name"
      case "trust": return "Trust Name"
      case "llc": return "LLC Name"
      case "partnership": return "Partnership Name"
      default: return "Entity Name"
    }
  }

  // Helper to get signer role label
  const getSignerLabel = () => {
    switch (investorType) {
      case "corporation": return "Signing Officer"
      case "trust": return "Trustee"
      case "llc": return "Managing Member"
      case "partnership": return "General Partner"
      default: return ""
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-start pb-4 md:pb-8 bg-transparent">
      <div className="w-full max-w-[600px]">
        {/* Main Card */}
        <div className="bg-[#181818] rounded-xl border-2 border-[#f8231b] overflow-hidden">
          <div className="p-4 md:p-6">
            {/* Timeline */}
            <StepTimeline currentStep={2} />

            {/* Investor Type */}
            <div className="mb-4 mt-4">
              <div className="flex items-center gap-1 mb-2">
                <label className="text-[0.9375rem] text-[#808080]">Who is making the investment?</label>
                <HelpCircle className="w-4 h-4 text-[#808080]" />
              </div>
              <div className="relative">
                <select
                  value={investorType}
                  onChange={(e) => {
                    setInvestorType(e.target.value)
                    // Reset type-specific fields
                    setJointFirstName("")
                    setJointLastName("")
                    setEntityName("")
                  }}
                  className={selectClass("investorType")}
                >
                  {INVESTOR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#808080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Entity Name (for corporation, trust, llc, partnership) */}
            {["corporation", "trust", "llc", "partnership"].includes(investorType) && (
              <div className="mb-4">
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    onBlur={() => handleBlur("entityName")}
                    placeholder={getEntityPlaceholder()}
                    className={inputClass("entityName")}
                  />
                </div>
                {touched.entityName && errors.entityName && (
                  <p className="text-xs text-[#ff4444] mt-1">{errors.entityName}</p>
                )}
              </div>
            )}

            {/* First Name */}
            <div className="mb-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ""))}
                  onBlur={() => handleBlur("firstName")}
                  placeholder={getSignerLabel() ? `${getSignerLabel()} First Name` : "First Name"}
                  className={inputClass("firstName")}
                />
              </div>
              {touched.firstName && errors.firstName && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ""))}
                  onBlur={() => handleBlur("lastName")}
                  placeholder={getSignerLabel() ? `${getSignerLabel()} Last Name` : "Last Name"}
                  className={inputClass("lastName")}
                />
              </div>
              {touched.lastName && errors.lastName && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* Joint Holder Fields */}
            {investorType === "joint" && (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                    <input
                      type="text"
                      value={jointFirstName}
                      onChange={(e) => setJointFirstName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ""))}
                      onBlur={() => handleBlur("jointFirstName")}
                      placeholder="Joint Holder First Name"
                      className={inputClass("jointFirstName")}
                    />
                  </div>
                  {touched.jointFirstName && errors.jointFirstName && (
                    <p className="text-xs text-[#ff4444] mt-1">{errors.jointFirstName}</p>
                  )}
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                    <input
                      type="text"
                      value={jointLastName}
                      onChange={(e) => setJointLastName(e.target.value.replace(/[^a-zA-Z\s'-]/g, ""))}
                      onBlur={() => handleBlur("jointLastName")}
                      placeholder="Joint Holder Last Name"
                      className={inputClass("jointLastName")}
                    />
                  </div>
                  {touched.jointLastName && errors.jointLastName && (
                    <p className="text-xs text-[#ff4444] mt-1">{errors.jointLastName}</p>
                  )}
                </div>
              </>
            )}

            {/* Street Address */}
            <div className="mb-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  onBlur={() => handleBlur("streetAddress")}
                  placeholder="Street Address"
                  className={inputClass("streetAddress")}
                />
              </div>
              {touched.streetAddress && errors.streetAddress && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.streetAddress}</p>
              )}
            </div>

            {/* Unit / Apartment / Suite */}
            <div className="mb-4">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value.replace(/[^a-zA-Z0-9\s#-]/g, "").slice(0, 20))}
                placeholder="Unit / Apartment / Suite"
                className={inputClassNoIcon("unit")}
              />
            </div>

            {/* City */}
            <div className="mb-4">
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value.replace(/[^a-zA-Z\s'-]/g, ""))}
                  onBlur={() => handleBlur("city")}
                  placeholder="City"
                  className={inputClass("city")}
                />
              </div>
              {touched.city && errors.city && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.city}</p>
              )}
            </div>

            {/* ZIP / Postal Code */}
            <div className="mb-4">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                onBlur={() => handleBlur("postalCode")}
                placeholder="ZIP / Postal Code"
                className={inputClassNoIcon("postalCode")}
              />
              {touched.postalCode && errors.postalCode && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.postalCode}</p>
              )}
            </div>

            {/* Country & State Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-[#808080] mb-1 block uppercase tracking-wide">Country</label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value)
                      setState("") // Reset state when country changes
                    }}
                    className={selectClass("country")}
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#808080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#808080] mb-1 block uppercase tracking-wide">State / Province</label>
                <div className="relative">
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onBlur={() => handleBlur("state")}
                    className={selectClass("state")}
                    disabled={getRegions().length === 0}
                  >
                    <option value="">Select state</option>
                    {getRegions().map(s => (
                      <option key={s.code} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#808080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {touched.state && errors.state && (
                  <p className="text-xs text-[#ff4444] mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            {/* Phone with country code */}
            <div className="mb-4">
              <div className="flex">
                <div className="flex items-center gap-1 px-3 py-3.5 border border-r-0 border-[#333333] rounded-l-lg bg-[#242424] text-sm text-[#808080] whitespace-nowrap">
                  <span className="hidden sm:inline">{getDialCode()}</span>
                  <span className="sm:hidden">{DIAL_CODES[country] || "+1"}</span>
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onBlur={() => handleBlur("phone")}
                    placeholder={
                      country === "US" || country === "CA" 
                        ? "(555) 123-4567" 
                        : country === "GB" 
                          ? "07123 456789"
                          : country === "AU"
                            ? "0412 345 678"
                            : "Phone number"
                    }
                    className={`w-full pl-10 pr-4 py-3.5 border rounded-r-lg text-white text-base bg-[#242424] placeholder:text-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 transition-all ${
                      touched.phone && errors.phone ? "border-[#ff4444]" : "border-[#333333]"
                    }`}
                  />
                </div>
              </div>
              {touched.phone && errors.phone && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="mb-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                <input
                  type="text"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(formatDOB(e.target.value))}
                  onBlur={() => handleBlur("dateOfBirth")}
                  placeholder="Date of Birth (MM/DD/YYYY)"
                  maxLength={10}
                  className={inputClass("dateOfBirth")}
                />
              </div>
              {touched.dateOfBirth && errors.dateOfBirth && (
                <p className="text-xs text-[#ff4444] mt-1">{errors.dateOfBirth}</p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <p className="text-[#ff4444] text-sm mb-3">{submitError}</p>
            )}

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl text-base font-semibold bg-[#f8231b] text-white hover:bg-[#d91e17] disabled:bg-[#4a4a4a] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating profile...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back link */}
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="w-full mt-3 py-2 text-[0.9375rem] text-[#808080] hover:text-white disabled:opacity-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
