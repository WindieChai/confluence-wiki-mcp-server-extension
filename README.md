# Confluence Wiki MCP Server Extension

A VSCode/Cursor extension providing an MCP Server for Confluence Wiki integration.

## Features

- Integrate with Confluence Wiki through MCP Server
- Easy configuration interface
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

2. **Set up MCP Server in Cursor**
   - Open Cursor's Settings
   - Navigate to "Model Context Protocol" section
   - Click "Add new MCP Server"
   - Configure the server with following information:
     - Name: Wiki
     - Type: Command
     - Command: [The path shown in Configuration page]

After completing these steps, your Cursor will be able to fetch content from your Confluence Wiki through the MCP Server.

**Note**: Make sure your Confluence Wiki credentials are correct and you have proper access permissions to the Wiki pages.
