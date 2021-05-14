import fs from "fs"
import pathModule from "path"

export default class FileIO {
    static writeObject<T>(object: T, path: string): void {
        fs.writeFileSync(path, JSON.stringify(object))
    }

    static readObject<T>(path: string): T {
        return JSON.parse(fs.readFileSync(path).toString())
    }

    static listFiles(path: string): string[] {
        return fs.readdirSync(path)
    }

    static existFile(path: string): boolean {
        try {
            fs.accessSync(path, fs.constants.W_OK | fs.constants.R_OK)
            return true
        } catch {
            return false
        }
    }

    static getFilePath(path: string, filename: string): string {
        return pathModule.join(path, filename)
    }

    static getFilePathWithDate(path: string, filename: string): string {
        const [mainName, extension] = filename.split(".")
        const dateString = new Date()
            .toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            })
            .split("/")
            .join("-")
        return pathModule.join(path, `${mainName}_${dateString}.${extension}`)
    }
}
