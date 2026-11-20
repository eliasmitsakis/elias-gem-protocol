import sharp from 'sharp';

/**
 * Compresses a raw image buffer (e.g. JPEG/PNG from Fal.ai) into WebP (quality 82)
 * before uploading to Supabase Storage (~1.5 MB -> ~120 KB), with safe JPEG fallback.
 */
export async function compressToWebp(inputBuffer: Buffer): Promise<{
  buffer: Buffer;
  mimeType: 'image/webp' | 'image/jpeg';
  ext: 'webp' | 'jpg';
}> {
  try {
    const webpBuffer = await sharp(inputBuffer)
      .webp({ quality: 82 })
      .toBuffer();
    return {
      buffer: webpBuffer,
      mimeType: 'image/webp',
      ext: 'webp',
    };
  } catch (err) {
    console.warn('WebP compression failed, falling back to original JPEG buffer:', err);
    return {
      buffer: inputBuffer,
      mimeType: 'image/jpeg',
      ext: 'jpg',
    };
  }
}
