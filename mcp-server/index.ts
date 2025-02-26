import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConfluenceClient } from "confluence.js";
import * as fs from 'fs';
import * as path from 'path';
import { decrypt, ConfluenceConfig } from "../extension/config-manager";
import TurndownService from 'turndown';

let confluence: ConfluenceClient;
const configPath = path.join(__dirname, '..', 'config.enc');
const emptyConfigPath = path.join(__dirname, '..', 'empty-config.enc');

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
        if (node.classList && (
            node.classList.contains('confluence-metadata') ||
            node.classList.contains('confluence-information-macro')
        )) {
            return '';
        }
        return content;
    }
});

function loadConfigAndInitialize() {
    try {
        const encryptedConfig = fs.readFileSync(configPath, 'utf8');
        const configStr = decrypt(encryptedConfig);
        const config = JSON.parse(configStr) as ConfluenceConfig;
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
    } catch (error) {
        console.error('Error reading config:', error);
    }
}

// 检查配置文件是否存在，如果不存在则创建
function ensureConfigExists() {
    try {
        if (!fs.existsSync(configPath)) {
            console.log('Config file does not exist, creating from empty template');
            
            // 检查空配置模板是否存在
            if (fs.existsSync(emptyConfigPath)) {
                // 复制空配置模板到配置文件位置
                fs.copyFileSync(emptyConfigPath, configPath);
                console.log('Created config file from empty template');
            } else {
                console.error('Empty config template not found at:', emptyConfigPath);
            }
        }
    } catch (error) {
        console.error('Error ensuring config file exists:', error);
    }
}

// 确保配置文件存在
ensureConfigExists();

// 初始化时读取配置
loadConfigAndInitialize();

// 监听配置文件变更
fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
        loadConfigAndInitialize();
    }
});

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

        // 将HTML转换为Markdown
        const markdown = turndownService.turndown(response.body.view.value);

        return {
            content: [{
                type: "text" as const,
                text: markdown
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

// 创建server实例
const server = new McpServer({
    name: "wiki",
    version: "1.0.0"
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