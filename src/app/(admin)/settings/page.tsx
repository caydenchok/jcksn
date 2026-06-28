'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AgentProfile {
  id?: number
  name: string
  phone: string
  email: string
  company: string
  licenseNo: string
  tagline: string
  bio: string
  welcomeMsg: string
  languages: string
  specialities: string
  profilePic: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<AgentProfile>({
    name: '',
    phone: '',
    email: '',
    company: '',
    licenseNo: '',
    tagline: 'Your trusted property agent',
    bio: '',
    welcomeMsg: '',
    languages: 'English, Malay',
    specialities: 'Residential, Commercial',
    profilePic: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/agent')
      const data = await res.json()
      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
    setSaving(false)
  }

  function update(field: keyof AgentProfile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-12 pt-10 pb-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-white">Settings</h1>
            <p className="text-zinc-500 mt-2 text-base">Configure your agent profile for WhatsApp bot</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-white hover:bg-zinc-200 text-black font-semibold px-8 py-3 rounded-xl text-base transition-all duration-150 active:scale-[0.97]"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profile.profilePic ? (
                      <img src={profile.profilePic} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{profile.name?.[0]?.toUpperCase() || 'J'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Profile Picture</Label>
                    <p className="text-xs text-zinc-600 mt-1 mb-2">Shows on the public listing page</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/upload', { method: 'POST', body: formData })
                        if (res.ok) {
                          const { url } = await res.json()
                          update('profilePic', url)
                        }
                      }}
                      className="text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:font-medium file:cursor-pointer hover:file:bg-white/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Agent Name *</Label>
                    <Input
                      value={profile.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('name', e.target.value)}
                      placeholder="e.g. Ahmad Rahman"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Phone Number *</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('phone', e.target.value)}
                      placeholder="e.g. +60123456789"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                    <Input
                      value={profile.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('email', e.target.value)}
                      placeholder="e.g. ahmad@agency.com"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Company / Agency</Label>
                    <Input
                      value={profile.company}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('company', e.target.value)}
                      placeholder="e.g. ABC Realty Sdn Bhd"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">License No.</Label>
                    <Input
                      value={profile.licenseNo}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('licenseNo', e.target.value)}
                      placeholder="e.g. E(1)1234"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Tagline</Label>
                    <Input
                      value={profile.tagline}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('tagline', e.target.value)}
                      placeholder="e.g. Your trusted property agent"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">WhatsApp Bot Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Custom Welcome Message</Label>
                  <textarea
                    value={profile.welcomeMsg}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('welcomeMsg', e.target.value)}
                    placeholder="e.g. Hi! I'm Ahmad from ABC Realty. Looking for a property? I can help you find the perfect home!"
                    className="w-full h-24 px-4 py-3 mt-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-2">Leave empty for default greeting. This shows when customers say "Hi" or "Hello".</p>
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">About You (shown to customers)</Label>
                  <textarea
                    value={profile.bio}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('bio', e.target.value)}
                    placeholder="e.g. I have 10+ years of experience in KL property market. Specializing in condos and landed houses."
                    className="w-full h-24 px-4 py-3 mt-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Languages</Label>
                    <Input
                      value={profile.languages}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('languages', e.target.value)}
                      placeholder="e.g. English, Malay, Chinese"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Specialities</Label>
                    <Input
                      value={profile.specialities}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => update('specialities', e.target.value)}
                      placeholder="e.g. Condo, Landed, Commercial"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl bg-[#0b1e15] p-5 border border-emerald-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-400">
                        {profile.name ? profile.name[0].toUpperCase() : 'A'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{profile.name || 'Agent Name'}</p>
                      <p className="text-xs text-zinc-500">{profile.company || 'Company'}</p>
                    </div>
                  </div>
                  <div className="bg-[#0d2818] rounded-xl p-4 border border-emerald-500/10">
                    <p className="text-sm text-emerald-100 leading-relaxed">
                      {profile.welcomeMsg || `Hi! I'm ${profile.name || 'your property agent'}. How can I help you today?`}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-3 text-center">WhatsApp Bot Preview</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-500">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">1</span>
                  <p>Customer messages your WhatsApp number</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">2</span>
                  <p>AI introduces itself using your name & greeting</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">3</span>
                  <p>Bot searches your listings based on what they ask</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">4</span>
                  <p>Responds in the same language they use</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">5</span>
                  <p>Can collect booking/viewing requests automatically</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
