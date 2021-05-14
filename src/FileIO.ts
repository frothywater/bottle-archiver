import fs from "fs"

export default class FileIO {
    static writeObject<T>(object: T, path: string): void {
        fs.writeFileSync(path, JSON.stringify(object, null, 2))
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
}
