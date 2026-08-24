const MIME_EXTENSIONS: Record<string, string> = {
  'application/javascript': 'js',
  'text/javascript': 'js',
  'application/x-javascript': 'js',
  'module/javascript': 'js',
  'application/json': 'json',
  'text/json': 'json',
  'text/html': 'html',
  'text/css': 'css',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
};

export function extensionForMime(mime: string | null): string {
  if (!mime) return 'bin';
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  return MIME_EXTENSIONS[base] ?? 'bin';
}

export function contentPath(hash: string, ext: string): string {
  return `content/${hash}.${ext}`;
}

export function sourcemapPath(hash: string): string {
  return `sourcemaps/${hash}.map`;
}
