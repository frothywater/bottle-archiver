/* eslint-disable @typescript-eslint/no-unused-vars */
import { Database, Downloader, Network, Pixiv, Twitter } from "../src"

async function init() {
    Network.useProxy()
    await Database.init()
}

async function updateTwitter() {
    const twitter = new Twitter()
    await twitter.updateFavorites()
    const another = new Twitter("frothywater1")
    await another.updateFavorites()
}

async function updatePixiv() {
    const pixiv = new Pixiv()
    await pixiv.init()
    await pixiv.updateFavorites()
}

async function downloadTwitter() {
    const twitterTasks = await Twitter.getNotDownloadedTask()
    const downloader = new Downloader()
    await downloader.run(twitterTasks)
}

async function downloadPixiv() {
    const downloader = new Downloader()
    const pixivTasks = await Pixiv.getNotDownloadedTask()
    await downloader.run(pixivTasks)
}

async function postUnlikedTweets() {
    await init()
    const twitter = new Twitter()
    await twitter.updateFavorites()
    await twitter.postUnlikedTweets()
}

async function pixivStat() {
    await Pixiv.performStat()
}

async function main() {
    await init()
}

main()
