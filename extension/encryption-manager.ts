import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const CONFIG_PATH = path.join(__dirname, '..', 'config.enc');
const EMPTY_CONFIG_PATH = path.join(__dirname, '..', 'empty-config.enc');
const ENCRYPTION_KEY = 'confluencewikimcpserverextension';
const IV_LENGTH = 16;

/**
 * 加密存储管理器
 * 负责加密/解密数据以及加密文件的读写操作
 */
export class EncryptionManager {
    /**
     * 加密文本
     * @param text 要加密的文本
     * @returns 加密后的文本（格式：iv:encryptedData）
     */
    static encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    /**
     * 解密文本
     * @param text 要解密的文本（格式：iv:encryptedData）
     * @returns 解密后的文本
     */
    static decrypt(text: string): string {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    /**
     * 读取加密配置文件
     * @param defaultValue 默认值（如果文件不存在或读取失败）
     * @returns 解密后的数据或默认值
     */
    public static readConfigFile<T>(defaultValue: T): T {
        return this.readEncryptedFile<T>(CONFIG_PATH, defaultValue);
    }

    /**
     * 写入加密配置文件
     * @param data 要写入的数据
     * @returns 是否写入成功
     */
    public static writeConfigFile<T>(data: T): boolean {
        return this.writeEncryptedFile<T>(CONFIG_PATH, data);
    }

    /**
     * 读取加密文件
     * @param filePath 文件路径
     * @param defaultValue 默认值（如果文件不存在或读取失败）
     * @returns 解密后的数据或默认值
     */
    static readEncryptedFile<T>(filePath: string, defaultValue: T): T {
        try {
            if (fs.existsSync(filePath)) {
                const encryptedData = fs.readFileSync(filePath, 'utf8');
                const decryptedData = this.decrypt(encryptedData);
                return JSON.parse(decryptedData);
            }
        } catch (error) {
            console.error(`Error reading encrypted file ${filePath}:`, error);
        }
        
        return defaultValue;
    }

    /**
     * 写入加密文件
     * @param filePath 文件路径
     * @param data 要写入的数据
     * @returns 是否写入成功
     */
    static writeEncryptedFile<T>(filePath: string, data: T): boolean {
        try {
            const encryptedData = this.encrypt(JSON.stringify(data));
            fs.writeFileSync(filePath, encryptedData);
            return true;
        } catch (error) {
            console.error(`Error writing encrypted file ${filePath}:`, error);
            return false;
        }
    }

    /**
     * 确保配置文件存在，如果不存在则从模板创建
     * @returns 是否成功确保文件存在
     */
    public static ensureConfigExists(): boolean {
        try {
            if (!fs.existsSync(CONFIG_PATH)) {
                console.log(`Config file does not exist at ${CONFIG_PATH}, creating from template`);
                
                if (fs.existsSync(EMPTY_CONFIG_PATH)) {
                    fs.copyFileSync(EMPTY_CONFIG_PATH, CONFIG_PATH);
                    console.log(`Created config file from template: ${CONFIG_PATH}`);
                    return true;
                } else {
                    console.error(`Empty config template not found at: ${EMPTY_CONFIG_PATH}`);
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error(`Error ensuring config file exists:`, error);
            return false;
        }
    }
    
    /**
     * 确保文件存在，如果不存在则从模板创建
     * @param targetPath 目标文件路径
     * @param templatePath 模板文件路径
     * @returns 是否成功确保文件存在
     */
    static ensureFileExists(targetPath: string, templatePath: string): boolean {
        try {
            if (!fs.existsSync(targetPath)) {
                console.log(`File does not exist at ${targetPath}, creating from template`);
                
                if (fs.existsSync(templatePath)) {
                    fs.copyFileSync(templatePath, targetPath);
                    console.log(`Created file from template: ${targetPath}`);
                    return true;
                } else {
                    console.error(`Template file not found at: ${templatePath}`);
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error(`Error ensuring file exists at ${targetPath}:`, error);
            return false;
        }
    }
} 