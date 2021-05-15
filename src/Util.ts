export default class Util {
    static toUpperLowerCase(s: string): string {
        if (s.length == 0) return s
        return s[0].toUpperCase() + s.slice(1)
    }

    static extractFilename(path: string): string | undefined {
        const index = path.lastIndexOf("/")
        if (index == -1) return undefined
        else return path.slice(index + 1)
    }
}
