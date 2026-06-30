// Central brand config for ZERO88 Property.
// Used as fallbacks on the public page and as the source for SEO metadata,
// so the site looks correct even before the agent fills in Settings.

export const BRAND = {
  company: 'ZERO88 Property',
  companyCn: '沙巴Fun地产',
  agent: 'Jackson Liew',
  jobTitle: 'Group Leader',
  ren: 'REN 37532',
  phone: '60178173678', // digits only — for wa.me / tel links
  phoneDisplay: '+60 17-817 3678',
  email: 'zero88kkproperty@gmail.com',
  facebook: 'https://www.facebook.com/Zero88Property',
  city: 'Kota Kinabalu',
  state: 'Sabah',
  country: 'Malaysia',
  region: 'Kota Kinabalu, Sabah',
  tagline: 'Experienced Professional Real Estate Negotiator',
  services: ['Buy', 'Sell', 'Rent'] as const,
  gold: '#E2A93B',
  goldDark: '#B8851F',
  description:
    'Buy, sell, and rent residential & commercial property in Kota Kinabalu, Sabah with ZERO88 Property. Jackson Liew (REN 37532) — your experienced, professional real estate negotiator.',
}

// Set NEXT_PUBLIC_SITE_URL in .env once you have a domain (e.g. https://zero88property.com).
// Until then SEO links resolve against this placeholder.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
