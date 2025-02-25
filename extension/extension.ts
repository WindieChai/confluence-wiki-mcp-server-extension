import * as vscode from 'vscode';
import * as path from 'path';
import { configManager } from './config-manager';
import { ConfigView } from './config-view';

export function activate(context: vscode.ExtensionContext) {    
    configManager.initialize(vscode.workspace);
    
    // 注册打开配置界面的命令
    let disposable = vscode.commands.registerCommand('confluence-wiki-mcp-server-extension.openConfig', () => {
        new ConfigView(context);
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {} 