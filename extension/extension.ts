import * as vscode from 'vscode';
import { ConfigView } from './config-view';
import { startServer, stopServer, isServerRunning } from '../mcp-server/server';

export async function activate(context: vscode.ExtensionContext) {     
    // 注册打开配置界面的命令
    let disposable = vscode.commands.registerCommand('confluence-wiki-mcp-server-extension.openConfig', () => {
        new ConfigView(context);
    });
    context.subscriptions.push(disposable);
    
    // 启动MCP服务器
    try {
        await startServer();
        vscode.window.setStatusBarMessage('Confluence Wiki MCP Server started', 3000);
        console.log('Confluence Wiki MCP Server started');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start Confluence Wiki MCP Server: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Failed to start server:', error);
    }
}

export async function deactivate() {
    // 停止MCP服务器
    if (isServerRunning()) {
        try {
            await stopServer();
            console.log('Confluence Wiki MCP Server stopped');
        } catch (error) {
            console.error('Error stopping server:', error);
        }
    }
} 