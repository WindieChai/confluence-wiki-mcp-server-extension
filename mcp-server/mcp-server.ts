import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { ConfluenceClient } from "confluence.js";
import { configManager, ExtensionConfig } from "../extension/config-manager";
import TurndownService from 'turndown';
import { Request, Response } from "express";
import * as output from "../extension/output";

// MCP 服务器实例
let mcpServer: McpServer;
// Confluence 客户端实例
let confluence: ConfluenceClient;
// SSE 传输实例
let transport: SSEServerTransport;

// 创建 turndown 实例，配置转换选项
const turndownService = new TurndownService({
    headingStyle: 'atx',      // # 风格的标题
    hr: '---',                // 水平线
    bulletListMarker: '-',    // 无序列表使用 -
    codeBlockStyle: 'fenced', // 使用 ``` 风格的代码块
    emDelimiter: '_'          // 使用 _ 作为斜体标记
});

// 配置额外的转换规则
turndownService.addRule('confluenceMetadata', {
    filter: ['div', 'span'],
    replacement: function(content, node) {
        // 移除一些 Confluence 特有的元数据 div
        // @ts-ignore: 使用类型断言处理 DOM 节点
        if (node && node.classList && (
            // @ts-ignore: 使用类型断言处理 DOM 节点
            node.classList.contains('confluence-metadata') ||
            // @ts-ignore: 使用类型断言处理 DOM 节点
            node.classList.contains('confluence-information-macro')
        )) {
            return '';
        }
        return content;
    }
});

/**
 * 初始化 Confluence 客户端
 * @param config 扩展配置
 */
function initializeConfluenceClient(config: ExtensionConfig) {
    try {
        confluence = new ConfluenceClient({
            host: config.host,
            apiPrefix: '/rest',
            authentication: {
                basic: {
                    username: config.username,
                    password: config.password,
                }
            },
        });
        output.info(`Confluence client initialized with host: ${config.host}`);
    } catch (error) {
        output.error('Error initializing Confluence client', error);
    }
}

// 监听配置变更事件
configManager.on('configChanged', (config) => {
    output.info('Config changed, reinitializing Confluence client');
    initializeConfluenceClient(config);
});

/**
 * 获取 Wiki 内容的工具函数
 */
async function getWikiContent({ url }: { url: string }) {
    try {
        if (!confluence) {
            throw new Error("Confluence client is not initialized");
        }
        
        const urlParams = new URL(url).searchParams;
        const pageId = urlParams.get('pageId');
        if (!pageId) {
            throw new Error('Invalid URL: pageId parameter is missing');
        }
        
        output.debug(`Fetching page with ID: ${pageId}`);
        
        const response = await confluence.content.getContentById({
            id: pageId,
            expand: ["body.view"],
            status: ["current"]
        });

        if (!response || !response.body || !response.body.view || !response.body.view.value) {
            output.warn(`Failed to retrieve content for page ID: ${pageId}`);
            return {
                content: [{
                    type: "text" as const,
                    text: "Failed to retrieve page content"
                }],
            };
        }

        // 将HTML转换为Markdown
        output.debug(`Converting HTML to Markdown for page ID: ${pageId}`);
        const markdown = turndownService.turndown(response.body.view.value);

        return {
            content: [{
                type: "text" as const,
                text: markdown
            }],
        };
    } catch (error) {
        output.error("Error fetching page", error);
        return {
            content: [{
                type: "text" as const,
                text: `Failed to retrieve page content: ${error instanceof Error ? error.message : "Unknown error"}, Please check the URL and Extension Configuration.`
            }],
        };
    }
}

/**
 * 初始化 MCP 服务器
 */
export function initializeMcpServer() {
    output.info("Initializing MCP Server...");
    
    // 创建 MCP 服务器实例
    mcpServer = new McpServer({
        name: "wiki",
        version: "1.1.0"
    });

    // 注册 get-wiki-content 工具
    mcpServer.tool(
        "get-wiki-content",
        "Get Content of Confluence Wiki Page by URL",
        {
            url: z.string().describe("Wiki Page URL"),
        },
        getWikiContent
    );

    // 初始化时使用当前配置
    initializeConfluenceClient(configManager.getConfig());
    
    output.info("MCP Server initialized successfully");
}

/**
 * 处理 SSE 连接
 * @param res Express 响应对象
 */
export async function handleSseConnection(res: Response) {
    if (!mcpServer) {
        output.error("MCP Server not initialized");
        res.status(500).send("MCP Server not initialized");
        return;
    }
    
    transport = new SSEServerTransport("/messages", res);
    await mcpServer.connect(transport);
    output.info("Wiki MCP Server connected via SSE");
}

/**
 * 处理消息请求
 * @param req Express 请求对象
 * @param res Express 响应对象
 */
export async function handleMessageRequest(req: Request, res: Response) {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        output.warn("No active transport connection");
        res.status(400).send("No active transport connection");
    }
}

/**
 * 关闭 MCP 服务器和 SSE 传输连接
 */
export async function closeMcpServer(): Promise<void> {
    try {
        // 关闭 SSE 传输连接
        if (transport) {
            await transport.close();
            output.info("SSE transport closed");
        }
        
        // 关闭 MCP 服务器
        if (mcpServer) {
            await mcpServer.close();
            output.info("MCP server closed");
        }
    } catch (error) {
        output.error("Error closing MCP server", error);
    }
} 