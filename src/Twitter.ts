import TwitterClient from "twitter"
import token from "../secret/twitter_token.json"
import Const from "./Const"
import Database from "./Database"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"

type TweetArray = TwitterClient.ResponseData[]

export default class Twitter {
    client = new TwitterClient(token)
    username: string | undefined

    constructor(username?: string) {
        this.username = username
    }

    async updateFavorites(): Promise<void> {
        const tweets = await this.fetchFavorites()

        const filePath = FileIO.getFilePath(
            Const.dataDirectory,
            Const.twitterFavoritesFileName
        )
        FileIO.writeObject(tweets, filePath)
        Database.updateLastRetrieved("twitter", filePath)

        Database.updateCollectionIndex("twitter", this.parseTweets(tweets))
    }

    private parseTweets(tweets: TweetArray): FileDictionary {
        const result: FileDictionary = {}

        tweets.forEach((tweet) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mediaArray: any[] = tweet.extended_entities?.media
            if (!mediaArray) return
            mediaArray.forEach((media) => {
                const url: string = media.media_url_https
                const filename = url.split("/").pop()
                if (!filename) return
                result[filename] = { id: tweet.id_str, url }
            })
        })

        return result
    }

    private async fetchFavorites(): Promise<TweetArray> {
        let result: TweetArray = []

        let maxID: bigint | undefined
        let partialResult: TweetArray
        do {
            partialResult = await this.fetchFavoritesOnce(maxID)
            result = result.concat(partialResult)
            const last = partialResult[partialResult.length - 1]
            if (last) maxID = BigInt(last.id_str) - 1n
        } while (partialResult.length > 0)

        console.log(
            `Totally got ${result.length} results, last created at ${
                result[result.length - 1]?.created_at
            }, id=${result[result.length - 1]?.id_str}`
        )

        return result
    }

    private async fetchFavoritesOnce(maxID?: bigint): Promise<TweetArray> {
        console.log(`Twitter: Fetching favorites, maxID=${maxID}`)

        const result = (await this.client.get("favorites/list", {
            screen_name: this.username,
            max_id: maxID ? maxID.toString() : undefined,
            count: 200,
            include_entities: true,
        })) as TweetArray

        const last = result[result.length - 1]

        console.log(
            `\tgot ${result.length} results, last created at ${last?.created_at}, id=${last?.id_str}`
        )

        return result
    }
}
