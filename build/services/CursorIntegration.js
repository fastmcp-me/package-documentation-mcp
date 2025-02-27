import { getPackageUrl } from "../utils/github.js";
import { scraperService } from "./ScraperService.js";
/**
 * Service for integrating with Cursor IDE
 * Provides methods to detect when documentation is needed and to fetch it
 */
export class CursorIntegrationService {
    /**
     * Detect if a string is likely a package reference that needs documentation
     * @param text The text to check (import statement, reference, etc.)
     * @returns True if the text appears to be a package reference
     */
    isLikelyPackageReference(text) {
        // Check for common import/require patterns
        const importPatterns = [
            /import\s+.*\s+from\s+['"]([^./][^'"]*)['"];?/, // ES6 imports
            /import\s+['"]([^./][^'"]*)['"];?/, // Side-effect imports
            /require\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/, // CommonJS require
            /from\s+['"]([^./][^'"]*)['"]/, // TypeScript from imports
            /using\s+([A-Za-z0-9_.]+);/, // C# using statements
            /import\s+([A-Za-z0-9_.]+)/, // Java/Python imports
            /include\s+(['"][^'"]*['"])/, // PHP, Ruby includes
            /use\s+([A-Za-z0-9_:]+)/, // Rust, PHP use statements
        ];
        // Check if text matches any import pattern
        return importPatterns.some((pattern) => pattern.test(text));
    }
    /**
     * Extract package name from an import statement or reference
     * @param text The text containing the package reference
     * @returns The extracted package name or null if not found
     */
    extractPackageName(text) {
        // Common patterns for package extraction with named capture groups
        const patterns = [
            /import\s+.*\s+from\s+['"](?<package>[^./][^'"]*?)(['"]|\/)/,
            /import\s+['"](?<package>[^./][^'"]*?)(['"]|\/)/,
            /require\s*\(\s*['"](?<package>[^./][^'"]*?)(['"]|\/)/,
            /from\s+['"](?<package>[^./][^'"]*?)(['"]|\/)/,
            /using\s+(?<package>[A-Za-z0-9_.]+);/,
            /import\s+(?<package>[A-Za-z0-9_.]+)/,
            /include\s+['"](?<package>[^'"]*?)(['"]|\/)/,
            /use\s+(?<package>[A-Za-z0-9_:]+)/,
        ];
        // Check each pattern
        for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match && match.groups && match.groups.package) {
                // Clean up the package name (remove scope, version, etc.)
                let packageName = match.groups.package.trim();
                // Handle scoped packages like @types/node
                if (packageName.includes("/")) {
                    // If it's a scoped package, keep the whole name
                    if (packageName.startsWith("@")) {
                        return packageName;
                    }
                    // Otherwise, just take the root package name
                    packageName = packageName.split("/")[0];
                }
                return packageName;
            }
        }
        return null;
    }
    /**
     * Infer programming language from file extension or content
     * @param fileExtension The file extension (e.g., .js, .py)
     * @param fileContent Optional file content to analyze
     * @returns The inferred language
     */
    inferLanguage(fileExtension, fileContent) {
        // Normalize extension
        const ext = fileExtension.toLowerCase().replace(/^\./, "");
        // Map extensions to languages
        switch (ext) {
            case "js":
            case "jsx":
            case "mjs":
                return "javascript";
            case "ts":
            case "tsx":
                return "typescript";
            case "py":
                return "python";
            case "java":
                return "java";
            case "cs":
                return "dotnet";
            case "rb":
                return "ruby";
            case "php":
                return "php";
            case "rs":
                return "rust";
            case "go":
                return "golang";
            case "swift":
                return "swift";
            default:
                // If file content is provided, try to infer from imports
                if (fileContent) {
                    if (fileContent.includes("import React") ||
                        fileContent.includes("require(")) {
                        return "javascript";
                    }
                    if (fileContent.includes('import "fmt"')) {
                        return "golang";
                    }
                    if (fileContent.includes("using System;")) {
                        return "dotnet";
                    }
                    // Add more content-based language detection as needed
                }
                // Default to JavaScript if can't determine
                return "javascript";
        }
    }
    /**
     * Detect if user message is asking about package usage
     * @param message User's message/query
     * @returns Object containing whether this is a package query and the package name if detected
     */
    analyzeUserQuery(message) {
        // Convert to lowercase for easier matching
        const lowerMessage = message.toLowerCase();
        // Patterns that suggest the user is asking about package usage
        const usagePatterns = [
            /how\s+(?:do|can|to)\s+(?:i|we)\s+use\s+(?:the\s+)?([a-zA-Z0-9_\-@/]+)(?:\s+package|\s+library|\s+module)?/i,
            /how\s+(?:to|do\s+i|can\s+i)\s+implement\s+(?:the\s+)?([a-zA-Z0-9_\-@/]+)/i,
            /what\s+is\s+(?:the\s+)?([a-zA-Z0-9_\-@/]+)(?:\s+package|\s+library|\s+module)?/i,
            /(?:explain|documentation\s+for|docs\s+for)\s+(?:the\s+)?([a-zA-Z0-9_\-@/]+)/i,
            /help\s+(?:me\s+)?(?:with|using)\s+(?:the\s+)?([a-zA-Z0-9_\-@/]+)/i,
        ];
        // Check for language-specific requests
        const languagePatterns = [
            /(?:in|using|with)\s+(javascript|typescript|python|java|dotnet|ruby|php|rust|go|golang|swift)/i,
        ];
        // Extract package name if it matches a usage pattern
        for (const pattern of usagePatterns) {
            const match = pattern.exec(message);
            if (match && match[1]) {
                const packageName = match[1].trim();
                // Look for language in the message
                let language = null;
                for (const langPattern of languagePatterns) {
                    const langMatch = langPattern.exec(message);
                    if (langMatch && langMatch[1]) {
                        language = langMatch[1].toLowerCase();
                        break;
                    }
                }
                return {
                    isPackageQuery: true,
                    packageName,
                    language,
                };
            }
        }
        // Check for direct mentions of documentation
        if (lowerMessage.includes("documentation") ||
            lowerMessage.includes("docs") ||
            lowerMessage.includes("how to use") ||
            lowerMessage.includes("what is") ||
            lowerMessage.includes("help with")) {
            // Extract potential package names (words that look like packages)
            const words = message.split(/\s+/);
            const potentialPackage = words.find((word) => /^[a-zA-Z0-9_\-@/]+$/.test(word) &&
                word.length > 2 &&
                ![
                    "how",
                    "the",
                    "for",
                    "with",
                    "use",
                    "using",
                    "what",
                    "why",
                    "when",
                    "where",
                    "which",
                    "who",
                    "documentation",
                    "docs",
                    "implement",
                ].includes(word.toLowerCase()));
            if (potentialPackage) {
                // Look for language in the message
                let language = null;
                for (const langPattern of languagePatterns) {
                    const langMatch = langPattern.exec(message);
                    if (langMatch && langMatch[1]) {
                        language = langMatch[1].toLowerCase();
                        break;
                    }
                }
                return {
                    isPackageQuery: true,
                    packageName: potentialPackage,
                    language,
                };
            }
        }
        return { isPackageQuery: false, packageName: null, language: null };
    }
    /**
     * Fetch documentation for a package based on user context
     * @param packageName The package to fetch documentation for
     * @param fileExtension Current file extension to infer language
     * @param userMessage Optional user message for additional context
     * @returns Documentation content
     */
    async fetchPackageDocumentation(packageName, fileExtension = "", userMessage = "") {
        try {
            // Try to determine the language
            let language = this.inferLanguage(fileExtension);
            // If we have a user message, analyze it for language context
            if (userMessage) {
                const analysis = this.analyzeUserQuery(userMessage);
                if (analysis.language) {
                    language = analysis.language;
                }
            }
            console.error(`Fetching documentation for package: ${packageName} (${language})`);
            // Generate URL for the package
            const packageUrl = getPackageUrl(packageName, language);
            // Fetch documentation
            const documentationContent = await scraperService.fetchLibraryDocumentation(packageUrl);
            return documentationContent;
        }
        catch (error) {
            console.error(`Error fetching package documentation for ${packageName}:`, error);
            throw error;
        }
    }
}
// Export a singleton instance
export const cursorIntegration = new CursorIntegrationService();
