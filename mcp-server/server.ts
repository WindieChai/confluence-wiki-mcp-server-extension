import express from "express";
import { Request, Response } from "express";
import { configManager } from "../extension/config-manager";
import { 
    initializeMcpServer, 
    handleSseConnection, 
    handleMessageRequest, 
    closeMcpServer
} from "./mcp-server";
import * as output from "../extension/output";

let server: any; // Express server instance
let serverRunning = false; // 服务器运行状态

// 监听配置变更事件中的端口变更
configManager.on('configChanged', (config) => {
    // 如果端口变更，需要重启服务器
    if (server && serverRunning) {
        const currentPort = server.address()?.port;
        if (currentPort != config.port) {
            output.info(`Port changed from ${currentPort} to ${config.port}, restarting server...`);
            restartServer();
        }
    }
});

const app = express();

app.get("/sse", async (req: Request, res: Response) => {
    await handleSseConnection(res);
});

app.post("/messages", async (req: Request, res: Response) => {
    await handleMessageRequest(req, res);
});

/**
 * 获取服务器运行状态
 * @returns 服务器是否正在运行
 */
export function isServerRunning(): boolean {
    return serverRunning;
}

// 启动服务器函数
export function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            // 如果服务器已经在运行，直接返回
            if (serverRunning) {
                output.info('Server is already running');
                resolve();
                return;
            }
            
            // 初始化 MCP 服务器
            initializeMcpServer();
            
            const config = configManager.getConfig();
            const PORT = config.port || 1984;
            
            server = app.listen(PORT, () => {
                output.info(`Wiki MCP Server running on http://localhost:${PORT}`);
                output.info(`Connect to SSE endpoint at http://localhost:${PORT}/sse`);
                serverRunning = true;
                resolve();
            });
            
            // 处理服务器错误
            server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    const errorMsg = `Port ${PORT} is already in use. Please configure a different port.`;
                    output.error(errorMsg, error);
                    reject(new Error(errorMsg));
                } else {
                    output.error('Server error', error);
                    reject(error);
                }
            });
        } catch (error) {
            output.error('Error starting server', error);
            reject(error);
        }
    });
}

// 重启服务器函数
export function restartServer(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // 先停止服务器
            await stopServer();
            output.info('Server stopped. Restarting...');
            
            // 再启动服务器
            await startServer();
            resolve();
        } catch (error) {
            output.error('Error restarting server', error);
            reject(error);
        }
    });
}

// 停止服务器函数
export function stopServer(): Promise<void> {
    return new Promise(async (resolve) => {
        if (server && serverRunning) {
            server.close(async () => {
                output.info('Express server stopped');
                server = null;
                serverRunning = false;
                
                // 关闭 MCP 服务器
                await closeMcpServer();
                
                resolve();
            });
        } else {
            // 如果服务器已经停止，直接返回
            serverRunning = false;
            resolve();
        }
    });
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
    startServer().catch(error => {
        output.error('Failed to start server', error);
        process.exit(1);
    });
}