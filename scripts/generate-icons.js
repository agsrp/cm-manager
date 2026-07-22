import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

// 1. Standard App & PWA SVG Icon (512x512)
const pwaSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Dark slate gradient background -->
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="75%" fx="50%" fy="25%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="55%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    
    <!-- Vibrant Violet-Indigo-Pink Gradient for Symbol -->
    <linearGradient id="primaryGrad" x1="100" y1="160" x2="420" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A855F7" />
      <stop offset="45%" stop-color="#8B5CF6" />
      <stop offset="80%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>

    <!-- Sparkle Glow Gradient -->
    <linearGradient id="sparkleGrad" x1="340" y1="120" x2="420" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F472B6" />
      <stop offset="50%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>

    <!-- Subtle Glow Shadow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Container -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />
  <rect width="510" height="510" x="1" y="1" rx="111" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" fill="none" />

  <!-- Outer Ambient Glow Ring -->
  <circle cx="256" cy="256" r="170" fill="#8B5CF6" fill-opacity="0.08" filter="url(#glow)" />

  <g filter="url(#glow)">
    <!-- C Letter Path - Perfectly Balanced Arc -->
    <path 
      d="M 215 195 C 170 150, 110 185, 110 256 C 110 327, 170 362, 215 317" 
      stroke="url(#primaryGrad)" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <!-- M Letter Path - Clean Geometric Strokes -->
    <path 
      d="M 250 325 V 195 L 295 262 L 340 195 V 325" 
      stroke="url(#primaryGrad)" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Sparkle Symbol (✦) at Top Right of M -->
    <path 
      d="M 380 125 C 380 148 398 166 420 166 C 398 166 380 184 380 207 C 380 184 362 166 340 166 C 362 166 380 148 380 125 Z" 
      fill="url(#sparkleGrad)"
    />
  </g>
</svg>
`;

// 2. iOS Apple Touch Icon SVG (Full edge-to-edge square background)
const appleTouchSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="75%" fx="50%" fy="25%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="55%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    
    <linearGradient id="primaryGrad" x1="100" y1="160" x2="420" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A855F7" />
      <stop offset="45%" stop-color="#8B5CF6" />
      <stop offset="80%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>

    <linearGradient id="sparkleGrad" x1="340" y1="120" x2="420" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F472B6" />
      <stop offset="50%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bgGlow)" />

  <g filter="url(#glow)">
    <path 
      d="M 215 195 C 170 150, 110 185, 110 256 C 110 327, 170 362, 215 317" 
      stroke="url(#primaryGrad)" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <path 
      d="M 250 325 V 195 L 295 262 L 340 195 V 325" 
      stroke="url(#primaryGrad)" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <path 
      d="M 380 125 C 380 148 398 166 420 166 C 398 166 380 184 380 207 C 380 184 362 166 340 166 C 362 166 380 148 380 125 Z" 
      fill="url(#sparkleGrad)"
    />
  </g>
</svg>
`;

// 3. Android Maskable Icon (Safe area margin for Android launcher clipping)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="75%" fx="50%" fy="25%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="55%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    
    <linearGradient id="primaryGrad" x1="100" y1="160" x2="420" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A855F7" />
      <stop offset="45%" stop-color="#8B5CF6" />
      <stop offset="80%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>

    <linearGradient id="sparkleGrad" x1="340" y1="120" x2="420" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F472B6" />
      <stop offset="50%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bgGlow)" />

  <g transform="translate(64, 64) scale(0.75)">
    <path 
      d="M 215 195 C 170 150, 110 185, 110 256 C 110 327, 170 362, 215 317" 
      stroke="url(#primaryGrad)" 
      stroke-width="38" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <path 
      d="M 250 325 V 195 L 295 262 L 340 195 V 325" 
      stroke="url(#primaryGrad)" 
      stroke-width="38" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      fill="none"
    />

    <path 
      d="M 380 125 C 380 148 398 166 420 166 C 398 166 380 184 380 207 C 380 184 362 166 340 166 C 362 166 380 148 380 125 Z" 
      fill="url(#sparkleGrad)"
    />
  </g>
</svg>
`;

// 4. Notification Badge Stencil (White on Transparent for Android status bar)
const notificationBadgeSvg = `
<svg width="96" height="96" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g fill="none">
    <path 
      d="M 215 195 C 170 150, 110 185, 110 256 C 110 327, 170 362, 215 317" 
      stroke="#FFFFFF" 
      stroke-width="40" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />

    <path 
      d="M 250 325 V 195 L 295 262 L 340 195 V 325" 
      stroke="#FFFFFF" 
      stroke-width="40" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />

    <path 
      d="M 380 125 C 380 148 398 166 420 166 C 398 166 380 184 380 207 C 380 184 362 166 340 166 C 362 166 380 148 380 125 Z" 
      fill="#FFFFFF"
    />
  </g>
</svg>
`;

async function generateAllIcons() {
  console.log('Generating PWA & Notification Icon Assets...');

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), pwaSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), pwaSvg);
  fs.writeFileSync(path.join(publicDir, 'notification-badge.svg'), notificationBadgeSvg);

  const pwaBuffer = Buffer.from(pwaSvg);
  const appleBuffer = Buffer.from(appleTouchSvg);
  const maskableBuffer = Buffer.from(maskableSvg);
  const badgeBuffer = Buffer.from(notificationBadgeSvg);

  // PWA Standard 512x512
  await sharp(pwaBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // PWA Standard 192x192
  await sharp(pwaBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // iOS Apple Touch Icon (180x180)
  await sharp(appleBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Android Maskable Icon (512x512)
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Notification Icon 192x192 (Full Color)
  await sharp(pwaBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'notification-icon-192x192.png'));

  // Notification Badge 96x96 (White Stencil)
  await sharp(badgeBuffer)
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'notification-badge-96x96.png'));

  // Favicons
  await sharp(pwaBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(pwaBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  console.log('All icons successfully updated!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
