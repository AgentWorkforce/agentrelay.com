// Run from web: node scripts/generate-web-images.mjs
//
// Writes display-sized WebP copies of source images the marketing pages show.
// Production has no Cloudflare Images binding, so /_next/image returns the
// original file untouched: a 24px avatar was downloading an 800 KB PNG. Pages
// point at these copies instead and render them unoptimized. Originals stay in
// place for anything that still links to them.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Avatars render at 24–56px; 128px covers both at high pixel density.
const AVATARS = ['will.png', 'khaliq.jpeg', 'mary.png', 'ingrid.png'];
// Product screenshots keep their full resolution; WebP q90 is visually lossless on this UI.
const SCREENSHOTS = ['teams/teams-dashboard-concept.png', 'teams/teams-session-overview-concept.png'];

const webpPath = (file, suffix = '') => file.replace(/\.(png|jpe?g)$/, `${suffix}.webp`);

for (const avatar of AVATARS) {
  const source = path.join(publicDir, 'authors', avatar);
  const target = path.join(publicDir, 'authors', webpPath(avatar, '-128'));
  await sharp(source).resize(128, 128, { fit: 'cover' }).webp({ quality: 85 }).toFile(target);
  console.log(path.relative(publicDir, target));
}

for (const screenshot of SCREENSHOTS) {
  const source = path.join(publicDir, screenshot);
  const target = path.join(publicDir, webpPath(screenshot));
  await sharp(source).webp({ quality: 90 }).toFile(target);
  console.log(path.relative(publicDir, target));
}
