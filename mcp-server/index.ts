import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConfluenceClient } from "confluence.js";
import * as fs from 'fs';
import * as path from 'path';
import { decrypt, ConfluenceConfig } from "../extension/config-manager";

let confluence: ConfluenceClient;
const configPath = path.join(__dirname, '..', 'config.enc');

function loadConfigAndInitialize() {
    try {
        const encryptedConfig = fs.readFileSync(configPath, 'utf8');
        const configStr = decrypt(encryptedConfig);
        const config = JSON.parse(configStr) as ConfluenceConfig;
        confluence = new ConfluenceClient({
            host: config.host,
            authentication: {
                basic: {
                    username: config.username,
                    password: config.password,
                }
            },
        });
    } catch (error) {
        console.error('Error reading config:', error);
    }
}

async function getWikiContent({ url }: { url: string }) {
    try {
        const urlParams = new URL(url).searchParams;
        const pageId = urlParams.get('pageId');
        if (!pageId) {
            throw new Error('Invalid URL: pageId parameter is missing');
        }
        const response = await confluence.content.getContentById({
            id: pageId,
            expand: ["body.view"],
            status: ["current"]
        });

        if (!response || !response.body || !response.body.view || !response.body.view.value) {
            return {
                content: [{
                    type: "text" as const,
                    text: "Failed to retrieve page content"
                }],
            };
        }

        return {
            content: [{
                type: "text" as const,
                text: response.body.view.value
            }],
        };
    } catch (error) {
        console.error("Error fetching page:", error);
        return {
            content: [{
                type: "text" as const,
                text: `Error fetching page: ${error instanceof Error ? error.message : "Unknown error"}`
            }],
        };
    }
}

// 监听配置文件变更
fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
        loadConfigAndInitialize();
    }
});

// 初始化时读取配置
loadConfigAndInitialize();

// 创建server实例
const server = new McpServer({
    name: "wiki",
    version: "1.0.0",
});

// 注册get-page工具
server.tool(
    "get-wiki-content",
    "Get Content of Confluence Wiki Page by URL",
    {
        url: z.string().describe("Wiki Page URL"),
    },
    getWikiContent
);

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Wiki MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});