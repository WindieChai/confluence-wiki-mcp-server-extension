import { EventEmitter } from 'events';
import { EncryptionManager } from './encryption-manager';

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

        EncryptionManager.ensureConfigExists();
        this.loadConfigFile();
    }

    private loadConfigFile(): void {
        this.config = EncryptionManager.readConfigFile<ExtensionConfig>(this.config);
    }

    public getConfig(): ExtensionConfig {
        return { ...this.config };
    }

    public async setConfig(newConfig: Partial<ExtensionConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...newConfig
        };
        
        // 保存配置到文件
        EncryptionManager.writeConfigFile(this.config);
        
        // 直接触发配置变更事件
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