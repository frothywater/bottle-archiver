import { Database, Downloader, Network, Pixiv, Twitter } from "../src"

async function main() {
    Network.useProxy()
    await Database.init()

    const twitter = new Twitter()
    await twitter.updateFavorites()
    const pixiv = new Pixiv()
    await pixiv.init()
    await pixiv.updateFavorites()

    const twitterTasks = await Twitter.getNotDownloadedTask()
    const pixivTasks = await Pixiv.getNotDownloadedTask()
    const downloader = new Downloader()
    await downloader.run(twitterTasks.concat(pixivTasks))
}

main()
