export type City = {
  id: number;
  name: string;
  state: string;
  subdomain: string;
  population: number;
  status: "active" | "paused";
  articles: number;
  clicks: number;
  ctr: number;
  revenue: number;
  subscribers: number;
  topCategory: string;
};

export const cities: City[] = [
  { id: 1, name: "New York", state: "NY", subdomain: "ny.alyson.news", population: 8800000, status: "active", articles: 412, clicks: 70000, ctr: 28, revenue: 45000, subscribers: 12000, topCategory: "Real Estate" },
  { id: 2, name: "Los Angeles", state: "CA", subdomain: "la.alyson.news", population: 3900000, status: "active", articles: 388, clicks: 49000, ctr: 27, revenue: 39000, subscribers: 9500, topCategory: "Sports" },
  { id: 3, name: "Chicago", state: "IL", subdomain: "chi.alyson.news", population: 2700000, status: "active", articles: 305, clicks: 33000, ctr: 23, revenue: 28000, subscribers: 7200, topCategory: "Business" },
  { id: 4, name: "Miami", state: "FL", subdomain: "mia.alyson.news", population: 450000, status: "active", articles: 244, clicks: 19000, ctr: 20, revenue: 17000, subscribers: 4200, topCategory: "Trending" },
  { id: 5, name: "Dallas", state: "TX", subdomain: "dal.alyson.news", population: 1300000, status: "active", articles: 271, clicks: 45000, ctr: 28, revenue: 36000, subscribers: 8100, topCategory: "Local News" },
  { id: 6, name: "Houston", state: "TX", subdomain: "hou.alyson.news", population: 2300000, status: "active", articles: 233, clicks: 28000, ctr: 22, revenue: 22000, subscribers: 6300, topCategory: "Business" },
  { id: 7, name: "Phoenix", state: "AZ", subdomain: "phx.alyson.news", population: 1600000, status: "active", articles: 189, clicks: 21000, ctr: 21, revenue: 17500, subscribers: 5100, topCategory: "Real Estate" },
  { id: 8, name: "Philadelphia", state: "PA", subdomain: "phl.alyson.news", population: 1500000, status: "active", articles: 201, clicks: 24000, ctr: 22, revenue: 19000, subscribers: 5800, topCategory: "Local News" },
  { id: 9, name: "San Antonio", state: "TX", subdomain: "sat.alyson.news", population: 1500000, status: "paused", articles: 88, clicks: 9000, ctr: 17, revenue: 6000, subscribers: 2100, topCategory: "Sports" },
  { id: 10, name: "San Diego", state: "CA", subdomain: "sd.alyson.news", population: 1400000, status: "active", articles: 220, clicks: 30000, ctr: 25, revenue: 24000, subscribers: 6800, topCategory: "Real Estate" },
  { id: 11, name: "Austin", state: "TX", subdomain: "atx.alyson.news", population: 970000, status: "active", articles: 256, clicks: 36000, ctr: 29, revenue: 31000, subscribers: 7600, topCategory: "Business" },
  { id: 12, name: "Seattle", state: "WA", subdomain: "sea.alyson.news", population: 750000, status: "active", articles: 198, clicks: 27000, ctr: 26, revenue: 23000, subscribers: 6100, topCategory: "Trending" },
];

export type Article = {
  id: number;
  title: string;
  city: string;
  category: string;
  source: "Reddit" | "TikTok" | "Instagram" | "Facebook" | "BBC" | "Reuters" | "TechCrunch";
  sourceUrl?: string;
  status: "Draft" | "Pending Review" | "Published" | "Rejected";
  ctr: number;
  clicks: number;
  revenue: number;
  engagement: number;
  aiConfidence: number;
  publishedAt: string;
  badges?: ("Trending" | "Viral" | "Breaking" | "High Revenue")[];
};

