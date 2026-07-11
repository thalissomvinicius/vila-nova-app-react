import { Image, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const DEFAULT_MAX_EDGE = 1180;
const DEFAULT_COMPRESS = 0.6;
const SECOND_PASS_MAX_EDGE = 960;
const SECOND_PASS_COMPRESS = 0.52;
const TARGET_MAX_BYTES = 380 * 1024;
const THUMB_MAX_EDGE = 360;
const THUMB_COMPRESS = 0.48;
const THUMB_TARGET_MAX_BYTES = 85 * 1024;

function estimateDataUriSize(uri) {
  const match = String(uri || '').match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return null;
  const base64 = match[1];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export async function getLocalImageSizeBytes(uri) {
  if (!uri) return null;

  const dataUriSize = estimateDataUriSize(uri);
  if (dataUriSize !== null) return dataUriSize;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.size || null : null;
  } catch {
    return null;
  }
}

function getImageDimensions(uri, fallback = {}) {
  if (fallback.width && fallback.height) {
    return Promise.resolve({
      width: fallback.width,
      height: fallback.height,
    });
  }

  return new Promise((resolve) => {
    if (!uri || Platform.OS === 'web') {
      resolve({
        width: fallback.width || null,
        height: fallback.height || null,
      });
      return;
    }

    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({
        width: fallback.width || null,
        height: fallback.height || null,
      })
    );
  });
}

function resizeActionFor(dimensions, maxEdge) {
  const width = Number(dimensions?.width || 0);
  const height = Number(dimensions?.height || 0);
  const longEdge = Math.max(width, height);

  if (!longEdge || longEdge <= maxEdge) {
    return [];
  }

  return width >= height
    ? [{ resize: { width: maxEdge } }]
    : [{ resize: { height: maxEdge } }];
}

async function manipulate(uri, dimensions, maxEdge, compress) {
  const actions = resizeActionFor(dimensions, maxEdge);
  return ImageManipulator.manipulateAsync(uri, actions, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: false,
  });
}

export async function optimizeImageForUpload(input, options = {}) {
  const source = typeof input === 'string' ? { uri: input } : { ...(input || {}) };
  if (!source.uri) return source;

  const maxEdge = options.maxEdge || DEFAULT_MAX_EDGE;
  const compress = options.compress ?? DEFAULT_COMPRESS;
  const originalSize = await getLocalImageSizeBytes(source.uri);
  const dimensions = await getImageDimensions(source.uri, source);
  const needsResize = resizeActionFor(dimensions, maxEdge).length > 0;
  const needsCompression = options.force || needsResize || !originalSize || originalSize > TARGET_MAX_BYTES;

  if (!needsCompression) {
    return {
      ...source,
      base64: null,
      mimeType: 'image/jpeg',
      tamanho_bytes: originalSize,
      optimized: false,
    };
  }

  try {
    let result = await manipulate(source.uri, dimensions, maxEdge, compress);
    let optimizedSize = await getLocalImageSizeBytes(result.uri);

    if (optimizedSize && optimizedSize > TARGET_MAX_BYTES) {
      result = await manipulate(result.uri, result, SECOND_PASS_MAX_EDGE, SECOND_PASS_COMPRESS);
      optimizedSize = await getLocalImageSizeBytes(result.uri);
    }

    return {
      ...source,
      uri: result.uri,
      base64: null,
      mimeType: 'image/jpeg',
      width: result.width || source.width || null,
      height: result.height || source.height || null,
      tamanho_bytes: optimizedSize || originalSize || null,
      original_tamanho_bytes: originalSize || null,
      optimized: true,
    };
  } catch (error) {
    console.warn('Image optimization failed, using original file:', error?.message || error);
    return {
      ...source,
      base64: null,
      mimeType: source.mimeType || 'image/jpeg',
      tamanho_bytes: originalSize || null,
      optimized: false,
    };
  }
}

export async function createImageThumbnailForUpload(input, options = {}) {
  const source = typeof input === 'string' ? { uri: input } : { ...(input || {}) };
  if (!source.uri) return null;

  const maxEdge = options.maxEdge || THUMB_MAX_EDGE;
  const compress = options.compress ?? THUMB_COMPRESS;
  const originalSize = await getLocalImageSizeBytes(source.uri);
  const dimensions = await getImageDimensions(source.uri, source);

  try {
    let result = await manipulate(source.uri, dimensions, maxEdge, compress);
    let thumbnailSize = await getLocalImageSizeBytes(result.uri);

    if (thumbnailSize && thumbnailSize > THUMB_TARGET_MAX_BYTES) {
      result = await manipulate(result.uri, result, Math.min(280, maxEdge), 0.4);
      thumbnailSize = await getLocalImageSizeBytes(result.uri);
    }

    return {
      uri: result.uri,
      base64: null,
      mimeType: 'image/jpeg',
      width: result.width || null,
      height: result.height || null,
      tamanho_bytes: thumbnailSize || null,
      original_tamanho_bytes: originalSize || null,
      optimized: true,
    };
  } catch (error) {
    console.warn('Image thumbnail generation failed:', error?.message || error);
    return null;
  }
}
