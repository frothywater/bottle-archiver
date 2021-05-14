import path from "path"

const dataDirectory = "./data/"
const inputDirectory = "./input/"
const imageDirectory = "/Users/cobalt/Pictures/Collection/"
const metadataPath = path.join(dataDirectory, "metadata.json")
const twitterFavoritesFileName = "twitter_favorites.json"
const pixivFavoritesFileName = "pixiv_favorites.json"
const twitterImageDirectory = path.join(imageDirectory, "twitter")
const pixivImageDirectory = path.join(imageDirectory, "pixiv")
const twitterHarPath = path.join(inputDirectory, "twitter.com.har")
const twitterFavoritesHarPath = path.join(
    dataDirectory,
    "twitter_favorites_har.json"
)

export default {
    dataDirectory,
    imageDirectory,
    metadataPath,
    twitterFavoritesFileName,
    pixivFavoritesFileName,
    twitterImageDirectory,
    pixivImageDirectory,
    twitterHarPath,
    twitterFavoritesHarPath,
}
