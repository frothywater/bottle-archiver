import path from "path"

const dataDirectory = "./data/"
const inputDirectory = "./input/"
const secretDirectory = "./secret/"
const imageDirectory = "/Users/cobalt/Pictures/Collection/"
const metadataPath = path.join(dataDirectory, "metadata.json")
const tweetsPath = path.join(dataDirectory, "tweets.json")
const pixivPath = path.join(dataDirectory, "pixiv.json")
const tweetsHarPath = path.join(dataDirectory, "tweets_har.json")
const twitterImageDirectory = path.join(imageDirectory, "twitter")
const pixivImageDirectory = path.join(imageDirectory, "pixiv")
const twitterHarPath = path.join(inputDirectory, "twitter.com.har")
const pixivTokenPath = path.join(secretDirectory, "pixiv_token.json")

export default {
    dataDirectory,
    imageDirectory,
    secretDirectory,
    metadataPath,
    tweetsPath,
    pixivPath,
    twitterImageDirectory,
    pixivImageDirectory,
    twitterHarPath,
    tweetsHarPath,
    pixivTokenPath,
}
