#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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
server.prompt(
  "summarize-library-docs",
  {
    libraryName: z.string().describe("Name of the library to summarize"),
    documentation: z.string().describe("The raw documentation content"),
    errorStatus: z.string().optional().describe("Error status if applicable"),
  },
  (args) => {
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
  }
);

// Define a prompt for exploring dependency errors
server.prompt(
  "explain-dependency-error",
  {
    packageName: z
      .string()
      .describe("The package causing the dependency error"),
    documentation: z.string().describe("The package documentation"),
    errorStatus: z.string().optional().describe("Error status if applicable"),
  },
  (args) => {
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
  }
);

// Utility function to detect if a string is a URL
function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to get npm package documentation URL
function getNpmPackageUrl(packageName: string): string {
  return `https://www.npmjs.com/package/${packageName}`;
}

// Function to get GitHub repo URL for an npm package
async function getGitHubRepoUrl(packageName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    const data = (await response.json()) as any;

    // Try to get GitHub URL from repository field
    if (
      data.repository &&
      typeof data.repository === "object" &&
      data.repository.url
    ) {
      const repoUrl = data.repository.url;
      if (repoUrl.includes("github.com")) {
        return repoUrl
          .replace("git+", "")
          .replace("git://", "https://")
          .replace(".git", "");
      }
    }

    // Try to get GitHub URL from homepage field
    if (
      data.homepage &&
      typeof data.homepage === "string" &&
      data.homepage.includes("github.com")
    ) {
      return data.homepage;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching GitHub repo URL for ${packageName}:`, error);
    return null;
  }
}

// Function to fetch and extract content from a URL
async function fetchUrlContent(url: string, maxPages = 5): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Parse HTML using cheerio
    const $ = cheerio.load(html);

    // Remove script and style elements
    $("script, style, noscript, iframe").remove();

    // Extract relevant content
    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content") || "";

    // Try to extract package name and version if npm URL
    let packageInfo = "";
    if (url.includes("npmjs.com/package/")) {
      const packageName = url.split("/package/")[1].split("/")[0];
      const versionElement = $(".f4.fw6.mb3").text() || "";
      packageInfo = `\n**Package:** ${packageName}\n**Version:** ${versionElement.trim()}\n\n`;
    }

    // Extract main content
    const mainContent =
      $("main, article, .readme, .content, .documentation, #readme").html() ||
      "";

    // Extract text from body if no main content found
    const bodyText = mainContent || $("body").text();

    // Compile the documentation with clear sections and instructions for the LLM
    let result = `# ${title}\n\n`;

    result += `## 📝 Documentation Summary Request\n\n`;
    result += `This is raw documentation that needs to be summarized. Please process this information into a concise, helpful summary for the user.\n\n`;

    result += `## 📋 Metadata\n\n`;
    result += `Source URL: ${url}\n`;
    if (description) {
      result += `Description: ${description}\n`;
    }
    result += packageInfo;

    result += `## 📚 Content\n\n`;
    result += bodyText;

    // If this is an npm page, try to fetch GitHub repo as well
    if (url.includes("npmjs.com/package/")) {
      const packageName = url.split("/package/")[1].split("/")[0];
      result += `\n\n## 💻 API and Usage\n\n`;

      // Try to extract API information from the page
      const apiSection =
        $("#api, #usage, #documentation, section:contains('API')").html() || "";
      if (apiSection) {
        result += apiSection;
      }

      const githubUrl = await getGitHubRepoUrl(packageName);
      if (githubUrl) {
        result += `\n\n## 🔗 GitHub Repository\n\n`;
        result += `Repository: ${githubUrl}\n\n`;

        // Add a note about fetching the README from GitHub
        try {
          const githubResponse = await fetch(
            `${githubUrl}/raw/master/README.md`
          );
          if (githubResponse.ok) {
            const readmeText = await githubResponse.text();
            result += `### README.md\n\n${readmeText}\n\n`;
          } else {
            // Try main branch instead of master
            const mainBranchResponse = await fetch(
              `${githubUrl}/raw/main/README.md`
            );
            if (mainBranchResponse.ok) {
              const readmeText = await mainBranchResponse.text();
              result += `### README.md\n\n${readmeText}\n\n`;
            }
          }
        } catch (error) {
          console.error(`Error fetching GitHub README:`, error);
        }

        // Try to fetch examples
        try {
          const examplesResponse = await fetch(
            `${githubUrl}/raw/master/examples`
          );
          if (examplesResponse.ok) {
            result += `\n\n## 🔍 Examples\n\n`;
            result += `Examples available at: ${githubUrl}/tree/master/examples\n\n`;
          }
        } catch (error) {
          // Don't need to show this error
        }
      }
    }

    // Add instructions for the LLM at the end
    result += `\n\n## 📌 Instructions for Summarization\n\n`;
    result += `1. Provide a concise overview of what this library/package does\n`;
    result += `2. Highlight key features and functionality\n`;
    result += `3. Include basic usage examples when available\n`;
    result += `4. Format the response for readability\n`;
    result += `5. If any part of the documentation is unclear, mention this\n`;
    result += `6. Include installation instructions if available\n`;

    return result;
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return `Error fetching documentation from ${url}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

// Tool to fetch documentation from a URL
server.tool(
  "fetch-url-docs",
  {
    url: z.string().url().describe("URL of the library documentation to fetch"),
  },
  async ({ url }) => {
    console.error(`Fetching documentation from URL: ${url}`);

    try {
      const documentationContent = await fetchUrlContent(url);

      // Extract library name from URL
      let libraryName = url;
      if (url.includes("npmjs.com/package/")) {
        libraryName = url.split("/package/")[1].split("/")[0];
      } else if (url.includes("github.com")) {
        const parts = url.split("github.com/")[1].split("/");
        if (parts.length >= 2) {
          libraryName = parts[1];
        }
      }

      // Include instructions for using the prompt
      const promptInstructions = `
---

🔍 For better summarization, use the "summarize-library-docs" prompt with:
- libraryName: "${libraryName}"
- documentation: <the content above>

Example: @summarize-library-docs with libraryName="${libraryName}"
      `;

      return {
        content: [
          {
            type: "text",
            text: documentationContent + promptInstructions,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching URL content:", error);

      // Extract library name from URL
      let libraryName = url;
      if (url.includes("npmjs.com/package/")) {
        libraryName = url.split("/package/")[1].split("/")[0];
      } else if (url.includes("github.com")) {
        const parts = url.split("github.com/")[1].split("/");
        if (parts.length >= 2) {
          libraryName = parts[1];
        }
      }

      const errorMessage = `Error fetching URL content: ${
        error instanceof Error ? error.message : String(error)
      }`;

      // Include error-specific prompt instructions
      const promptInstructions = `
---

🔍 For information about this library despite the fetch error, use the "summarize-library-docs" prompt with:
- libraryName: "${libraryName}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @summarize-library-docs with libraryName="${libraryName}" and errorStatus="fetch failed"
      `;

      return {
        content: [
          {
            type: "text",
            text: errorMessage + promptInstructions,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool to fetch npm package documentation
server.tool(
  "fetch-package-docs",
  {
    packageName: z
      .string()
      .describe("Name of the npm package to fetch documentation for"),
  },
  async ({ packageName }) => {
    console.error(`Fetching documentation for package: ${packageName}`);

    try {
      const packageUrl = getNpmPackageUrl(packageName);
      console.error(`Using package URL: ${packageUrl}`);

      const documentationContent = await fetchUrlContent(packageUrl);

      // Include instructions for using the prompt
      const promptInstructions = `
---

🔍 For better summarization, use the "summarize-library-docs" prompt with:
- libraryName: "${packageName}"
- documentation: <the content above>

Example: @summarize-library-docs with libraryName="${packageName}"

🔧 If you're seeing a dependency error, use the "explain-dependency-error" prompt:
- packageName: "${packageName}" 
- documentation: <the content above>

Example: @explain-dependency-error with packageName="${packageName}"
      `;

      return {
        content: [
          {
            type: "text",
            text: documentationContent + promptInstructions,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching package content:", error);

      const errorMessage = `Error fetching package documentation: ${
        error instanceof Error ? error.message : String(error)
      }`;

      // Include error-specific prompt instructions
      const promptInstructions = `
---

🔍 For information about this package despite the fetch error, use the "summarize-library-docs" prompt with:
- libraryName: "${packageName}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @summarize-library-docs with libraryName="${packageName}" and errorStatus="fetch failed"

🔧 If you're seeing a dependency error, use the "explain-dependency-error" prompt:
- packageName: "${packageName}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @explain-dependency-error with packageName="${packageName}" and errorStatus="fetch failed"
      `;

      return {
        content: [
          {
            type: "text",
            text: errorMessage + promptInstructions,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool to fetch documentation from either a package name or URL
server.tool(
  "fetch-library-docs",
  {
    library: z
      .string()
      .describe(
        "Name of the npm package or URL of the library documentation to fetch"
      ),
  },
  async ({ library }) => {
    console.error(`Fetching documentation for library: ${library}`);

    try {
      // Determine if input is a URL or package name
      const isLibraryUrl = isUrl(library);
      let documentationContent;
      let libraryName = library;

      if (isLibraryUrl) {
        documentationContent = await fetchUrlContent(library);

        // Try to extract library name from URL
        if (library.includes("npmjs.com/package/")) {
          libraryName = library.split("/package/")[1].split("/")[0];
        } else if (library.includes("github.com")) {
          const parts = library.split("github.com/")[1].split("/");
          if (parts.length >= 2) {
            libraryName = parts[1];
          }
        }
      } else {
        // Convert package name to URL
        const packageUrl = getNpmPackageUrl(library);
        console.error(`Using package URL: ${packageUrl}`);

        documentationContent = await fetchUrlContent(packageUrl);
        libraryName = library;
      }

      // Include instructions for using the prompt
      const promptInstructions = `
---

🔍 For better summarization, use the "summarize-library-docs" prompt with:
- libraryName: "${libraryName}"
- documentation: <the content above>

Example: @summarize-library-docs with libraryName="${libraryName}"

🔧 If you're seeing a dependency error, use the "explain-dependency-error" prompt:
- packageName: "${libraryName}" 
- documentation: <the content above>

Example: @explain-dependency-error with packageName="${libraryName}"
      `;

      return {
        content: [
          {
            type: "text",
            text: documentationContent + promptInstructions,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching library documentation:", error);

      const errorMessage = `Error fetching library documentation: ${
        error instanceof Error ? error.message : String(error)
      }`;

      // Include error-specific prompt instructions
      const promptInstructions = `
---

🔍 For information about this library despite the fetch error, use the "summarize-library-docs" prompt with:
- libraryName: "${library}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @summarize-library-docs with libraryName="${library}" and errorStatus="fetch failed"

🔧 If you're seeing a dependency error, use the "explain-dependency-error" prompt:
- packageName: "${library}"
- errorStatus: "${error instanceof Error ? error.message : String(error)}"

Example: @explain-dependency-error with packageName="${library}" and errorStatus="fetch failed"
      `;

      return {
        content: [
          {
            type: "text",
            text: errorMessage + promptInstructions,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("DocsFetcher MCP Server running on stdio");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Uncaught error:", error);
  process.exit(1);
});
