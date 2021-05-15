/* eslint-disable @typescript-eslint/no-unused-vars */
import Database from "./Database"
import Downloader from "./Downloader"
import Network from "./Network"
import Pixiv from "./Pixiv"
import Twitter from "./Twitter"

async function main() {
    Network.useProxy()
    await Database.init()

    const twitterTasks = await Twitter.getNotDownloadedTask()
    const pixivTasks = await Pixiv.getNotDownloadedTask()
    const downloader = new Downloader()
    await downloader.run(twitterTasks.concat(pixivTasks))
}

main()
