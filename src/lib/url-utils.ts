// URL canonicalization and classification utilities

export type ContentType = 'tweet' | 'article' | 'tool' | 'other';

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  's',
  't',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
];

export function canonicalizeUrl(url: string): string {
  const u = new URL(url);

  // Normalize X/Twitter domains
  if (u.host === 'twitter.com') {
    u.host = 'x.com';
  }

  // Strip tracking params
  TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));

  // Remove fragments
  u.hash = '';

  // Normalize www
  u.host = u.host.replace(/^www\./, '');

  // Sort remaining params for consistency
  u.searchParams.sort();

  return u.toString();
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function classifyUrl(url: string): ContentType {
  // X/Twitter status URLs
  if (/https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/.test(url)) {
    return 'tweet';
  }

  // Common tool/product patterns (can be expanded)
  const domain = extractDomain(url);
  const toolDomains = ['github.com', 'npmjs.com', 'pypi.org', 'producthunt.com'];
  if (toolDomains.some((d) => domain.includes(d))) {
    return 'tool';
  }

  // Default to article for most web pages
  return 'article';
}

export function isTwitterUrl(url: string): boolean {
  return /https:\/\/(x|twitter)\.com/.test(url);
}

export function isTweetUrl(url: string): boolean {
  return /https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/.test(url);
}
