#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { isUrl, getPackageUrl, } from "./utils/packageRepository.js";
import { scraperService } from "./services/ScraperService.js";
// Create a temporary directory for storing documentation
const DOCS_DIR = path.join(os.tmpdir(), "docs-fetcher-mcp");
// Make sure the docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}
// Create the MCP server
const server = new McpServer({
    name: "DocsFetcher",
    version: "1.0.0",
});
// Define a prompt template for summarizing library documentation
server.prompt("summarize-library-docs", {
    libraryName: z.string().describe("Name of the library to summarize"),
    documentation: z.string().describe("The raw documentation content"),
    errorStatus: z.string().optional().describe("Error status if applicable"),
}, (args) => {
    const { libraryName, documentation, errorStatus } = args;
    const hasError = errorStatus && errorStatus !== "";
    if (hasError) {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `I was trying to learn about the ${libraryName} library, but there was an error fetching the documentation: ${errorStatus}. Can you tell me what you know about it based on your training?`,
                    },
                },
            ],
        };
    }
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `I need to understand the ${libraryName} library. Here's the raw documentation:

${documentation}

Please summarize this documentation for me with:
1. A brief overview of what the library does
2. Key features and capabilities
3. Basic installation and usage examples
4. Any important API methods or patterns
5. Common use cases

Focus on the most important information that would help me understand and start using this library.`,
                },
            },
        ],
    };
});
// Define a prompt for exploring dependency errors
server.prompt("explain-dependency-error", {
    packageName: z
        .string()
        .describe("The package causing the dependency error"),
    documentation: z.string().describe("The package documentation"),
    errorStatus: z.string().optional().describe("Error status if applicable"),
}, (args) => {
    const { packageName, documentation, errorStatus } = args;
    const hasError = errorStatus && errorStatus !== "";
    if (hasError) {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `I'm getting a dependency error for the '${packageName}' package. There was an issue fetching the detailed documentation: ${errorStatus}. Can you explain what this package does, how to install it properly, and why I might be seeing an error?`,
                    },
                },
            ],
        };
    }
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `I'm getting a dependency error for the '${packageName}' package. Here's the documentation:

${documentation}

Based on this information, please:
1. Explain what this package does
2. Show me how to properly install it
3. Tell me common reasons why I might be getting a dependency error
4. Provide a simple example of how to use it correctly`,
                },
            },
        ],
    };
});
// Tool to fetch documentation from a URL
server.tool("fetch-url-docs", {
    url: z.string().url().describe("URL of the library documentation to fetch"),
}, async ({ url }) => {
    console.error(`Fetching documentation from URL: ${url}`);
    try {
        const documentationContent = await scraperService.fetchLibraryDocumentation(url);
        return {
            content: [
                {
                    type: "text",
                    text: documentationContent,
                },
            ],
        };
    }
    catch (error) {
        console.error("Error fetching URL content:", error);
        const errorMessage = `Error fetching URL content: ${error instanceof Error ? error.message : String(error)}`;
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage,
                },
            ],
            isError: true,
        };
    }
});
// Tool to fetch package documentation with language support
server.tool("fetch-package-docs", {
    packageName: z
        .string()
        .describe("Name of the package to fetch documentation for"),
    language: z
        .string()
        .optional()
        .describe("Programming language or repository type (e.g., javascript, python, java, dotnet)"),
}, async ({ packageName, language = "javascript" }) => {
    console.error(`Fetching documentation for package: ${packageName} (${language})`);
    try {
        const packageUrl = getPackageUrl(packageName, language);
        console.error(`Using package URL: ${packageUrl}`);
        const documentationContent = await scraperService.fetchLibraryDocumentation(packageUrl);
        return {
            content: [
                {
                    type: "text",
                    text: documentationContent,
                },
            ],
        };
    }
    catch (error) {
        console.error("Error fetching package content:", error);
        const errorMessage = `Error fetching package documentation: ${error instanceof Error ? error.message : String(error)}`;
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage,
                },
            ],
            isError: true,
        };
    }
});
// Tool to fetch documentation from either a package name or URL
server.tool("fetch-library-docs", {
    library: z
        .string()
        .describe("Name of the package or URL of the library documentation to fetch"),
    language: z
        .string()
        .optional()
        .describe("Programming language or repository type if providing a package name (e.g., javascript, python, java, dotnet)"),
}, async ({ library, language = "javascript" }) => {
    console.error(`Fetching documentation for library: ${library} ${language ? `(${language})` : ""}`);
    try {
        // Determine if input is a URL or package name
        const isLibraryUrl = isUrl(library);
        let url = isLibraryUrl ? library : getPackageUrl(library, language);
        const documentationContent = await scraperService.fetchLibraryDocumentation(url);
        return {
            content: [
                {
                    type: "text",
                    text: documentationContent,
                },
            ],
        };
    }
    catch (error) {
        console.error("Error fetching library documentation:", error);
        const errorMessage = `Error fetching library documentation: ${error instanceof Error ? error.message : String(error)}`;
        return {
            content: [
                {
                    type: "text",
                    text: errorMessage,
                },
            ],
            isError: true,
        };
    }
});
// Tool to fetch documentation from multiple language repositories at once
server.tool("fetch-multilingual-docs", {
    packageName: z
        .string()
        .describe("Name of the package to fetch documentation for"),
    languages: z
        .array(z.string())
        .describe("List of programming languages or repository types to check (e.g., javascript, python, java)"),
}, async ({ packageName, languages }) => {
    console.error(`Fetching documentation for package: ${packageName} across languages: ${languages.join(", ")}`);
    const results = {};
    let hasSuccessfulFetch = false;
    for (const language of languages) {
        try {
            console.error(`Trying ${language} repository...`);
            const packageUrl = getPackageUrl(packageName, language);
            const documentationContent = await scraperService.fetchLibraryDocumentation(packageUrl);
            results[language] = {
                url: packageUrl,
                success: true,
                content: documentationContent,
            };
            hasSuccessfulFetch = true;
        }
        catch (error) {
            console.error(`Error fetching ${language} documentation:`, error);
            results[language] = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    if (!hasSuccessfulFetch) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to fetch documentation for ${packageName} in any of the requested languages: ${languages.join(", ")}.`,
                },
            ],
            isError: true,
        };
    }
    // Format the successful results
    const bestLanguage = Object.keys(results).find((lang) => results[lang].success) ||
        languages[0];
    const bestContent = results[bestLanguage].content;
    // Include a summary of all language results
    const summaryLines = [
        `## Documentation Search Results for '${packageName}'`,
    ];
    summaryLines.push("");
    for (const language of languages) {
        const result = results[language];
        if (result.success) {
            summaryLines.push(`✅ **${language}**: Successfully fetched documentation from ${result.url}`);
        }
        else {
            summaryLines.push(`❌ **${language}**: Failed - ${result.error}`);
        }
    }
    summaryLines.push("");
    summaryLines.push(`---`);
    summaryLines.push("");
    summaryLines.push(`# Documentation Content (from ${bestLanguage} repository)`);
    summaryLines.push("");
    const summary = summaryLines.join("\n");
    const completeContent = summary + bestContent;
    return {
        content: [
            {
                type: "text",
                text: completeContent,
            },
        ],
    };
});
// Create the transport and start the server
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
