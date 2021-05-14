import path from "path"

const dataDirectory = "./data/"
const inputDirectory = "./input/"
const imageDirectory = "/Users/cobalt/Pictures/Collection/"
const metadataPath = path.join(dataDirectory, "metadata.json")
const tweetsPath = path.join(dataDirectory, "tweets.json")
const pixivPath = path.join(dataDirectory, "pixiv.json")
const tweetsHarPath = path.join(dataDirectory, "tweets_har.json")
const twitterImageDirectory = path.join(imageDirectory, "twitter")
const pixivImageDirectory = path.join(imageDirectory, "pixiv")
const twitterHarPath = path.join(inputDirectory, "twitter.com.har")

export default {
    dataDirectory,
    imageDirectory,
    metadataPath,
    tweetsPath,
    pixivPath,
    twitterImageDirectory,
    pixivImageDirectory,
    twitterHarPath,
    twitterFavoritesHarPath: tweetsHarPath,
}