export const articles: Article[] = [
  { id: 1, title: "NYC Subway Delays Worsen as Spring Storm Hits Manhattan", city: "New York", category: "Local News", source: "BBC", sourceUrl: "https://www.bbc.com/news/world-us-canada-68421001", status: "Published", ctr: 28, clicks: 4200, revenue: 4200, engagement: 88, aiConfidence: 0.95, publishedAt: "2026-05-06", badges: ["Trending", "Breaking"] },
  { id: 2, title: "Manhattan Apartment Prices Climb 12% in Q2", city: "New York", category: "Real Estate", source: "Reuters", sourceUrl: "https://www.reuters.com/world/us/manhattan-apartment-prices-q2-2026", status: "Published", ctr: 25, clicks: 3100, revenue: 3200, engagement: 80, aiConfidence: 0.92, publishedAt: "2026-05-06", badges: ["High Revenue"] },
  { id: 3, title: "Lakers Edge Clippers in Downtown Rivalry Thriller", city: "Los Angeles", category: "Local Sports", source: "Reddit", sourceUrl: "https://www.reddit.com/r/lakers/comments/sample-lakers-clippers", status: "Pending Review", ctr: 18, clicks: 1700, revenue: 1500, engagement: 65, aiConfidence: 0.74, publishedAt: "2026-05-06" },
  { id: 4, title: "Chicago Startups Raise Record $2.1B in Funding Round", city: "Chicago", category: "Local Business", source: "TechCrunch", sourceUrl: "https://techcrunch.com/chicago-startups-record-funding-2026", status: "Published", ctr: 30, clicks: 6000, revenue: 5800, engagement: 94, aiConfidence: 0.91, publishedAt: "2026-05-05", badges: ["Viral", "High Revenue"] },
  { id: 5, title: "Viral TikTok Food Trend Hits Miami Beach", city: "Miami", category: "Trending National", source: "TikTok", sourceUrl: "https://www.tiktok.com/@miamifoodie/video/7234567890", status: "Draft", ctr: 17, clicks: 700, revenue: 400, engagement: 55, aiConfidence: 0.62, publishedAt: "2026-05-07" },
  { id: 6, title: "Austin Tech Hub Welcomes Three New Unicorns", city: "Austin", category: "Local Business", source: "Reuters", sourceUrl: "https://www.reuters.com/technology/austin-tech-unicorns-2026", status: "Published", ctr: 31, clicks: 5400, revenue: 4900, engagement: 91, aiConfidence: 0.94, publishedAt: "2026-05-05", badges: ["Trending"] },
  { id: 7, title: "Seattle Mariners Clinch Series With Walk-Off Homer", city: "Seattle", category: "Local Sports", source: "Instagram", sourceUrl: "https://www.instagram.com/p/sample-mariners-walkoff", status: "Published", ctr: 26, clicks: 3300, revenue: 2400, engagement: 82, aiConfidence: 0.88, publishedAt: "2026-05-04", badges: ["Trending"] },
  { id: 8, title: "Dallas Real Estate Cooldown: What Buyers Should Know", city: "Dallas", category: "Real Estate", source: "BBC", sourceUrl: "https://www.bbc.com/news/business-68419876", status: "Published", ctr: 24, clicks: 2900, revenue: 2700, engagement: 78, aiConfidence: 0.9, publishedAt: "2026-05-04" },
  { id: 9, title: "Phoenix Heat Advisory Extended Through Weekend", city: "Phoenix", category: "Local News", source: "Facebook", sourceUrl: "https://www.facebook.com/phoenixnews/posts/heat-advisory-weekend", status: "Pending Review", ctr: 19, clicks: 1200, revenue: 800, engagement: 60, aiConfidence: 0.71, publishedAt: "2026-05-07" },
  { id: 10, title: "Philly Cheesesteak Wars: New Contender Opens Downtown", city: "Philadelphia", category: "Trending National", source: "TikTok", sourceUrl: "https://www.tiktok.com/@phillyeats/video/7234512345", status: "Published", ctr: 22, clicks: 2100, revenue: 1700, engagement: 73, aiConfidence: 0.86, publishedAt: "2026-05-03" },
];

