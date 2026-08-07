import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SeoAuditReport {
  url: string;
  score: number;
  homepageTitle: string;
  homepageDesc: string;
  schemaJson: string;
  missingH1: number;
  missingTitle: boolean;
  missingMetaDesc: boolean;
  totalImages: number;
  missingAltImages: number;
  totalLinks: number;
  brokenLinks: number;
  isHttps: boolean;
  loadTimeMs: number;
  keywords: { word: string; count: number; status: string }[];
  issues: { severity: 'CRITICAL' | 'WARNING' | 'INFO'; message: string }[];
  recommendations: string[];
  crawledAt: string;
}

@Injectable()
export class SeoCrawlerService {
  private readonly logger = new Logger(SeoCrawlerService.name);

  async crawlWebsite(targetUrl: string): Promise<SeoAuditReport> {
    const url = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    this.logger.log(`Starting real SEO crawl for URL: ${url}`);

    const startTime = Date.now();
    const issues: { severity: 'CRITICAL' | 'WARNING' | 'INFO'; message: string }[] = [];
    const recommendations: string[] = [];

    let html = '';
    let loadTimeMs = 0;

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'CampaignAI-SEO-Bot/1.0 (+https://campaignai.app)',
        },
      });
      html = response.data || '';
      loadTimeMs = Date.now() - startTime;
    } catch (err: any) {
      loadTimeMs = Date.now() - startTime;
      this.logger.warn(`Failed to crawl ${url}: ${err.message}`);
      issues.push({
        severity: 'CRITICAL',
        message: `Failed to fetch URL (${err.message}). Check server status and URL spelling.`,
      });
    }

    if (!html) {
      return {
        url,
        score: 35,
        homepageTitle: 'Unreachable Page',
        homepageDesc: 'Target URL could not be fetched by SEO crawler.',
        schemaJson: '{}',
        missingH1: 1,
        missingTitle: true,
        missingMetaDesc: true,
        totalImages: 0,
        missingAltImages: 0,
        totalLinks: 0,
        brokenLinks: 0,
        isHttps: url.startsWith('https'),
        loadTimeMs,
        keywords: [],
        issues,
        recommendations: ['Verify target URL is publicly accessible', 'Ensure SSL certificate is valid'],
        crawledAt: new Date().toISOString(),
      };
    }

    // 1. Meta Title Analysis
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1].trim() : (ogTitleMatch ? ogTitleMatch[1].trim() : '');
    const missingTitle = !title;

    if (missingTitle) {
      issues.push({ severity: 'CRITICAL', message: 'Page is missing a <title> tag.' });
      recommendations.push('Add a descriptive <title> tag (50-60 characters) with target keywords.');
    } else if (title.length < 30 || title.length > 70) {
      issues.push({ severity: 'WARNING', message: `Title length (${title.length} chars) is outside optimal 30-60 char range.` });
    }

    // 2. Meta Description Analysis
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = descMatch ? descMatch[1].trim() : (ogDescMatch ? ogDescMatch[1].trim() : '');
    const missingMetaDesc = !metaDesc;

    if (missingMetaDesc) {
      issues.push({ severity: 'CRITICAL', message: 'Page is missing a meta description tag.' });
      recommendations.push('Add a compelling meta description (120-160 characters) to boost search CTR.');
    }

    // 3. Heading Structure Analysis (H1)
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    let missingH1 = 0;
    if (h1Count === 0) {
      missingH1 = 1;
      issues.push({ severity: 'CRITICAL', message: 'Page has no <h1> tag.' });
      recommendations.push('Include exactly one <h1> tag containing your primary value proposition.');
    } else if (h1Count > 1) {
      issues.push({ severity: 'WARNING', message: `Multiple <h1> tags detected (${h1Count}). Best practice is 1 per page.` });
    }

    // 4. Image Alt Attribute Analysis
    const imgMatches = html.match(/<img[^>]+>/gi) || [];
    const totalImages = imgMatches.length;
    let missingAltImages = 0;
    for (const imgTag of imgMatches) {
      if (!/alt=["']([^"']+)["']/i.test(imgTag)) {
        missingAltImages++;
      }
    }
    if (missingAltImages > 0) {
      issues.push({ severity: 'WARNING', message: `${missingAltImages} of ${totalImages} images are missing alt text.` });
      recommendations.push('Add descriptive alt attributes to all images for image SEO and accessibility.');
    }

    // 5. Schema / Structured Data Analysis
    const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    const schemaJson = schemaMatch ? schemaMatch[1].trim() : '{}';
    if (schemaJson === '{}') {
      issues.push({ severity: 'INFO', message: 'No JSON-LD structured data (Schema.org) detected.' });
      recommendations.push('Implement Organization or Product Schema.org JSON-LD to qualify for rich snippets.');
    }

    // 6. Links Analysis
    const linkMatches = html.match(/<a\s+[^>]*href=["']([^"']+)["']/gi) || [];
    const totalLinks = linkMatches.length;

    // 7. HTTPS Check
    const isHttps = url.startsWith('https');
    if (!isHttps) {
      issues.push({ severity: 'CRITICAL', message: 'Site is served over unencrypted HTTP protocol.' });
      recommendations.push('Migrate to HTTPS to secure user data and avoid Google search ranking penalties.');
    }

    // 8. Load Performance Check
    if (loadTimeMs > 2500) {
      issues.push({ severity: 'WARNING', message: `Slow page response time (${loadTimeMs}ms).` });
      recommendations.push('Optimize server response time and enable browser caching/compression.');
    }

    // 9. Keyword Density Extractor
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    const words = textContent.match(/[a-z]{4,}/g) || [];
    const frequencyMap: Record<string, number> = {};
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'your', 'about', 'more', 'their', 'which', 'will', 'class', 'style', 'http', 'https']);

    for (const w of words) {
      if (!stopWords.has(w)) {
        frequencyMap[w] = (frequencyMap[w] || 0) + 1;
      }
    }

    const keywords = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        status: count > 3 ? 'Optimal' : 'Low',
      }));

    // 10. Scoring Calculation (100-point system)
    let score = 100;
    if (missingTitle) score -= 20;
    if (missingMetaDesc) score -= 15;
    if (missingH1) score -= 15;
    if (missingAltImages > 0) score -= Math.min(15, missingAltImages * 3);
    if (!isHttps) score -= 20;
    if (schemaJson === '{}') score -= 5;
    if (loadTimeMs > 2000) score -= 10;

    score = Math.max(20, score);

    return {
      url,
      score,
      homepageTitle: title || 'No Title Found',
      homepageDesc: metaDesc || 'No Description Found',
      schemaJson,
      missingH1,
      missingTitle,
      missingMetaDesc,
      totalImages,
      missingAltImages,
      totalLinks,
      brokenLinks: 0,
      isHttps,
      loadTimeMs,
      keywords,
      issues,
      recommendations,
      crawledAt: new Date().toISOString(),
    };
  }
}
