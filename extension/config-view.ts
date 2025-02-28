import * as vscode from 'vscode';
import { configManager } from './config-manager';
import * as output from './output';

export class ConfigView {
    private readonly _view: vscode.WebviewPanel;

    constructor(context: vscode.ExtensionContext) {
        output.debug('Creating ConfigView');
        this._view = this.createWebviewPanel(context);
        this.updateContent();
        output.debug('ConfigView created');
    }

    private createWebviewPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
        output.debug('Creating webview panel');
        const panel = vscode.window.createWebviewPanel(
            'confluenceWikiConfig',
            'Confluence Wiki Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            context.subscriptions
        );

        return panel;
    }

    private updateContent() {
        output.debug('Updating webview content');
        const config = configManager.getConfig();
        const serverPath = 'http://localhost:' + config.port + '/sse';

        this._view.webview.html = this.getWebviewContent(config, serverPath);
    }

    private getWebviewContent(config: any, serverPath: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    :root {
                        --input-padding-vertical: 4px;
                        --input-padding-horizontal: 6px;
                        --input-margin-vertical: 4px;
                        --input-margin-horizontal: 0;
                    }
                    body {
                        padding: 10px 20px;
                        color: var(--vscode-foreground);
                        font-size: var(--vscode-font-size);
                        font-weight: var(--vscode-font-weight);
                        font-family: var(--vscode-font-family);
                    }
                    .section {
                        margin-bottom: 24px;
                        padding: 10px;
                        background: var(--vscode-editor-background);
                    }
                    .form-group {
                        margin-bottom: 16px;
                    }
                    label {
                        display: block;
                        margin-bottom: 4px;
                        color: var(--vscode-input-foreground);
                    }
                    input {
                        width: 100%;
                        padding: var(--input-padding-vertical) var(--input-padding-horizontal);
                        margin: var(--input-margin-vertical) var(--input-margin-horizontal);
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    button {
                        padding: 6px 14px;
                        color: var(--vscode-button-foreground);
                        background: var(--vscode-button-background);
                        border: none;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .info-item {
                        margin: 8px 0;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="section">
                    <h2>Confluence Wiki Connection</h2>
                    <div class="form-group">
                        <label>Host:</label>
                        <input type="text" id="host" value="${config.host || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Username:</label>
                        <input type="text" id="username" value="${config.username || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="password" value="${config.password || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Port:</label>
                        <input type="number" id="port" value="${config.port || ''}" />
                    </div>
                    <button onclick="saveConfig()">Save Configuration</button>
                </div>

                <div class="section">
                    <h2>MCP Server Configuration</h2>
                    <div class="info-item">In Cursor's MCP configuration, click "Add new MCP Server" and configure it with the following information.</div>
                    <div class="form-group">
                        <label>Name:</label>
                        <span>Wiki</span>
                    </div>
                    <div class="form-group">
                        <label>Type:</label>
                        <span>sse</span>
                    </div>  
                    <div class="form-group">
                        <label>Server URL:</label>
                        <span>${serverPath}</span>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    function saveConfig() {
                        const config = {
                            host: document.getElementById('host').value,
                            username: document.getElementById('username').value,
                            password: document.getElementById('password').value,
                            port: document.getElementById('port').value
                        };
                        vscode.postMessage({ command: 'saveConfig', config });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private async handleMessage(message: any) {
        output.debug(`Received message: ${message.command}`);
        switch (message.command) {
            case 'saveConfig':
                try {
                    await configManager.setConfig(message.config);
                    vscode.window.showInformationMessage('Configuration saved successfully');
                    output.info('Configuration saved via UI');
                    this.updateContent(); // 刷新显示
                } catch (error) {
                    output.error('Error saving configuration', error);
                    vscode.window.showErrorMessage('Failed to save configuration');
                }
                break;
            default:
                output.warn(`Unknown command: ${message.command}`);
        }
    }
} 