export const trafficSeries = Array.from({ length: 30 }, (_, i) => ({
  day: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
  clicks: 30000 + Math.round(Math.sin(i / 3) * 6000) + i * 400 + Math.random() * 2000,
  revenue: 8000 + Math.round(Math.sin(i / 4) * 1500) + i * 100,
  articles: 80 + Math.round(Math.cos(i / 5) * 20) + Math.random() * 10,
}));

export const sparkline = (seed: number) =>
  Array.from({ length: 14 }, (_, i) => ({
    x: i,
    y: 20 + Math.abs(Math.sin((i + seed) / 2)) * 80 + Math.random() * 10,
  }));

export const pipelineStages = [
  { name: "Scraping", active: 142, queued: 38, success: 98.4 },
  { name: "Processing", active: 86, queued: 24, success: 99.1 },
  { name: "AI Summarization", active: 54, queued: 19, success: 97.6 },
  { name: "SEO Optimization", active: 41, queued: 12, success: 99.5 },
  { name: "Moderation", active: 18, queued: 6, success: 96.2 },
  { name: "Publishing", active: 9, queued: 2, success: 99.9 },
];

/** @deprecated Use MOCK_SOURCE_PLATFORMS from ./news-sources for full shape */
export const sourcePlatforms = [
  { name: "Google News", jobs: 280, status: "healthy" as const },
  { name: "Reddit", jobs: 120, status: "healthy" as const },
  { name: "BBC", jobs: 64, status: "healthy" as const },
];

export const integrations = [
  { name: "OpenAI", category: "AI Model", status: "connected", lastSync: "2 min ago", description: "GPT-4o for summaries & headlines" },
  { name: "Claude", category: "AI Model", status: "connected", lastSync: "5 min ago", description: "Anthropic Claude 3.5 Sonnet" },
  { name: "DeepSeek", category: "AI Model", status: "connected", lastSync: "11 min ago", description: "DeepSeek-V3 for cost-efficient gen" },
  { name: "Salesforce", category: "Email/CRM", status: "connected", lastSync: "1 hr ago", description: "Subscriber sync & campaigns" },
  { name: "GMass", category: "Email", status: "connected", lastSync: "20 min ago", description: "Bulk newsletter delivery" },
  { name: "Google News RSS", category: "Source", status: "connected", lastSync: "just now", description: "Per-city local news RSS" },
  { name: "Reddit API", category: "Source", status: "connected", lastSync: "just now", description: "City subreddit ingestion" },
  { name: "BBC RSS", category: "Source", status: "connected", lastSync: "3 min ago", description: "Global news wire RSS" },
  { name: "TikTok API", category: "Source", status: "degraded", lastSync: "—", description: "Not configured — API key required" },
  { name: "Instagram / Meta", category: "Source", status: "degraded", lastSync: "—", description: "Not configured — credentials required" },
  { name: "Reuters Wire", category: "Source", status: "degraded", lastSync: "—", description: "Not configured — RSS not wired" },
];

export const subscribersGrowth = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  subscribers: 22000 + i * 5200 + Math.round(Math.random() * 1500),
  unsubs: 200 + Math.round(Math.random() * 300),
}));

export const campaigns = [
  { id: 1, title: "NYC Daily Morning News", city: "New York", type: "Daily Newsletter", sent: 12000, open: 42, click: 16, revenue: 1820 },
  { id: 2, title: "LA Sports Update", city: "Los Angeles", type: "Trending Alerts", sent: 8500, open: 38, click: 13, revenue: 980 },
  { id: 3, title: "Chicago Business Weekly", city: "Chicago", type: "Promotional Offer", sent: 6200, open: 35, click: 11, revenue: 720 },
  { id: 4, title: "Miami Trending Now", city: "Miami", type: "Trending Alerts", sent: 4100, open: 41, click: 18, revenue: 540 },
  { id: 5, title: "Austin Founders Brief", city: "Austin", type: "Daily Newsletter", sent: 7400, open: 47, click: 21, revenue: 1620 },
];
