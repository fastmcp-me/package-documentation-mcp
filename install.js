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
    console.log('\nWhere would you like to install this MCP server?');
    console.log('1. Claude Desktop');
    console.log('2. Cursor IDE');
    console.log('3. Both');
    console.log('4. Skip configuration');
    
    rl.question('\nEnter your choice (1-4): ', (choice) => {
      resolve(choice);
    });
  });
}

async function main() {
  try {
    // Build the project
    console.log('📦 Building the project...');
    execSync('npm install && npm run build', { stdio: 'inherit' });
    
    // Install globally
    console.log('\n🌐 Installing the server globally...');
    try {
      execSync('npm link', { stdio: 'inherit' });
      console.log('✅ Successfully installed globally! You can now run "docs-fetcher-mcp" from anywhere.');
    } catch (error) {
      console.error('❌ Failed to install globally. You may need to run with sudo/administrator privileges.');
      console.error('Error:', error.message);
    }
    
    // Configure clients
    const clientChoice = await promptForClient();
    const configureClaudeDesktop = ['1', '3'].includes(clientChoice);
    const configureCursorIDE = ['2', '3'].includes(clientChoice);
    
    // Absolute path to the executable
    const serverPath = path.resolve(process.cwd(), 'build', 'index.js');
    
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
        config.mcpServers.docsFetcher = {
          command: 'node',
          args: [serverPath]
        };
        
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
        config.mcpServers.docsFetcher = {
          command: 'node',
          args: [serverPath]
        };
        
        // Write config
        fs.writeFileSync(cursorConfigPath, JSON.stringify(config, null, 2));
        console.log('✅ Cursor IDE configured successfully!');
        console.log(`📄 Configuration saved to: ${cursorConfigPath}`);
      } catch (error) {
        console.error('❌ Failed to configure Cursor IDE');
        console.error('Error:', error.message);
      }
    }
    
    console.log('\n🎉 Installation complete!');
    console.log('\nNext steps:');
    
    if (configureClaudeDesktop) {
      console.log('- Restart Claude Desktop to apply changes');
    }
    
    if (configureCursorIDE) {
      console.log('- Restart Cursor IDE to apply changes');
    }
    
    console.log('\nThank you for installing DocsFetcher MCP Server! 🙏');
  } catch (error) {
    console.error('❌ Installation failed:');
    console.error(error);
  } finally {
    rl.close();
  }
}

main(); 