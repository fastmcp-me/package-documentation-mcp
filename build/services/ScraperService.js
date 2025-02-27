import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { cacheService } from "./CacheService.js";
import { extractRelevantLinks, extractCodeExamples, extractAPISignatures, } from "../utils/extractors.js";
import { extractLibraryName } from "../utils/packageRepository.js";
export class ScraperService {
    /**
     * Fetch and process a documentation page
     * @param url URL to process
     * @param libraryName Name of the library
     * @param skipCache Whether to skip the cache
     * @returns Processed page or null if failed
     */
    async fetchAndProcessPage(url, libraryName, skipCache = false) {
        try {
            // Check cache first
            if (!skipCache) {
                const cachedPage = cacheService.getPage(url);
                if (cachedPage) {
                    console.error(`Using cached version of ${url}`);
                    return cachedPage;
                }
            }
            console.error(`Fetching documentation from ${url}`);
            const response = await fetch(url);
            const html = await response.text();
            // Parse HTML using cheerio
            const $ = cheerio.load(html);
            // Remove script and style elements
            $("script, style, noscript, iframe").remove();
            // Extract basic metadata
            const title = $("title").text();
            // Extract links for crawling
            const links = extractRelevantLinks(html, url, libraryName);
            // Extract code examples and API signatures
            const codeExamples = extractCodeExamples(html);
            const apiSignatures = extractAPISignatures(html, libraryName);
            // Extract main content
            const mainContent = $("main, article, .readme, .content, .documentation, #readme").html() ||
                "";
            // Extract text from body if no main content found
            const content = mainContent || $("body").html() || "";
            // Create the processed page
            const processedPage = {
                url,
                title,
                content,
                links,
                codeExamples,
                apiSignatures,
                timestamp: new Date().toISOString(),
            };
            // Cache the page
            cacheService.setPage(url, processedPage);
            return processedPage;
        }
        catch (error) {
            console.error(`Error processing ${url}:`, error);
            return null;
        }
    }
    /**
     * Crawl documentation pages starting from a URL
     * @param startUrl Starting URL for crawling
     * @param libraryName Name of the library
     * @param maxPages Maximum number of pages to crawl
     * @param skipCache Whether to skip the cache
     * @returns Array of processed pages
     */
    async crawlDocumentation(startUrl, libraryName, maxPages = 5, skipCache = false) {
        const visitedUrls = new Set();
        const processedPages = [];
        const urlsToVisit = [startUrl];
        while (urlsToVisit.length > 0 && processedPages.length < maxPages) {
            const currentUrl = urlsToVisit.shift();
            if (visitedUrls.has(currentUrl)) {
                continue;
            }
            visitedUrls.add(currentUrl);
            const processedPage = await this.fetchAndProcessPage(currentUrl, libraryName, skipCache);
            if (processedPage) {
                processedPages.push(processedPage);
                // Add new URLs to visit
                for (const link of processedPage.links) {
                    if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                        urlsToVisit.push(link);
                    }
                }
            }
        }
        return processedPages;
    }
    /**
     * Fetch library documentation
     * @param url URL or package name
     * @param maxPages Maximum number of pages to crawl
     * @returns Compiled markdown document
     */
    async fetchLibraryDocumentation(url, maxPages = 5) {
        try {
            // If input is not a URL, assume it's a package name
            if (!url.startsWith("http")) {
                url = `https://www.npmjs.com/package/${url}`;
            }
            // Extract library name from URL
            const libraryName = extractLibraryName(url);
            // Crawl documentation
            const pages = await this.crawlDocumentation(url, libraryName, maxPages);
            if (pages.length === 0) {
                throw new Error(`Failed to fetch documentation from ${url}`);
            }
            // Compile documentation into a single markdown document
            const documentation = this.compileDocumentation(pages, libraryName);
            // Include instructions for using the prompt
            const promptInstructions = `
---

🔍 For better summarization, use the "summarize-library-docs" prompt with:
- libraryName: "${libraryName}"
- documentation: <the content above>

Example: @summarize-library-docs with libraryName="${libraryName}"
      `;
            return documentation + promptInstructions;
        }
        catch (error) {
            console.error(`Error fetching URL content:`, error);
            // Extract library name from URL
            const libraryName = extractLibraryName(url);
            const errorMessage = `Error fetching URL content: ${error instanceof Error ? error.message : String(error)}`;
            // Include error-specific prompt instructions
            const promptInstructions = `
---

🔍 For information about this library despite the fetch error, use the "summarize-library-docs" prompt with:
- libraryName: "${libraryName}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @summarize-library-docs with libraryName="${libraryName}" and errorStatus="fetch failed"
      `;
            return errorMessage + promptInstructions;
        }
    }
    /**
     * Compile processed pages into a single markdown document
     * @param pages Array of processed pages
     * @param libraryName Name of the library
     * @returns Compiled markdown document
     */
    compileDocumentation(pages, libraryName) {
        const $ = cheerio.load("");
        // Create a title for the documentation
        let result = `# ${libraryName} Documentation\n\n`;
        // Add metadata
        result += `## 📋 Documentation Overview\n\n`;
        result += `Library Name: ${libraryName}\n`;
        result += `Pages Analyzed: ${pages.length}\n`;
        result += `Generated: ${new Date().toISOString()}\n\n`;
        // Add table of contents
        result += `## 📑 Table of Contents\n\n`;
        pages.forEach((page, index) => {
            result += `${index + 1}. [${page.title}](#${page.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")})\n`;
        });
        result += `\n`;
        // Process each page
        pages.forEach((page, index) => {
            // Add page header
            result += `## ${page.title}\n\n`;
            result += `Source: ${page.url}\n\n`;
            // Process page content
            const pageContent = cheerio.load(page.content);
            // Extract headings and their content
            const headings = pageContent("h1, h2, h3, h4, h5, h6");
            if (headings.length > 0) {
                headings.each((_, heading) => {
                    const level = parseInt(heading.name.replace("h", ""));
                    const headingText = pageContent(heading).text().trim();
                    // Add heading
                    result += `${"#".repeat(level + 1)} ${headingText}\n\n`;
                    // Get content until next heading
                    let content = "";
                    let next = pageContent(heading).next();
                    while (next.length && !next.is("h1, h2, h3, h4, h5, h6")) {
                        if (next.is("p, ul, ol, pre, code, table")) {
                            content += pageContent.html(next) + "\n\n";
                        }
                        next = next.next();
                    }
                    // Add content
                    if (content) {
                        const contentText = $("<div>").html(content).text();
                        result += `${contentText}\n\n`;
                    }
                });
            }
            else {
                // If no headings, just add the whole content
                const contentText = $("<div>").html(page.content).text();
                result += `${contentText}\n\n`;
            }
            // Add code examples if available
            if (page.codeExamples.length > 0) {
                result += `### Code Examples\n\n`;
                page.codeExamples.forEach((example) => {
                    if (example.description) {
                        result += `#### ${example.description}\n\n`;
                    }
                    result += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
                });
            }
            // Add API signatures if available
            if (page.apiSignatures.length > 0) {
                result += `### API Reference\n\n`;
                page.apiSignatures.forEach((api) => {
                    result += `#### ${api.name}\n\n`;
                    if (api.signature) {
                        result += `\`\`\`\n${api.signature}\n\`\`\`\n\n`;
                    }
                    if (api.description) {
                        result += `${api.description}\n\n`;
                    }
                });
            }
            // Add separator between pages
            if (index < pages.length - 1) {
                result += `---\n\n`;
            }
        });
        // Add instructions for the LLM at the end
        result += `## 📌 Instructions for Summarization\n\n`;
        result += `1. Provide a concise overview of what this library/package does\n`;
        result += `2. Highlight key features and functionality\n`;
        result += `3. Include basic usage examples when available\n`;
        result += `4. Format the response for readability\n`;
        result += `5. If any part of the documentation is unclear, mention this\n`;
        result += `6. Include installation instructions if available\n`;
        return result;
    }
}
// Export a singleton instance
export const scraperService = new ScraperService();
