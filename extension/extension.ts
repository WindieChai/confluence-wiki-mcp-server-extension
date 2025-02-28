import * as vscode from 'vscode';
import { ConfigView } from './config-view';
import { startServer, stopServer, isServerRunning } from '../mcp-server/server';
import * as output from './output';

export async function activate(context: vscode.ExtensionContext) {  
    output.info('Confluence Wiki MCP Server Extension is now active');
    
    // 注册打开配置界面的命令
    let disposable = vscode.commands.registerCommand('confluence-wiki-mcp-server-extension.openConfig', () => {
        new ConfigView(context);
        output.info('Configuration view opened');
    });
    context.subscriptions.push(disposable);
    
    // 启动MCP服务器
    try {
        output.info('Starting MCP server...');
        await startServer();
        vscode.window.setStatusBarMessage('Confluence Wiki MCP Server started', 3000);
        output.info('Confluence Wiki MCP Server started successfully');
    } catch (error) {
        output.error('Failed to start Confluence Wiki MCP Server', error);
        vscode.window.showErrorMessage(`Failed to start Confluence Wiki MCP Server: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function deactivate() {
    // 停止MCP服务器
    if (isServerRunning()) {
        try {
            output.info('Stopping MCP server...');
            await stopServer();
            output.info('Confluence Wiki MCP Server stopped successfully');
        } catch (error) {
            output.error('Error stopping server', error);
        }
    }
    
    // 关闭输出通道
    output.dispose();
} 