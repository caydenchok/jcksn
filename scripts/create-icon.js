const sharp = require('sharp')
const path = require('path')

const svgIcon = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0f"/>
      <stop offset="100%" style="stop-color:#12121a"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="url(#bg)"/>
  <circle cx="128" cy="118" r="65" fill="#00d4aa"/>
  <text x="128" y="128" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="#0a0a0f" text-anchor="middle" dominant-baseline="middle">PA</text>
  <rect x="58" y="200" width="140" height="4" rx="2" fill="#00d4aa" opacity="0.5"/>
</svg>`

async function createIcon() {
  await sharp(Buffer.from(svgIcon))
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon.png'))

  // Also create .ico for Windows
  await sharp(Buffer.from(svgIcon))
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon.ico'))

  console.log('Icons created!')
}

createIcon().catch(console.error)
