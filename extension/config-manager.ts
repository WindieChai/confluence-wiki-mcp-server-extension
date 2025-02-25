import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// 接口定义
export interface ConfluenceConfig {
    host: string;
    username: string;
    password: string;
}

export interface VSCodeConfig {
    getConfiguration(section: string): any;
    onDidChangeConfiguration(callback: (e: { affectsConfiguration: (section: string) => boolean }) => void): void;
}

// 常量
const EXTENSION_NAME = 'confluence-wiki-mcp-server-extension';
const ENCRYPTION_KEY = 'confluencewikimcpserverextension';
const IV_LENGTH = 16;

// 静态工具函数
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// 配置管理器类
class ConfigManager {
    private static instance: ConfigManager;
    private config: ConfluenceConfig;
    private configPath: string;
    private vscodeConfig?: VSCodeConfig;

    private constructor() {
        this.config = {
            host: '',
            username: '',
            password: ''
        };
        this.configPath = path.join(__dirname, '..', 'config.enc');
    }

    public initialize(vscodeConfig: VSCodeConfig): void {
        this.vscodeConfig = vscodeConfig;
        this.loadConfig();
        
        this.vscodeConfig.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(EXTENSION_NAME)) {
                this.loadConfig();
            }
        });
    }

    private loadConfig(): void {
        if (!this.vscodeConfig) return;

        const config = this.vscodeConfig.getConfiguration(EXTENSION_NAME);
        const newConfig = {
            host: config.get('host') as string,
            username: config.get('username') as string,
            password: config.get('password') as string
        };
        
        this.config = newConfig;
        this.writeConfigFile();
    }

    private writeConfigFile(): void {
        try {
            const encryptedConfig = encrypt(JSON.stringify(this.config));
            fs.writeFileSync(this.configPath, encryptedConfig);
        } catch (error) {
            console.error('Error writing config file:', error);
        }
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getConfig(): ConfluenceConfig {
        return { ...this.config };
    }

    public async setConfig(newConfig: Partial<ConfluenceConfig>): Promise<void> {
        // 更新内存中的配置
        this.config = {
            ...this.config,
            ...newConfig
        };

        // 保存到 VSCode 配置
        if (this.vscodeConfig) {
            const config = this.vscodeConfig.getConfiguration(EXTENSION_NAME);
            await config.update('host', newConfig.host, true);
            await config.update('username', newConfig.username, true);
            await config.update('password', newConfig.password, true);
        }

        // 写入加密文件
        this.writeConfigFile();
    }
}

export const configManager = ConfigManager.getInstance();