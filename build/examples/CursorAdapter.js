/**
 * This is an example file demonstrating how Cursor IDE could integrate
 * with the documentation fetching service to provide contextual documentation.
 *
 * This is NOT actual Cursor code - just a conceptual implementation
 * showing how the integration might work.
 */
import { cursorIntegration } from "../services/CursorIntegration.js";
/**
 * Example Cursor IDE integration class
 */
export class CursorDocumentationAdapter {
    /**
     * Handle user messages in the Cursor chat to detect package documentation requests
     * @param message User's message text
     * @param currentFilePath Path of the currently open file for context
     */
    async handleUserMessage(message, currentFilePath = "") {
        // Step 1: Analyze the user's message to determine if they're asking about a package
        const analysis = cursorIntegration.analyzeUserQuery(message);
        if (!analysis.isPackageQuery || !analysis.packageName) {
            // Not a package documentation request
            return null;
        }
        // Step 2: Extract file extension from current file for language context
        const fileExtension = currentFilePath.split(".").pop() || "";
        try {
            // Step 3: Fetch the documentation with context
            const documentation = await cursorIntegration.fetchPackageDocumentation(analysis.packageName, fileExtension, message);
            // Step 4: Return the documentation for Cursor to display
            return this.formatDocumentationForCursor(analysis.packageName, documentation);
        }
        catch (error) {
            console.error("Failed to fetch documentation:", error);
            return `I couldn't find detailed documentation for ${analysis.packageName}. Would you like me to provide general information about this package based on my training data?`;
        }
    }
    /**
     * Triggered when Cursor detects an unknown import or reference in the code
     * @param importText The import statement or reference text
     * @param filePath Path of the file containing the import
     */
    async handleUnknownImport(importText, filePath) {
        // Step 1: Check if this is likely a package reference
        if (!cursorIntegration.isLikelyPackageReference(importText)) {
            return null;
        }
        // Step 2: Extract the package name
        const packageName = cursorIntegration.extractPackageName(importText);
        if (!packageName) {
            return null;
        }
        // Step 3: Get file extension for language context
        const fileExtension = filePath.split(".").pop() || "";
        try {
            // Step 4: Fetch documentation for the package
            const documentation = await cursorIntegration.fetchPackageDocumentation(packageName, fileExtension);
            // Step 5: Return the documentation for Cursor to display
            return this.formatDocumentationForCursor(packageName, documentation);
        }
        catch (error) {
            console.error(`Failed to fetch documentation for ${packageName}:`, error);
            return null;
        }
    }
    /**
     * Show a hover tooltip with package information when hovering over imports
     * @param importText The import text being hovered
     * @param filePath Path of the file
     */
    async handleHover(importText, filePath) {
        // Extract package name from the hovered text
        const packageName = cursorIntegration.extractPackageName(importText);
        if (!packageName) {
            return null;
        }
        const fileExtension = filePath.split(".").pop() || "";
        try {
            // Fetch abbreviated documentation for hover tooltip
            const documentation = await cursorIntegration.fetchPackageDocumentation(packageName, fileExtension);
            // Create a shorter hover tooltip version
            return this.formatHoverDocumentation(packageName, documentation);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Format documentation for display in Cursor
     * @param packageName The package name
     * @param documentation The raw documentation
     * @returns Formatted documentation
     */
    formatDocumentationForCursor(packageName, documentation) {
        return `# Documentation for ${packageName}

${documentation}

---
*Documentation fetched and processed from the package's official documentation.*
`;
    }
    /**
     * Format a shorter version of documentation for hover tooltips
     * @param packageName The package name
     * @param documentation The full documentation
     * @returns Short hover documentation
     */
    formatHoverDocumentation(packageName, documentation) {
        // Extract the first few paragraphs or summary
        const lines = documentation.split("\n");
        const firstParagraphs = lines.slice(0, 10).join("\n");
        return `## ${packageName}

${firstParagraphs}

...

*Hover tip: Ask me about "${packageName}" for complete documentation.*`;
    }
    /**
     * Example implementation of auto-completing imports with package information
     * @param importText Partial import text the user is typing
     * @param filePath Current file path
     */
    async provideImportCompletions(importText, filePath) {
        // This is a simplified example of how import completions might work
        if (!importText.includes("from") &&
            !importText.includes("require") &&
            !importText.includes("import")) {
            return [];
        }
        // Extract potential package name from partial import
        const match = /['"]([^'"]*?)$/.exec(importText);
        if (!match || !match[1]) {
            return [];
        }
        const partialPackageName = match[1];
        // In real implementation, this would query a package registry API
        // This is just a simplified example
        try {
            // Dummy example that simulates fetching completion suggestions
            return [
                {
                    label: partialPackageName,
                    detail: "Fetch documentation on import",
                    documentation: "Complete this import and fetch package documentation automatically",
                },
            ];
        }
        catch (error) {
            return [];
        }
    }
}
// Example usage in Cursor:
/*
// This would be in Cursor's code, not part of our library
const documentationAdapter = new CursorDocumentationAdapter();

// When user enters a chat message
cursor.on('chatMessage', async (message, context) => {
  const documentation = await documentationAdapter.handleUserMessage(
    message,
    context.currentFilePath
  );
  
  if (documentation) {
    cursor.showDocumentation(documentation);
  }
});

// When user hovers over an import
cursor.on('hover', async (hoveredText, filePath) => {
  const hoverInfo = await documentationAdapter.handleHover(hoveredText, filePath);
  
  if (hoverInfo) {
    cursor.showHoverInfo(hoverInfo);
  }
});

// When Cursor detects an unknown import
cursor.on('unknownImport', async (importText, filePath) => {
  const documentation = await documentationAdapter.handleUnknownImport(importText, filePath);
  
  if (documentation) {
    cursor.suggestDocumentation(documentation);
  }
});
*/
