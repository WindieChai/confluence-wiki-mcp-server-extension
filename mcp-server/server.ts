import express from "express";
import { Request, Response } from "express";
import { configManager } from "../extension/config-manager";
import { 
    initializeMcpServer, 
    handleSseConnection, 
    handleMessageRequest, 
    closeMcpServer
} from "./mcp-server";

let server: any; // Express server instance
let serverRunning = false; // 服务器运行状态

// 监听配置变更事件中的端口变更
configManager.on('configChanged', (config) => {
    // 如果端口变更，需要重启服务器
    if (server && serverRunning) {
        const currentPort = server.address()?.port;
        if (currentPort != config.port) {
            console.log(`Port changed from ${currentPort} to ${config.port}, restarting server...`);
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
                console.log('Server is already running');
                resolve();
                return;
            }
            
            // 初始化 MCP 服务器
            initializeMcpServer();
            
            const config = configManager.getConfig();
            const PORT = config.port || 1984;
            
            server = app.listen(PORT, () => {
                console.log(`Wiki MCP Server running on http://localhost:${PORT}`);
                console.log(`Connect to SSE endpoint at http://localhost:${PORT}/sse`);
                serverRunning = true;
                resolve();
            });
            
            // 处理服务器错误
            server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${PORT} is already in use. Please configure a different port.`);
                    reject(new Error(`Port ${PORT} is already in use`));
                } else {
                    console.error('Server error:', error);
                    reject(error);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// 重启服务器函数
function restartServer(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // 先停止服务器
            await stopServer();
            console.log('Server stopped. Restarting...');
            
            // 再启动服务器
            await startServer();
            resolve();
        } catch (error) {
            console.error('Error restarting server:', error);
            reject(error);
        }
    });
}

// 停止服务器函数
export function stopServer(): Promise<void> {
    return new Promise((resolve) => {
        if (server && serverRunning) {
            server.close(() => {
                closeMcpServer()
                console.log('Server stopped');
                server = null;
                serverRunning = false;
                resolve();
            });
        } else {
            // 如果服务器已经停止，直接返回
            serverRunning = false;
            resolve();
        }
    });
}