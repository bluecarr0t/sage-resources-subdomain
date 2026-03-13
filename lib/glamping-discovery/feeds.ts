/**
 * RSS feed configuration for glamping discovery pipeline
 */

export interface RssFeedConfig {
  id: string;
  name: string;
  url: string;
  discoverySource: string;
}

export const GLAMPING_RSS_FEEDS: RssFeedConfig[] = [
  {
    id: 'google-news-glamping-resort',
    name: 'Google News - Glamping Resort',
    url: 'https://news.google.com/rss/search?q=glamping+resort&hl=en-US&gl=US&ceid=US:en',
    discoverySource: 'Google News RSS',
  },
  {
    id: 'google-news-glamping-opening',
    name: 'Google News - Glamping Opening',
    url: 'https://news.google.com/rss/search?q=glamping+opening+2025&hl=en-US&gl=US&ceid=US:en',
    discoverySource: 'Google News RSS',
  },
  {
    id: 'google-news-luxury-camping',
    name: 'Google News - Luxury Camping',
    url: 'https://news.google.com/rss/search?q=luxury+camping+resort+opening&hl=en-US&gl=US&ceid=US:en',
    discoverySource: 'Google News RSS',
  },
  {
    id: 'google-news-glamping-north-america',
    name: 'Google News - Glamping North America',
    url: 'https://news.google.com/rss/search?q=glamping+USA+Canada+resort&hl=en-US&gl=US&ceid=US:en',
    discoverySource: 'Google News RSS',
  },
];
