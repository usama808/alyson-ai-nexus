import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Alyson AI database...");

  const categories = [
    { name: "Local News", slug: "local-news" },
    { name: "Real Estate", slug: "real-estate" },
    { name: "Local Sports", slug: "local-sports" },
    { name: "Business", slug: "business" },
    { name: "Trending National", slug: "trending-national" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: cat,
    });
  }

  const passwordHash = await bcrypt.hash("AlysonAI2026!", 12);
  const users = [
    { name: "Admin User", email: "admin@alyson.news", role: "admin" },
    { name: "Sarah Lee", email: "sarah@alyson.news", role: "reviewer" },
    { name: "Emma Brown", email: "emma@alyson.news", role: "editor" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, status: "active", passwordHash },
      update: { name: u.name, role: u.role, passwordHash },
    });
  }

  const cities = [
    { name: "New York", state: "NY", slug: "new-york", subdomain: "ny.alyson.news", population: 8800000 },
    { name: "Los Angeles", state: "CA", slug: "los-angeles", subdomain: "la.alyson.news", population: 3900000 },
    { name: "Chicago", state: "IL", slug: "chicago", subdomain: "chi.alyson.news", population: 2700000 },
    { name: "Miami", state: "FL", slug: "miami", subdomain: "mia.alyson.news", population: 450000 },
    { name: "Dallas", state: "TX", slug: "dallas", subdomain: "dal.alyson.news", population: 1300000 },
    { name: "Houston", state: "TX", slug: "houston", subdomain: "hou.alyson.news", population: 2300000 },
    { name: "Phoenix", state: "AZ", slug: "phoenix", subdomain: "phx.alyson.news", population: 1600000 },
    { name: "Philadelphia", state: "PA", slug: "philadelphia", subdomain: "phl.alyson.news", population: 1500000 },
    { name: "San Antonio", state: "TX", slug: "san-antonio", subdomain: "sat.alyson.news", population: 1500000, status: "paused" },
    { name: "San Diego", state: "CA", slug: "san-diego", subdomain: "sd.alyson.news", population: 1400000 },
    { name: "Austin", state: "TX", slug: "austin", subdomain: "atx.alyson.news", population: 970000 },
    { name: "Seattle", state: "WA", slug: "seattle", subdomain: "sea.alyson.news", population: 750000 },
  ];

  /** Varied metrics (not tied to city id) so sorting is testable per column */
  const metricsBySlug: Record<
    string,
    {
      articles: number;
      clicks: number;
      ctr: number;
      revenue: number;
      subscribers: number;
      topCategory: string;
    }
  > = {
    "new-york": { articles: 412, clicks: 70000, ctr: 28, revenue: 45000, subscribers: 12000, topCategory: "Real Estate" },
    "los-angeles": { articles: 388, clicks: 49000, ctr: 27, revenue: 39000, subscribers: 9500, topCategory: "Sports" },
    chicago: { articles: 305, clicks: 33000, ctr: 23, revenue: 28000, subscribers: 7200, topCategory: "Business" },
    miami: { articles: 244, clicks: 19000, ctr: 20, revenue: 17000, subscribers: 4200, topCategory: "Trending" },
    dallas: { articles: 271, clicks: 45000, ctr: 28, revenue: 36000, subscribers: 8100, topCategory: "Local News" },
    houston: { articles: 233, clicks: 28000, ctr: 22, revenue: 22000, subscribers: 6300, topCategory: "Business" },
    phoenix: { articles: 189, clicks: 21000, ctr: 21, revenue: 17500, subscribers: 5100, topCategory: "Real Estate" },
    philadelphia: { articles: 201, clicks: 24000, ctr: 22, revenue: 19000, subscribers: 5800, topCategory: "Local News" },
    "san-antonio": { articles: 88, clicks: 9000, ctr: 17, revenue: 6000, subscribers: 2100, topCategory: "Sports" },
    "san-diego": { articles: 220, clicks: 30000, ctr: 25, revenue: 24000, subscribers: 6800, topCategory: "Real Estate" },
    austin: { articles: 256, clicks: 36000, ctr: 29, revenue: 31000, subscribers: 7600, topCategory: "Business" },
    seattle: { articles: 198, clicks: 27000, ctr: 26, revenue: 23000, subscribers: 6100, topCategory: "Trending" },
  };

  for (const c of cities) {
    const city = await prisma.city.upsert({
      where: { slug: c.slug },
      create: { ...c, status: c.status ?? "active" },
      update: { name: c.name, subdomain: c.subdomain, population: c.population, status: c.status ?? "active" },
    });

    const m = metricsBySlug[c.slug] ?? {
      articles: 100,
      clicks: 15000,
      ctr: 22,
      revenue: 12000,
      subscribers: 3000,
      topCategory: "Local News",
    };

    await prisma.cityMetric.upsert({
      where: { cityId: city.id },
      create: {
        cityId: city.id,
        views: m.clicks * 3,
        clicks: m.clicks,
        avgCtr: m.ctr,
        revenue: m.revenue,
        subscriberCount: m.subscribers,
        totalArticles: m.articles,
        pendingReviews: city.id % 5,
        topCategory: m.topCategory,
        emailOpenRate: "40%",
        subscriberGrowth: `+${400 + city.id * 40}`,
        updatedAt: new Date(),
      },
      update: {
        views: m.clicks * 3,
        clicks: m.clicks,
        avgCtr: m.ctr,
        revenue: m.revenue,
        subscriberCount: m.subscribers,
        totalArticles: m.articles,
        topCategory: m.topCategory,
        updatedAt: new Date(),
      },
    });
  }

  const integrations = [
    { name: "OpenAI", provider: "OpenAI", status: "connected" },
    { name: "Claude", provider: "Anthropic", status: "connected" },
    { name: "DeepSeek", provider: "DeepSeek", status: "connected" },
    { name: "Salesforce Email", provider: "Salesforce", status: "connected" },
    { name: "GMass", provider: "GMass", status: "connected" },
    { name: "Reddit API", provider: "Reddit", status: "connected" },
    { name: "TikTok API", provider: "TikTok", status: "degraded" },
    { name: "Reuters Wire", provider: "Reuters", status: "connected" },
  ];

  for (const i of integrations) {
    const existing = await prisma.integration.findFirst({ where: { provider: i.provider } });
    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { status: i.status, lastSyncAt: new Date() },
      });
    } else {
      await prisma.integration.create({ data: { ...i, lastSyncAt: new Date() } });
    }
  }

  const settings = [
    { key: "moderation.mode", value: false, description: "Require human approval for all articles" },
    { key: "ai.auto_publish_threshold", value: 0.9, description: "Auto-publish confidence threshold" },
    { key: "ai.review_threshold", value: 0.7, description: "Review queue threshold" },
    { key: "ranking.auto_interval_min", value: 5, description: "Ranking recalculation interval" },
    { key: "scraping.reddit_interval_sec", value: 60, description: "Reddit poll interval" },
    { key: "scraping.tiktok_interval_sec", value: 120, description: "TikTok poll interval" },
    { key: "scraping.daily_article_cap", value: 1200, description: "Daily article cap" },
    { key: "seo.default_og_image", value: "alyson-share.png", description: "Default OG image" },
    { key: "seo.sitemap_refresh", value: "hourly", description: "Sitemap refresh" },
    { key: "city.subdomain_pattern", value: "{slug}.alyson.news", description: "Subdomain pattern" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value, description: s.description },
    });
  }

  const ny = await prisma.city.findUnique({ where: { slug: "new-york" } });
  const la = await prisma.city.findUnique({ where: { slug: "los-angeles" } });
  const localNews = await prisma.category.findUnique({ where: { slug: "local-news" } });
  const realEstate = await prisma.category.findUnique({ where: { slug: "real-estate" } });

  if (ny && localNews) {
    const article = await prisma.article.upsert({
      where: { cityId_slug: { cityId: ny.id, slug: "nyc-subway-delays" } },
      create: {
        cityId: ny.id,
        categoryId: localNews.id,
        title: "NYC Subway Delays Worsen as Spring Storm Hits Manhattan",
        slug: "nyc-subway-delays",
        status: "published",
        publishedAt: new Date("2026-05-06"),
      },
      update: {},
    });

    await prisma.articleContent.upsert({
      where: { articleId: article.id },
      create: {
        articleId: article.id,
        content: "Full article content about NYC subway delays and traffic conditions.",
        seoDescription: "NYC subway delays impact commuters during severe weather.",
        newsletterHtml: "<h1>NYC Morning Update</h1><p>Subway delays continue...</p>",
      },
      update: {},
    });

    await prisma.articleSource.upsert({
      where: { id: 1 },
      create: {
        articleId: article.id,
        platform: "BBC",
        sourceUrl: "https://bbc.com/news/sample",
        originalAuthor: "BBC News",
      },
      update: {},
    }).catch(() =>
      prisma.articleSource.create({
        data: {
          articleId: article.id,
          platform: "BBC",
          sourceUrl: "https://bbc.com/news/sample",
          originalAuthor: "BBC News",
        },
      }),
    );

    await prisma.articleMetric.upsert({
      where: { articleId: article.id },
      create: {
        articleId: article.id,
        views: 15000,
        clicks: 4200,
        ctr: 28,
        engagement: 88,
        bounceRate: "32%",
        avgTimeOnPage: "142s",
        emailClicks: 870,
        socialShares: 340,
        homepageFeatured: true,
        updatedAt: new Date(),
      },
      update: {},
    });

    await prisma.rankingScore.upsert({
      where: { articleId: article.id },
      create: {
        articleId: article.id,
        score: 91,
        ctrWeight: 40,
        revenueWeight: 30,
        engagementWeight: 30,
        updatedAt: new Date(),
      },
      update: {},
    });

    await prisma.aiGeneration.create({
      data: {
        articleId: article.id,
        model: "gpt-4o",
        provider: "openai",
        generationType: "summary",
        confidenceScore: 0.95,
        outputType: "text",
        outputContent: "NYC subway delays continue to impact Manhattan commuters.",
      },
    });

    await prisma.homepageSlot.upsert({
      where: { cityId_position: { cityId: ny.id, position: 1 } },
      create: {
        cityId: ny.id,
        articleId: article.id,
        position: 1,
        manualOverride: false,
        active: true,
        updatedAt: new Date(),
      },
      update: { articleId: article.id, updatedAt: new Date() },
    });
  }

  if (la && realEstate) {
    await prisma.article.upsert({
      where: { cityId_slug: { cityId: la.id, slug: "manhattan-prices-rise" } },
      create: {
        cityId: la.id,
        categoryId: realEstate.id,
        title: "Manhattan Apartment Prices Climb 12% in Q2",
        slug: "manhattan-prices-rise",
        status: "review_pending",
        publishedAt: null,
      },
      update: {},
    });
  }

  if (ny) {
    for (const sub of [
      { email: "user1@gmail.com", source: "newsletter" },
      { email: "user2@gmail.com", source: "popup" },
    ]) {
      await prisma.subscriber.upsert({
        where: { cityId_email: { cityId: ny.id, email: sub.email } },
        create: { cityId: ny.id, email: sub.email, status: "active", source: sub.source },
        update: { status: "active" },
      });
    }

    await prisma.emailCampaign.upsert({
      where: { id: 1 },
      create: {
        cityId: ny.id,
        title: "NYC Daily Morning News",
        campaignType: "newsletter",
        sentCount: 12000,
        openRate: 42,
        clickRate: 16,
        status: "sent",
      },
      update: {},
    }).catch(() =>
      prisma.emailCampaign.create({
        data: {
          cityId: ny.id,
          title: "NYC Daily Morning News",
          campaignType: "newsletter",
          sentCount: 12000,
          openRate: 42,
          clickRate: 16,
          status: "sent",
        },
      }),
    );
  }

  console.log("Seed completed.");
  console.log("Login: admin@alyson.news / AlysonAI2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
