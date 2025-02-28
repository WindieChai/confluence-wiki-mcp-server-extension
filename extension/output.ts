import * as vscode from 'vscode';

// 创建输出通道
export const outputChannel = vscode.window.createOutputChannel('Confluence Wiki MCP Server');

/**
 * 获取带时间戳的日志前缀
 * @returns 格式化的时间戳前缀
 */
function getTimestampPrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 记录信息日志
 * @param message 日志消息
 */
export function info(message: string): void {
    const timestamp = getTimestampPrefix();
    outputChannel.appendLine(`${timestamp} [info] ${message}`);
    console.log(`${timestamp} [info] ${message}`);
}

/**
 * 记录错误日志
 * @param message 错误消息
 * @param error 错误对象（可选）
 */
export function error(message: string, error?: any): void {
    const timestamp = getTimestampPrefix();
    const errorMessage = error ? `${message}: ${error.message || error}` : message;
    
    outputChannel.appendLine(`${timestamp} [error] ${errorMessage}`);
    
    // 如果有错误堆栈，也记录下来
    if (error && error.stack) {
        outputChannel.appendLine(`${timestamp} [error] ${error.stack}`);
    }
    
    console.error(`${timestamp} [error] ${errorMessage}`);
}

/**
 * 记录警告日志
 * @param message 警告消息
 */
export function warn(message: string): void {
    const timestamp = getTimestampPrefix();
    outputChannel.appendLine(`${timestamp} [warn] ${message}`);
    console.warn(`${timestamp} [warn] ${message}`);
}

/**
 * 记录调试日志
 * @param message 调试消息
 */
export function debug(message: string): void {
    const timestamp = getTimestampPrefix();
    outputChannel.appendLine(`${timestamp} [debug] ${message}`);
    console.debug(`${timestamp} [debug] ${message}`);
}

/**
 * 显示输出面板
 */
export function show(): void {
    outputChannel.show();
}

/**
 * 清空输出面板
 */
export function clear(): void {
    outputChannel.clear();
}

/**
 * 关闭输出通道
 */
export function dispose(): void {
    outputChannel.dispose();
}