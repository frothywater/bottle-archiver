import path from "path"

const dataDirectory = "./data/"
const imageDirectory = "/Users/cobalt/Pictures/Collection/"
const metadataPath = path.join(dataDirectory, "metadata.json")
const twitterFavoritesFileName = "twitter_favorites.json"
const pixivFavoritesFileName = "pixiv_favorites.json"
const twitterImageDirectory = path.join(imageDirectory, "twitter")
const pixivImageDirectory = path.join(imageDirectory, "pixiv")

export default {
    dataDirectory,
    imageDirectory,
    metadataPath,
    twitterFavoritesFileName,
    pixivFavoritesFileName,
    twitterImageDirectory,
    pixivImageDirectory,
}
