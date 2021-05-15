import fs from "fs"

export default class FileIO {
    static async writeObject<T>(object: T, path: string): Promise<void> {
        await fs.promises.writeFile(path, JSON.stringify(object, null, 2))
    }

    static async readObject<T>(path: string): Promise<T> {
        return JSON.parse((await fs.promises.readFile(path)).toString())
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
}
