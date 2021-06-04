import queue from "queue"

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

    static async concurrentlyRun(
        workers: (() => Promise<void>)[],
        concurrency = 8
    ): Promise<void> {
        return new Promise((resolve, _) => {
            const q = queue({
                concurrency,
                autostart: true,
            })
            q.push(...workers)
            q.once("end", () => resolve())
        })
    }

    static errorString(err: string | Record<string, unknown>): string {
        return typeof err == "string" ? err : JSON.stringify(err)
    }
}
