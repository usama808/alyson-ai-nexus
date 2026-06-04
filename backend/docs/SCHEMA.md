# Alyson AI Database Schema

Authoritative source: `Ai builder_ Alyson · AI Local News Intelligence V1.xlsx`

## Core Tables (from Excel)

| Table | Columns |
|-------|---------|
| cities | id, name, state, slug, subdomain, population, status |
| categories | id, name, slug |
| articles | id, city_id, category_id, title, slug, status, published_at, created_at |
| article_content | article_id, content, seo_description, newsletter_html |
| article_sources | id, article_id, platform, source_url, original_author, created_at |
| social_posts_raw | id, platform, city_id, post_text, likes, comments, shares, post_url, scraped_at |
| ai_generations | id, article_id, model, provider, generation_type, confidence_score, output_type, created_at |
| review_queue | id, article_id, status, reviewer_name, notes, approved_at |
| ranking_scores | article_id, score, ctr_weight, revenue_weight, engagement_weight, updated_at |
| article_metrics | article_id, views, clicks, ctr, engagement, bounce_rate, avg_time_on_page, email_clicks, social_shares, homepage_featured, updated_at |
| city_metrics | city_id, views, clicks, avg_ctr, revenue, subscriber_count, total_articles, pending_reviews, top_category, email_open_rate, subscriber_growth, updated_at |
| subscribers | id, city_id, email, status, source, created_at |
| email_campaigns | id, city_id, title, campaign_type, sent_count, open_rate, click_rate, created_at |
| integrations | id, name, provider, status, last_sync_at |
| events | id, event_type, article_id, city_id, user_id, created_at |
| users | id, name, email, role, status |

## Extension Tables (from project doc + platform requirements)

| Table | Purpose |
|-------|---------|
| article_versions | Edit history, AI rewrites, rollback |
| homepage_slots | Top-10 placements, manual override, A/B |
| system_jobs | BullMQ job audit trail |
| settings | Platform configuration key-value store |
| refresh_tokens | JWT refresh token rotation |
| integration_credentials | AES-256-GCM encrypted API secrets |

## Article Status Values

`draft` | `review_pending` | `approved` | `published` | `rejected`

## City Isolation

All content queries are scoped by `city_id`. No cross-city data leakage in services.
