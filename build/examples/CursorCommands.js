/**
 * Example implementation of Cursor command-line style commands
 * for explicitly requesting package documentation.
 *
 * This is a conceptual example showing how Cursor could implement
 * commands like /docs or /package to trigger documentation fetching.
 */
import { cursorIntegration } from "../services/CursorIntegration.js";
/**
 * Example class for Cursor documentation commands
 */
export class CursorDocumentationCommands {
    /**
     * Process a command-style message like "/docs express" or "/package react python"
     * @param commandText The full command text
     * @param currentFilePath Current file path for context
     */
    async processCommand(commandText, currentFilePath = "") {
        // Normalize command text
        const trimmedCommand = commandText.trim();
        // Check if it's a documentation command
        if (this.isDocsCommand(trimmedCommand)) {
            return this.handleDocsCommand(trimmedCommand, currentFilePath);
        }
        // Check if it's a package command
        if (this.isPackageCommand(trimmedCommand)) {
            return this.handlePackageCommand(trimmedCommand, currentFilePath);
        }
        // Not a documentation-related command
        return null;
    }
    /**
     * Check if the command is a documentation command
     * @param command The command text
     * @returns True if this is a docs command
     */
    isDocsCommand(command) {
        return (command.startsWith("/docs ") ||
            command.startsWith("/documentation ") ||
            command.startsWith("/help "));
    }
    /**
     * Check if the command is a package command
     * @param command The command text
     * @returns True if this is a package command
     */
    isPackageCommand(command) {
        return (command.startsWith("/package ") ||
            command.startsWith("/pkg ") ||
            command.startsWith("/lib "));
    }
    /**
     * Handle a docs command like "/docs express"
     * @param command The command text
     * @param currentFilePath Current file path
     * @returns Documentation text or null
     */
    async handleDocsCommand(command, currentFilePath) {
        // Parse the command to extract package name and optional language
        const parts = command.split(" ").filter((part) => part.trim().length > 0);
        if (parts.length < 2) {
            return "Usage: /docs package_name [language]";
        }
        // Extract package name (required) and language (optional)
        const packageName = parts[1];
        const fileExtension = currentFilePath.split(".").pop() || "";
        // Check if a specific language was provided
        let language = null;
        if (parts.length >= 3) {
            language = parts[2];
        }
        try {
            // Fetch documentation
            const documentation = await cursorIntegration.fetchPackageDocumentation(packageName, fileExtension, language ? `using ${language}` : "");
            return this.formatDocumentationResponse(packageName, documentation);
        }
        catch (error) {
            console.error(`Error fetching documentation for ${packageName}:`, error);
            return `Failed to fetch documentation for ${packageName}. Please check the package name and try again.`;
        }
    }
    /**
     * Handle a package command like "/package react python"
     * This demonstrates multi-language fetching
     * @param command The command text
     * @param currentFilePath Current file path
     * @returns Documentation text or null
     */
    async handlePackageCommand(command, currentFilePath) {
        // Parse the command
        const parts = command.split(" ").filter((part) => part.trim().length > 0);
        if (parts.length < 2) {
            return "Usage: /package package_name [language1 language2 ...]";
        }
        // First part after command is the package name
        const packageName = parts[1];
        // All remaining parts are languages to search
        const languages = parts.slice(2);
        // If no languages specified, infer from file extension
        if (languages.length === 0) {
            const fileExtension = currentFilePath.split(".").pop() || "";
            const language = cursorIntegration.inferLanguage(fileExtension);
            languages.push(language);
        }
        try {
            // In a real implementation, we would fetch from multiple languages
            // For this example, we'll just fetch from the first language
            const documentation = await cursorIntegration.fetchPackageDocumentation(packageName, "", `using ${languages[0]}`);
            return this.formatDocumentationResponse(packageName, documentation);
        }
        catch (error) {
            console.error(`Error fetching documentation for ${packageName}:`, error);
            return `Failed to fetch documentation for ${packageName}. Please check the package name and try again.`;
        }
    }
    /**
     * Format the documentation response for display
     * @param packageName Package name
     * @param documentation Raw documentation
     * @returns Formatted documentation
     */
    formatDocumentationResponse(packageName, documentation) {
        return `# Documentation for ${packageName}

${documentation}

---
*Use '/docs packageName language' to get documentation for a specific language implementation.*`;
    }
}
// Example usage in Cursor:
/*
// This would be in Cursor's code
const docCommands = new CursorDocumentationCommands();

// When user enters a command in chat
cursor.on('chatInput', async (input, context) => {
  if (input.startsWith('/')) {
    const result = await docCommands.processCommand(input, context.currentFilePath);
    
    if (result) {
      // This is a documentation command, display the result
      cursor.displayDocumentation(result);
      return; // Prevent default command processing
    }
  }
  
  // Continue with normal command/chat processing
  cursor.processNormalInput(input);
});
*/
