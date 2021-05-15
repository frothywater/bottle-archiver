import axios from "axios"
import fs from "fs"
import queue from "queue"
import stream from "stream"
import FileIO from "./FileIO"
import Util from "./Util"

const maxRetryTimes = 3
const maxConcurrent = 8

export default class Downloader {
    private queue = queue({
        concurrency: maxConcurrent,
        autostart: true,
    })
    private failed: DownloadTask[] = []

    async run(tasks: DownloadTask[]): Promise<DownloadTask[]> {
        console.log(`Start download ${tasks.length} files...`)
        return new Promise<DownloadTask[]>((resolve) => {
            this.queue.push(...tasks.map((task) => this.worker(task, 0)))
            this.queue.once("end", () => {
                console.log(
                    `Finished download ${tasks.length - this.failed.length}/${
                        tasks.length
                    } files, ${this.failed.length} failed.`
                )
                resolve(this.failed)
            })
        })
    }

    private worker =
        (task: DownloadTask, retryTimes: number) => async (): Promise<void> => {
            try {
                if (retryTimes < maxRetryTimes)
                    await Downloader.downloadFile(task, retryTimes)
                else this.failed.push(task)
            } catch {
                this.queue.push(this.worker(task, retryTimes + 1))
            }
        }

    private static async downloadFile(
        { url, path, headers }: DownloadTask,
        retryTimes: number
    ): Promise<void> {
        console.log(
            `Downloading ${Util.extractFilename(path)}... ${
                retryTimes > 0 ? `retry ${retryTimes} times` : ""
            }`
        )

        const response = await axios.get(url, {
            headers,
            responseType: "stream",
        })
        try {
            await stream.promises.pipeline(
                response.data as stream.Readable,
                fs.createWriteStream(path)
            )
            console.log(`Success: ${Util.extractFilename(path)}`)
        } catch (error) {
            if (FileIO.existFile(path)) fs.unlinkSync(path)
            console.log(`Failed: ${Util.extractFilename(path)}`)
            throw error
        }
    }
}

export interface DownloadTask {
    url: string
    path: string
    headers?: unknown
}
