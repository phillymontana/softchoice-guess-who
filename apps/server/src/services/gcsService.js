import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const GCS_BUCKET_URL = process.env.GCS_BUCKET_URL || 'https://storage.googleapis.com/cabana-oasis-assets-next26/';
const CACHE_TTL = process.env.GCS_CACHE_TTL_SECONDS || 300;

let imageCache = [];
const parser = new XMLParser();

export const fetchAndCacheImages = async () => {
  try {
    console.log(`[GCS] Fetching image list from ${GCS_BUCKET_URL}`);
    const response = await axios.get(GCS_BUCKET_URL);
    const parsed = parser.parse(response.data);
    
    const rawContents = parsed.ListBucketResult.Contents;
    const contents = Array.isArray(rawContents) ? rawContents : [rawContents];
    
    imageCache = contents
      .map(item => ({
        key: item.Key,
        imageUrl: `${GCS_BUCKET_URL}${item.Key}`,
        lastModified: item.LastModified,
        size: item.Size
      }))
      .sort((a, b) => {
        // Extract numeric timestamp from filename (e.g. "arena_rock_1775799815951.png" → 1775799815951)
        const tsA = parseInt((a.key.match(/(\d{10,})/)?.[1]) ?? '0', 10);
        const tsB = parseInt((b.key.match(/(\d{10,})/)?.[1]) ?? '0', 10);
        // If both have embedded timestamps, sort by those (newest first)
        if (tsA && tsB) return tsB - tsA;
        // Fallback: sort by GCS LastModified date (newest first)
        return new Date(b.lastModified) - new Date(a.lastModified);
      });

    console.log(`[GCS] Successfully cached ${imageCache.length} images.`);
    return imageCache;
  } catch (error) {
    console.error('[GCS] Error fetching image list:', error.message);
    return imageCache; // Return stale cache if fetch fails
  }
};

// Schedule cache refresh
cron.schedule(`*/${Math.floor(CACHE_TTL / 60)} * * * *`, () => {
  fetchAndCacheImages();
});

export const getImages = () => imageCache;

export const getImageByKey = (key) => imageCache.find(img => img.key === key);
