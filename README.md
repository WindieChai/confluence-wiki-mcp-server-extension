# Confluence Wiki MCP Server Extension

A VSCode/Cursor extension providing an MCP Server for Confluence Wiki integration.

## Features

- Integrate with Confluence Wiki through MCP Server
- Easy configuration interface with secure credential storage
- Convert Wiki content to Markdown format

## How to Use

1. **Configure Confluence Wiki Connection**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Type "Confluence Wiki MCP Server: Configuration" and select it
   - In the configuration page, enter your:
     - Confluence Wiki Host URL
     - Username
     - Password
   - Click "Save Configuration" button
   - Your credentials will be securely stored in an encrypted file

2. **Set up MCP Server in Cursor**
   - Open Cursor's Settings
   - Navigate to "Model Context Protocol" section
   - Click "Add new MCP Server"
   - Configure the server with following information:
     - Name: Wiki
     - Type: Command
     - Command: [The path shown in Configuration page]

3. **Using the Wiki MCP Tool in Cursor**
   - Open a chat with Claude or another AI model in Cursor
   - Switch to "Edit" or "Agent" mode for best results
   - In your prompt, include the Wiki URL and any specific requirements, for example:
     ```
     Please summarize the content from this Confluence Wiki page: 
     https://your-wiki-url
     ```
   - Send your message
   - Cursor will recognize the Wiki URL and prompt you to call this MCP Tool
   - Click "Run tool" when prompted
   - The extension will fetch the content, convert it to Markdown, and provide it to the AI model
   - The AI will then respond based on the Wiki content

After completing these steps, your Cursor will be able to fetch content from your Confluence Wiki through the MCP Server.

**Note**: Your credentials are stored securely in an encrypted file and are never exposed in VSCode settings.
