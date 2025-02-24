import * as vscode from 'vscode';
import * as path from 'path';
import { configManager } from './config-manager';

// TODO：implement as a form
function showMcpServerInfo(context: vscode.ExtensionContext) {
    const serverPath = path.join(context.extensionPath, 'dist', 'mcp-server', 'index.js');
    
    vscode.window.showInformationMessage(
        `MCP Server Configuration:
        Name: Wiki
        Type: Command
        Command: node ${serverPath}`
    );
}

export function activate(context: vscode.ExtensionContext) {    
    configManager.initialize(vscode.workspace);
    // 显示MCP Server信息
    showMcpServerInfo(context);
}

export function deactivate() {} 