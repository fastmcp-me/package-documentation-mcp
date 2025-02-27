import * as fs from "fs";
import * as path from "path";
import * as os from "os";
// Create a temporary directory for storing cache
const DOCS_CACHE_DIR = path.join(os.tmpdir(), "docs-fetcher-cache");
// Make sure the cache directory exists
if (!fs.existsSync(DOCS_CACHE_DIR)) {
    fs.mkdirSync(DOCS_CACHE_DIR, { recursive: true });
}
export class CacheService {
    constructor() { }
    /**
     * Get a page from the cache
     * @param url URL of the page to retrieve
     * @returns The cached page, or null if not found or expired
     */
    getPage(url) {
        const cacheKey = Buffer.from(url).toString("base64");
        const cachePath = path.join(DOCS_CACHE_DIR, `${cacheKey}.json`);
        if (fs.existsSync(cachePath)) {
            try {
                const cacheData = fs.readFileSync(cachePath, "utf-8");
                const cachedPage = JSON.parse(cacheData);
                // Check if cache is valid (less than 24 hours old)
                const cacheTime = new Date(cachedPage.timestamp).getTime();
                const now = new Date().getTime();
                const cacheAge = now - cacheTime;
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    // 24 hours
                    return cachedPage;
                }
            }
            catch (error) {
                console.error(`Error reading cache for ${url}:`, error);
            }
        }
        return null;
    }
    /**
     * Save a page to the cache
     * @param url URL of the page to cache
     * @param page Page data to store
     */
    setPage(url, page) {
        const cacheKey = Buffer.from(url).toString("base64");
        const cachePath = path.join(DOCS_CACHE_DIR, `${cacheKey}.json`);
        try {
            fs.writeFileSync(cachePath, JSON.stringify(page, null, 2), "utf-8");
        }
        catch (error) {
            console.error(`Error writing cache for ${url}:`, error);
        }
    }
}
// Export a singleton instance
export const cacheService = new CacheService();
