import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

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
class ConfigManager extends EventEmitter {
    private static instance: ConfigManager;
    private config: ConfluenceConfig;
    private configPath: string;
    private emptyConfigPath: string;
    private watcher: fs.FSWatcher | null = null;

    private constructor() {
        super();
        this.config = {
            host: '',
            username: '',
            password: ''
        };
        this.configPath = path.join(__dirname, '..', 'config.enc');
        this.emptyConfigPath = path.join(__dirname, '..', 'empty-config.enc');
        
        this.ensureConfigExists();
        this.loadConfigFile();
        this.startWatchingConfig();
    }

    private ensureConfigExists(): void {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log('Config file does not exist, creating from empty template');
                
                if (fs.existsSync(this.emptyConfigPath)) {
                    fs.copyFileSync(this.emptyConfigPath, this.configPath);
                    console.log('Created config file from empty template');
                } else {
                    console.error('Empty config template not found at:', this.emptyConfigPath);
                }
            }
        } catch (error) {
            console.error('Error ensuring config file exists:', error);
        }
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

    private startWatchingConfig(): void {
        try {
            // 如果已经在监控，先停止
            if (this.watcher) {
                this.watcher.close();
                this.watcher = null;
            }

            // 确保配置文件存在
            this.ensureConfigExists();

            // 开始监控
            this.watcher = fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    this.loadConfigFile();
                    this.emit('configChanged', this.config);
                }
            });

            this.watcher.on('error', (error) => {
                console.error('Watch error:', error);
                // 出错时关闭当前 watcher
                if (this.watcher) {
                    this.watcher.close();
                    this.watcher = null;
                }
                // 延迟重试
                setTimeout(() => this.startWatchingConfig(), 5000);
            });

        } catch (error) {
            console.error('Error setting up file watcher:', error);
            // 出错时延迟重试
            setTimeout(() => this.startWatchingConfig(), 5000);
        }
    }

    public initialize(): void {
        // 初始化已经在构造函数中完成
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
        // 写入配置后触发事件
        this.emit('configChanged', this.config);
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
}

export const configManager = ConfigManager.getInstance();