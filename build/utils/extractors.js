import * as cheerio from "cheerio";
/**
 * Extract relevant links from HTML content
 * @param html HTML content
 * @param baseUrl Base URL of the page
 * @param libraryName Name of the library
 * @returns Array of relevant links
 */
export function extractRelevantLinks(html, baseUrl, libraryName) {
    const $ = cheerio.load(html);
    const links = new Set();
    const baseUrlObj = new URL(baseUrl);
    const libraryNameLower = libraryName.toLowerCase();
    // Keywords that indicate important documentation pages
    const apiKeywords = [
        "api",
        "reference",
        "doc",
        "guide",
        "tutorial",
        "example",
        "usage",
        "getting-started",
        "introduction",
        "started",
    ];
    $("a[href]").each((_, element) => {
        const href = $(element).attr("href");
        if (!href)
            return;
        try {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, baseUrl).href;
            const urlObj = new URL(absoluteUrl);
            // Only include links from the same hostname
            if (urlObj.hostname !== baseUrlObj.hostname)
                return;
            const linkText = $(element).text().toLowerCase();
            const linkPath = urlObj.pathname.toLowerCase();
            // Check if link contains relevant keywords
            const isRelevant = apiKeywords.some((keyword) => linkPath.includes(keyword) || linkText.includes(keyword)) || linkPath.includes(libraryNameLower);
            if (isRelevant) {
                // Avoid hash links to the same page
                if (absoluteUrl.split("#")[0] !== baseUrl.split("#")[0]) {
                    links.add(absoluteUrl);
                }
            }
        }
        catch (error) {
            // Ignore invalid URLs
        }
    });
    return Array.from(links);
}
/**
 * Extract code examples from HTML content
 * @param html HTML content
 * @returns Array of code examples
 */
export function extractCodeExamples(html) {
    const $ = cheerio.load(html);
    const examples = [];
    $('pre code, pre, code, .highlight, .code-example, [class*="code"], [class*="example"]').each((_, element) => {
        const $elem = $(element);
        // Skip nested code elements
        if ($elem.parents("pre, code").length > 0 &&
            element.name !== "pre" &&
            element.name !== "code") {
            return;
        }
        let code = $elem.text().trim();
        if (!code || code.length < 10)
            return; // Skip very short code blocks
        let language = "";
        // Try to determine the language from class attributes
        const className = $elem.attr("class") || "";
        const classMatch = className.match(/(language|lang|syntax)-(\w+)/i);
        if (classMatch) {
            language = classMatch[2];
        }
        else if (className.includes("js") || className.includes("javascript")) {
            language = "javascript";
        }
        else if (className.includes("ts") || className.includes("typescript")) {
            language = "typescript";
        }
        if (!language) {
            language =
                $elem.attr("data-language") ||
                    $elem.attr("data-lang") ||
                    $elem.attr("language") ||
                    $elem.attr("lang") ||
                    "";
        }
        // Try to find a description for this code block
        let description = "";
        let $heading = $elem.prev("h1, h2, h3, h4, h5, h6, p");
        if ($heading.length > 0) {
            description = $heading.text().trim();
        }
        else {
            // Look for a heading in the parent element
            const $parent = $elem.parent();
            $heading = $parent.find("h1, h2, h3, h4, h5, h6").first();
            if ($heading.length > 0) {
                description = $heading.text().trim();
            }
        }
        examples.push({
            code,
            language: language.toLowerCase(),
            description,
        });
    });
    return examples;
}
/**
 * Extract API signatures from HTML content
 * @param html HTML content
 * @param libraryName Name of the library
 * @returns Array of API signatures
 */
export function extractAPISignatures(html, libraryName) {
    const $ = cheerio.load(html);
    const signatures = [];
    const cleanText = (text) => text.replace(/\s+/g, " ").trim();
    $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
        const $heading = $(heading);
        const headingText = cleanText($heading.text());
        // Skip very long headings or common sections
        if (headingText.length > 100 ||
            headingText.toLowerCase().includes("introduction") ||
            headingText.toLowerCase().includes("getting started")) {
            return;
        }
        let signature = "";
        let description = "";
        // Look for code blocks after the heading
        const $code = $heading
            .nextAll("pre, code, .signature, .function-signature")
            .first();
        if ($code.length > 0 &&
            $code.prevAll("h1, h2, h3, h4, h5, h6").first().is($heading)) {
            signature = cleanText($code.text());
        }
        // Look for description paragraphs
        const $description = $heading.nextAll("p").first();
        if ($description.length > 0 &&
            $description.prevAll("h1, h2, h3, h4, h5, h6").first().is($heading)) {
            description = cleanText($description.text());
        }
        // Only add if we have either a signature or description
        if (signature || description) {
            signatures.push({
                name: headingText,
                signature,
                description,
            });
        }
    });
    return signatures;
}
