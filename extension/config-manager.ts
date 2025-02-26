import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { EncryptionManager, CONFIG_PATH } from './encryption-manager';

// 接口定义
export interface ConfluenceConfig {
    host: string;
    username: string;
    password: string;
}

// 配置管理器类
class ConfigManager extends EventEmitter {
    private static instance: ConfigManager;
    private config: ConfluenceConfig;
    private watcher: fs.FSWatcher | null = null;
    private initialized: boolean = false;

    private constructor() {
        super();
        this.config = {
            host: '',
            username: '',
            password: ''
        };
    }

    private loadConfigFile(): void {
        const defaultConfig: ConfluenceConfig = {
            host: '',
            username: '',
            password: ''
        };
        
        this.config = EncryptionManager.readConfigFile<ConfluenceConfig>(defaultConfig);
    }

    private startWatchingConfig(): void {
        try {
            // 如果已经在监控，先停止
            if (this.watcher) {
                this.watcher.close();
                this.watcher = null;
            }

            // 确保配置文件存在
            EncryptionManager.ensureConfigExists();

            // 开始监控
            this.watcher = fs.watch(CONFIG_PATH, (eventType) => {
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
        if (!this.initialized) {
            EncryptionManager.ensureConfigExists();
            this.loadConfigFile();
            this.startWatchingConfig();
            this.initialized = true;
        }
    }

    public getConfig(): ConfluenceConfig {
        return { ...this.config };
    }

    public async setConfig(newConfig: Partial<ConfluenceConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...newConfig
        };
        EncryptionManager.writeConfigFile(this.config);
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

// 导出配置管理器实例
export const configManager = ConfigManager.getInstance();