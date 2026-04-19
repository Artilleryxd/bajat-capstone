"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  KeyRound,
  Wallet,
  Palette,
  Download,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Country, State } from "country-state-city"
import { fetchWithAuth } from "@/lib/auth"
import { getCurrencySymbolByCountry } from "@/lib/utils/countryToCurrency"
import {
  detectUserLocation,
  searchAddressLocation,
  type ReverseGeoResult,
} from "@/lib/utils/geolocation"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  full_name: string | null
  gender: string | null
  date_of_birth: string | null
  neighbourhood: string | null
  country: string | null
  city: string | null
  marital_status: string | null
  monthly_income: number | null
  income_type: string | null
  num_dependents: number | null
  housing_status: string | null
  currency: string | null
}

type LocationStatus = "idle" | "loading" | "success" | "error"

function calcAge(dob: string): number | null {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // ── Profile fetch state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // ── Personal info form ────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState("")
  const [dob, setDob] = useState("")
  const [neighbourhood, setNeighbourhood] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [maritalStatus, setMaritalStatus] = useState("")
  const [savingPersonal, setSavingPersonal] = useState(false)

  // ── Financial info form ───────────────────────────────────────────────────
  const [occupation, setOccupation] = useState("")
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [numDependents, setNumDependents] = useState("")
  const [housingStatus, setHousingStatus] = useState("")
  const [savingFinancial, setSavingFinancial] = useState(false)

  // ── Change password form ──────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // ── Address autocomplete ──────────────────────────────────────────────────
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle")
  const [searchResults, setSearchResults] = useState<ReverseGeoResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const countries = useMemo(() => Country.getAllCountries(), [])
  const states = useMemo(
    () => (country ? State.getStatesOfCountry(country) : []),
    [country]
  )

  const currencySymbol = useMemo(
    () => getCurrencySymbolByCountry(country) || "₹",
    [country]
  )

  const age = dob ? calcAge(dob) : null

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth("/api/profile/me")
        if (!res.ok) return
        const data: ProfileData = await res.json()
        setProfile(data)

        setFullName(data.full_name ?? "")
        setGender(data.gender ?? "")
        setDob(data.date_of_birth ?? "")
        setNeighbourhood(data.neighbourhood ?? "")
        setCountry(data.country ?? "")
        setCity(data.city ?? "")
        setMaritalStatus(data.marital_status ?? "")

        setOccupation(data.income_type ?? "")
        setMonthlyIncome(data.monthly_income?.toString() ?? "")
        setNumDependents(data.num_dependents?.toString() ?? "0")
        setHousingStatus(data.housing_status ?? "")
      } catch {
        toast.error("Could not load profile")
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [])

  // ── Address search debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (!neighbourhood || neighbourhood.length < 3 || !showResults) {
      setSearchResults([])
      return
    }
    const id = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchAddressLocation(neighbourhood)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [neighbourhood, showResults])

  const applyGeoResult = useCallback(
    (result: ReverseGeoResult) => {
      if (result.countryCode) {
        const match = countries.find((c) => c.isoCode === result.countryCode)
        if (match) setCountry(match.isoCode)
      }
      if (result.city) setCity(result.city)
      if (result.neighbourhood) setNeighbourhood(result.neighbourhood)
      else if (result.city) setNeighbourhood(result.city)
      else setNeighbourhood(result.displayName.split(",")[0])
    },
    [countries]
  )

  const handleDetectLocation = useCallback(async () => {
    setLocationStatus("loading")
    try {
      const result = await detectUserLocation()
      applyGeoResult(result)
      setLocationStatus("success")
    } catch (err) {
      setLocationStatus("error")
      toast.error(typeof err === "string" ? err : "Could not detect location")
    }
  }, [applyGeoResult])

  // ── Save handlers ─────────────────────────────────────────────────────────
  const savePersonal = async () => {
    setSavingPersonal(true)
    try {
      const res = await fetchWithAuth("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName || undefined,
          gender: gender || undefined,
          date_of_birth: dob || undefined,
          neighbourhood: neighbourhood || undefined,
          country: country || undefined,
          city: city || undefined,
          marital_status: maritalStatus || undefined,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e?.detail?.message ?? "Failed to save")
      }
      toast.success("Personal information updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingPersonal(false)
    }
  }

  const saveFinancial = async () => {
    setSavingFinancial(true)
    try {
      const income = parseFloat(monthlyIncome)
      const dependents = parseInt(numDependents, 10)
      const res = await fetchWithAuth("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income_type: occupation || undefined,
          monthly_income: isFinite(income) && income > 0 ? income : undefined,
          num_dependents: isFinite(dependents) && dependents >= 0 ? dependents : undefined,
          housing_status: housingStatus || undefined,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e?.detail?.message ?? "Failed to save")
      }
      toast.success("Financial information updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingFinancial(false)
    }
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetchWithAuth("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.detail?.message ?? "Failed to change password")
      toast.success("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setSavingPassword(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account and preferences
          </p>
        </div>

        {/* ── Personal Information ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Personal Information
            </CardTitle>
            <CardDescription>Update the details you provided during onboarding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Full name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Arjun Mehta"
                  />
                </div>

                {/* Gender + DOB */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">
                      Date of Birth
                      {age != null && (
                        <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
                          {age} yrs
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>

                {/* Neighbourhood with autocomplete + detect */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="neighbourhood">Neighbourhood / Locality</Label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={locationStatus === "loading"}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {locationStatus === "loading" ? (
                        <><Loader2 className="w-3 h-3 animate-spin" />Detecting…</>
                      ) : locationStatus === "success" ? (
                        <><CheckCircle2 className="w-3 h-3" />Detected</>
                      ) : (
                        <><MapPin className="w-3 h-3" />Auto-detect</>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="neighbourhood"
                      value={neighbourhood}
                      onChange={(e) => { setNeighbourhood(e.target.value); setShowResults(true) }}
                      onFocus={() => setShowResults(true)}
                      onBlur={() => setTimeout(() => setShowResults(false), 200)}
                      placeholder="e.g. Andheri West, Lokhandwala"
                      autoComplete="off"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {showResults && searchResults.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border bg-popover shadow-md text-sm py-1">
                        {searchResults.map((r, i) => (
                          <li
                            key={i}
                            onMouseDown={() => { setShowResults(false); applyGeoResult(r) }}
                            className="cursor-pointer px-3 py-2 hover:bg-accent"
                          >
                            <span className="font-medium block truncate">{r.displayName.split(",")[0]}</span>
                            <span className="text-xs text-muted-foreground block truncate">{r.displayName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Country + City */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countries.map((c) => (
                          <SelectItem key={c.isoCode} value={c.isoCode}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                    />
                  </div>
                </div>

                {/* Marital status */}
                <div className="space-y-1.5">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                    <SelectTrigger id="maritalStatus" className="w-48">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-1">
                  <Button onClick={savePersonal} disabled={savingPersonal} size="sm" className="gap-1.5">
                    {savingPersonal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingPersonal ? "Saving…" : "Save Personal Info"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Financial Information ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-4 h-4" />
              Financial Information
            </CardTitle>
            <CardDescription>Used for budget generation and investment strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Occupation */}
                <div className="space-y-1.5">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>

                {/* Monthly income */}
                <div className="space-y-1.5">
                  <Label htmlFor="income">Monthly Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                      {currencySymbol}
                    </span>
                    <Input
                      id="income"
                      type="number"
                      min="0"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder="50000"
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Dependents + Housing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dependents">Number of Dependants</Label>
                    <Input
                      id="dependents"
                      type="number"
                      min="0"
                      value={numDependents}
                      onChange={(e) => setNumDependents(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="housingStatus">Housing Status</Label>
                    <Select value={housingStatus} onValueChange={setHousingStatus}>
                      <SelectTrigger id="housingStatus">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rented">Rented</SelectItem>
                        <SelectItem value="Owned">Owned</SelectItem>
                        <SelectItem value="Family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button onClick={saveFinancial} disabled={savingFinancial} size="sm" className="gap-1.5">
                    {savingFinancial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingFinancial ? "Saving…" : "Save Financial Info"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Change Password ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-4 h-4" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPw"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New Password</Label>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPw"
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={changePassword} disabled={savingPassword} size="sm" className="gap-1.5">
                {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                {savingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Appearance ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-4 h-4" />
              Appearance
            </CardTitle>
            <CardDescription>Customise how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={theme ?? "system"} onValueChange={setTheme}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Data & Privacy ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="w-4 h-4" />
              Data &amp; Privacy
            </CardTitle>
            <CardDescription>Manage your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Export Data</Label>
                <p className="text-sm text-muted-foreground">Download all your financial data</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Delete Account</Label>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
