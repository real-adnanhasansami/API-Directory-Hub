// Shared classification helpers. Used by the data build script (Node) and the in-browser Bulk Parser.

export const CATEGORIES = [
  { name: 'AI', kw: ['ai', 'artificial intelligence', 'llm', 'gpt', 'openai', 'claude', 'gemini', 'machine learning', 'neural', 'nlp', 'chatbot', 'embedding', 'prompt', 'generative', 'text-to-speech', 'speech-to-text', 'ocr', 'summariz', 'sentiment', 'image generation', 'vision model'] },
  { name: 'Agents', kw: ['agent', 'agentic', 'autonomous', 'crewai', 'langchain', 'langgraph', 'copilot', 'assistant'] },
  { name: 'MCP Servers', kw: ['mcp', 'model context protocol'] },
  { name: 'Automation', kw: ['automation', 'automate', 'workflow', 'zapier', 'make.com', 'n8n', 'bot', 'cron', 'schedule', 'scraper', 'scrape', 'crawler', 'crawl', 'extractor', 'extract'] },
  { name: 'Lead Generation', kw: ['lead', 'leads', 'prospect', 'email finder', 'contact', 'outreach', 'b2b', 'crm', 'enrich', 'phone number', 'sales navigator', 'cold email'] },
  { name: 'Developer Tools', kw: ['developer', 'sdk', 'github', 'gitlab', 'npm', 'pypi', 'docker', 'devops', 'json', 'regex', 'code', 'debug', 'ci/cd', 'deploy', 'openapi', 'swagger', 'webhook', 'proxy', 'ip address', 'dns', 'whois', 'screenshot', 'pdf', 'url shortener', 'validator', 'converter', 'api testing'] },
  { name: 'E-commerce', kw: ['ecommerce', 'e-commerce', 'shopify', 'amazon', 'ebay', 'etsy', 'walmart', 'aliexpress', 'product', 'price', 'shop', 'store', 'seller', 'woocommerce', 'cart', 'inventory', 'review', 'marketplace', 'shipping'] },
  { name: 'Social Media', kw: ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'reddit', 'pinterest', 'snapchat', 'telegram', 'discord', 'threads', 'bluesky', 'social media', 'followers', 'hashtag', 'x.com', 'mastodon', 'whatsapp'] },
  { name: 'Videos', kw: ['youtube', 'video', 'vimeo', 'twitch', 'stream', 'subtitle', 'transcript', 'podcast', 'netflix', 'movie', 'film', 'clip', 'shorts'] },
  { name: 'SEO Tools', kw: ['seo', 'serp', 'keyword', 'backlink', 'google search', 'rank tracker', 'sitemap', 'domain authority', 'search engine', 'google trends', 'meta tags'] },
  { name: 'Marketing', kw: ['marketing', 'advertis', 'ads library', 'campaign', 'newsletter', 'email marketing', 'brand', 'influencer', 'affiliate', 'conversion', 'growth'] },
  { name: 'Real Estate', kw: ['real estate', 'property', 'properties', 'zillow', 'realtor', 'rightmove', 'zoopla', 'airbnb', 'rent', 'apartment', 'housing', 'mortgage', 'listing', 'homes'] },
  { name: 'Jobs', kw: ['job', 'jobs', 'career', 'recruit', 'resume', 'indeed', 'glassdoor', 'hiring', 'salary', 'vacanc', 'employment', 'freelance'] },
  { name: 'Travel', kw: ['travel', 'flight', 'hotel', 'booking.com', 'tripadvisor', 'airline', 'airport', 'tour', 'vacation', 'destination', 'visa', 'itinerary', 'weather'] },
  { name: 'News', kw: ['news', 'article', 'headline', 'journalis', 'press', 'rss', 'blog', 'magazine', 'media monitoring'] },
  { name: 'Business', kw: ['business', 'company', 'finance', 'financial', 'stock', 'crypto', 'invoice', 'payment', 'bank', 'accounting', 'tax', 'startup', 'enterprise', 'trading', 'market data', 'forex', 'compliance', 'legal'] },
  { name: 'Integrations', kw: ['integration', 'connector', 'sync', 'slack', 'notion', 'airtable', 'google sheets', 'hubspot', 'salesforce', 'zoho', 'trello', 'jira', 'api bridge'] },
  { name: 'Education', kw: ['education', 'learn', 'course', 'student', 'school', 'university', 'academic', 'quiz', 'tutor', 'research paper', 'scholar', 'dictionary'] },
  { name: 'Games', kw: ['game', 'gaming', 'steam', 'xbox', 'playstation', 'minecraft', 'roblox', 'esports', 'fortnite'] },
  { name: 'Sports', kw: ['sport', 'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'cricket', 'tennis', 'fifa', 'odds', 'betting', 'fantasy'] },
  { name: 'For Creators', kw: ['creator', 'content creator', 'streamer', 'patreon', 'onlyfans', 'substack', 'monetiz', 'artist', 'music', 'spotify', 'soundcloud'] },
  { name: 'Open Source', kw: ['open source', 'open-source', 'opensource', 'foss', 'self-hosted', 'self hosted'] }
];

export const KNOWN_ALIASES = {
  'ai': 'AI', 'artificial intelligence': 'AI', 'ml': 'AI', 'machine learning': 'AI',
  'agents': 'Agents', 'agent': 'Agents', 'mcp': 'MCP Servers', 'mcp servers': 'MCP Servers',
  'automation': 'Automation', 'lead generation': 'Lead Generation', 'leads': 'Lead Generation',
  'developer tools': 'Developer Tools', 'dev tools': 'Developer Tools', 'developer': 'Developer Tools', 'devtools': 'Developer Tools',
  'e-commerce': 'E-commerce', 'ecommerce': 'E-commerce', 'shopping': 'E-commerce',
  'social media': 'Social Media', 'social': 'Social Media', 'video': 'Videos', 'videos': 'Videos',
  'seo': 'SEO Tools', 'seo tools': 'SEO Tools', 'marketing': 'Marketing', 'real estate': 'Real Estate',
  'jobs': 'Jobs', 'job': 'Jobs', 'travel': 'Travel', 'news': 'News', 'business': 'Business', 'finance': 'Business',
  'integrations': 'Integrations', 'integration': 'Integrations', 'education': 'Education', 'games': 'Games', 'game': 'Games',
  'sports': 'Sports', 'sport': 'Sports', 'for creators': 'For Creators', 'creators': 'For Creators',
  'open source': 'Open Source', 'opensource': 'Open Source', 'other': 'Other', 'misc': 'Other', 'uncategorized': 'Other'
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One combined regex over every keyword (fast: a single pass per text field instead of hundreds of tests).
const KW_MAP = new Map();
for (const c of CATEGORIES) for (const k of c.kw) {
  const key = k.toLowerCase();
  if (!KW_MAP.has(key)) KW_MAP.set(key, []);
  KW_MAP.get(key).push({ cat: c.name, w: k.length > 5 ? 2 : 1 });
}
const KW_RE = new RegExp('(?<![a-z0-9])(' + [...KW_MAP.keys()].sort((a, b) => b.length - a.length).map(esc).join('|') + ')', 'gi');

function scoreInto(scores, text, mult) {
  if (!text) return;
  KW_RE.lastIndex = 0;
  let m, guard = 0;
  while ((m = KW_RE.exec(text)) && guard++ < 40) {
    for (const { cat, w } of KW_MAP.get(m[1].toLowerCase())) scores[cat] = (scores[cat] || 0) + mult * w;
  }
}

export function detectCategory(name, desc, url) {
  const scores = {};
  scoreInto(scores, name, 3);
  scoreInto(scores, desc, 1);
  scoreInto(scores, url, 1);
  let best = 'Other', bestScore = 0;
  for (const c of CATEGORIES) { const s = scores[c.name] || 0; if (s > bestScore) { bestScore = s; best = c.name; } }
  return bestScore >= 2 ? best : 'Other';
}

export function normalizeCategory(raw) {
  if (!raw) return '';
  const t = String(raw).trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const hit = KNOWN_ALIASES[t.toLowerCase()];
  if (hit) return hit;
  return t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

const FREE_RE = /\b(open[- ]?source|no api key|no auth(?:entication)?|no key required|completely free|100% free|free to use|free api|free forever|\bfree\b(?! trial| tier| plan| credits?| quota| requests?| calls?))/i;
const FREEMIUM_RE = /\b(free tier|free trial|free plan|freemium|free credits?|free quota|free requests?|free calls?|pay[- ]per|pay as you go|usage[- ]based|credits?|trial)\b/i;
const PAID_RE = /\b(paid|premium|subscription|enterprise|per month|\/month|pricing plans?|commercial licen[sc]e)\b/i;
const AUTH_RE = /\b(api[- ]?keys?|oauth2?|bearer|access[- ]token|auth token|authenticat\w*|login|log[- ]in|sign[- ]in|session cookie|cookies?|credentials?|client[- ]secret|requires? (an? )?(account|token|key))\b/i;

export function inferPricing(text, url) {
  if (FREEMIUM_RE.test(text)) return 'freemium';
  if (FREE_RE.test(text)) return 'free';
  if (PAID_RE.test(text)) return 'paid';
  if (/apify\.com|rapidapi\.com/i.test(url || '')) return 'freemium';
  return 'free';
}
export function inferAuth(text) { return AUTH_RE.test(text) ? 1 : 0; }

const TAG_VOCAB = ['scraper', 'mcp', 'llm', 'chatgpt', 'openai', 'claude', 'gemini', 'rag', 'embeddings', 'ocr', 'sentiment', 'translation', 'transcription', 'text-to-speech', 'image', 'pdf', 'screenshot', 'email', 'phone', 'sms', 'whatsapp', 'telegram', 'discord', 'slack', 'linkedin', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'reddit', 'pinterest', 'google maps', 'google search', 'google sheets', 'amazon', 'shopify', 'ebay', 'etsy', 'walmart', 'airbnb', 'zillow', 'indeed', 'glassdoor', 'github', 'npm', 'docker', 'json', 'csv', 'webhook', 'proxy', 'crm', 'hubspot', 'salesforce', 'notion', 'airtable', 'zapier', 'n8n', 'stocks', 'crypto', 'weather', 'news', 'rss', 'seo', 'serp', 'keywords', 'backlinks', 'reviews', 'prices', 'jobs', 'real estate', 'flights', 'hotels', 'sports', 'odds', 'maps', 'geocoding', 'validation', 'monitoring', 'analytics', 'real-time', 'bulk', 'open source', 'agent', 'workflow', 'crawler', 'enrichment', 'leads'];
const TAG_RE = new RegExp('(?<![a-z0-9])(' + [...TAG_VOCAB].sort((x, y) => y.length - x.length).map(esc).join('|') + ')', 'gi');

export function inferTags(name, desc, category, extra) {
  const out = [];
  const add = (t) => { t = String(t).trim().toLowerCase(); if (t && t.length < 32 && !out.includes(t)) out.push(t); };
  (extra || []).forEach(add);
  const hay = `${name} ${desc}`;
  TAG_RE.lastIndex = 0;
  let m, guard = 0;
  while (out.length < 6 && (m = TAG_RE.exec(hay)) && guard++ < 60) add(m[1]);
  if (!out.length && category) add(category.toLowerCase());
  return out.slice(0, 6);
}

export function stripEmoji(s) {
  return String(s || '').replace(/[\p{Extended_Pictographic}️‍\p{Regional_Indicator}]/gu, '').replace(/\s+/g, ' ').trim();
}

// Canonical key used for de-duplication.
export function dedupeKey(url, name) {
  if (url) {
    try {
      const u = new URL(/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      const drop = /^(fpr|ref|utm_[a-z]+|via|affiliate|aff|gclid|fbclid)$/i;
      const params = [...u.searchParams.entries()].filter(([k]) => !drop.test(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
      const path = u.pathname.replace(/\/+$/, '').toLowerCase();
      return host + path + (params ? '?' + params : '');
    } catch (e) { /* fall through */ }
  }
  return 'name:' + stripEmoji(name).toLowerCase();
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
