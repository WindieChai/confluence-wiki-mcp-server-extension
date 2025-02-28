import { EventEmitter } from 'events';
import { EncryptionManager } from './encryption-manager';
import * as output from './output';

// 接口定义
export interface ExtensionConfig {
    host: string;
    username: string;
    password: string;
    port: number;
}

// 配置管理器类
class ConfigManager extends EventEmitter {
    private static instance: ConfigManager;
    private config: ExtensionConfig;

    private constructor() {
        super();
        this.config = {
            host: '',
            username: '',
            password: '',
            port: 1984
        };

        output.debug('Initializing ConfigManager');
        EncryptionManager.ensureConfigExists();
        this.loadConfigFile();
        output.debug('ConfigManager initialized');
    }

    private loadConfigFile(): void {
        output.debug('Loading configuration file');
        this.config = EncryptionManager.readConfigFile<ExtensionConfig>(this.config);
        output.debug('Configuration file loaded');
    }

    public getConfig(): ExtensionConfig {
        return { ...this.config };
    }

    public async setConfig(newConfig: Partial<ExtensionConfig>): Promise<void> {
        output.debug('Setting new configuration');
        this.config = {
            ...this.config,
            ...newConfig
        };
        
        // 保存配置到文件
        const success = EncryptionManager.writeConfigFile(this.config);
        if (success) {
            output.info('Configuration saved successfully');
        } else {
            output.warn('Failed to save configuration');
        }
        
        // 直接触发配置变更事件
        output.debug('Emitting configChanged event');
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