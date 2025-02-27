#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get the current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 DocsFetcher MCP Server Installer\n');

async function promptForClient() {
  return new Promise((resolve) => {
    console.log('\nWhere would you like to configure this MCP server?');
    console.log('1. Claude Desktop');
    console.log('2. Cursor IDE');
    console.log('3. Both');
    console.log('4. Skip configuration');
    
    rl.question('\nEnter your choice (1-4): ', (choice) => {
      resolve(choice);
    });
  });
}

async function promptForInstallationType() {
  return new Promise((resolve) => {
    console.log('\nHow would you like to configure the MCP server?');
    console.log('1. Use Smithery deployment (recommended)');
    console.log('2. Use local npm installation');
    
    rl.question('\nEnter your choice (1-2): ', (choice) => {
      resolve(choice);
    });
  });
}

async function main() {
  try {
    // Configure clients
    const clientChoice = await promptForClient();
    const configureClaudeDesktop = ['1', '3'].includes(clientChoice);
    const configureCursorIDE = ['2', '3'].includes(clientChoice);
    
    if (clientChoice === '4') {
      console.log('\n⏭️ Skipping configuration...');
      rl.close();
      return;
    }
    
    const installationType = await promptForInstallationType();
    const useSmithery = installationType === '1';
    
    // Configure Claude Desktop
    if (configureClaudeDesktop) {
      console.log('\n🔧 Configuring Claude Desktop...');
      const claudeConfigDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
      const claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
      
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(claudeConfigDir)) {
          fs.mkdirSync(claudeConfigDir, { recursive: true });
        }
        
        // Read existing config or create new one
        let config = { mcpServers: {} };
        if (fs.existsSync(claudeConfigPath)) {
          config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
          if (!config.mcpServers) config.mcpServers = {};
        }
        
        // Add our server
        if (useSmithery) {
          config.mcpServers.docsFetcher = {
            url: "https://smithery.ai/server/@cdugo/mcp-get-docs/tools"
          };
        } else {
          config.mcpServers.docsFetcher = {
            command: "npx",
            args: [
              "-y",
              "@smithery/cli@latest",
              "run",
              "@cdugo/mcp-get-docs",
              "--config",
              "'{}'",
            ]
          };
        }
        
        // Write config
        fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
        console.log('✅ Claude Desktop configured successfully!');
        console.log(`📄 Configuration saved to: ${claudeConfigPath}`);
      } catch (error) {
        console.error('❌ Failed to configure Claude Desktop');
        console.error('Error:', error.message);
      }
    }
    
    // Configure Cursor IDE
    if (configureCursorIDE) {
      console.log('\n🔧 Configuring Cursor IDE...');
      const cursorConfigDir = path.join(os.homedir(), '.cursor');
      const cursorConfigPath = path.join(cursorConfigDir, 'cursor_config.json');
      
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(cursorConfigDir)) {
          fs.mkdirSync(cursorConfigDir, { recursive: true });
        }
        
        // Read existing config or create new one
        let config = { mcpServers: {} };
        if (fs.existsSync(cursorConfigPath)) {
          config = JSON.parse(fs.readFileSync(cursorConfigPath, 'utf8'));
          if (!config.mcpServers) config.mcpServers = {};
        }
        
        // Add our server
        if (useSmithery) {
          config.mcpServers.docsFetcher = {
            url: "https://smithery.ai/server/@cdugo/mcp-get-docs/tools"
          };
        } else {
          config.mcpServers.docsFetcher = {
            command: "npx",
            args: [
              "-y",
              "@smithery/cli@latest",
              "run",
              "@cdugo/mcp-get-docs",
              "--config",
              "'{}'",
            ]
          };
        }
        
        // Write config
        fs.writeFileSync(cursorConfigPath, JSON.stringify(config, null, 2));
        console.log('✅ Cursor IDE configured successfully!');
        console.log(`📄 Configuration saved to: ${cursorConfigPath}`);
      } catch (error) {
        console.error('❌ Failed to configure Cursor IDE');
        console.error('Error:', error.message);
      }
    }
    
    console.log('\n🎉 Configuration complete!');
    console.log('\nNext steps:');
    
    if (configureClaudeDesktop) {
      console.log('- Restart Claude Desktop to apply changes');
    }
    
    if (configureCursorIDE) {
      console.log('- Restart Cursor IDE to apply changes');
    }
    
    console.log('\nThank you for installing DocsFetcher MCP Server! 🙏');
  } catch (error) {
    console.error('❌ Configuration failed:');
    console.error(error);
  } finally {
    rl.close();
  }
}

main(); 