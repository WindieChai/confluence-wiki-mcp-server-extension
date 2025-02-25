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

    private constructor() {
        this.config = {
            host: '',
            username: '',
            password: ''
        };
        this.configPath = path.join(__dirname, '..', 'config.enc');
        this.loadConfigFile(); // 初始化时直接从文件加载
    }

    private loadConfigFile(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const encryptedConfig = fs.readFileSync(this.configPath, 'utf8');
                const decryptedConfig = decrypt(encryptedConfig);
                this.config = JSON.parse(decryptedConfig);
            }
        } catch (error) {
            console.error('Error reading config file:', error);
        }
    }

    private writeConfigFile(): void {
        try {
            const encryptedConfig = encrypt(JSON.stringify(this.config));
            fs.writeFileSync(this.configPath, encryptedConfig);
        } catch (error) {
            console.error('Error writing config file:', error);
        }
    }

    public initialize(): void {
        // 不再需要 vscodeConfig 参数
        this.loadConfigFile();
    }

    public getConfig(): ConfluenceConfig {
        return { ...this.config };
    }

    public async setConfig(newConfig: Partial<ConfluenceConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this.writeConfigFile();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
}

export const configManager = ConfigManager.getInstance();