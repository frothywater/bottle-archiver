import path from "path"
import TwitterClient from "twitter"
import token from "../secret/twitter_token.json"
import Const from "./Const"
import Database from "./Database"
import { DownloadTask } from "./Downloader"
import FileIO from "./FileIO"
import { Tweet } from "./typing/BasicType"
import { FileDictionary } from "./typing/FileDictionary"
import { FileState } from "./typing/Metadata"
import Util from "./Util"

export default class Twitter {
    private client = new TwitterClient(token)
    private username: string | undefined

    constructor(username?: string) {
        this.username = username
    }

    async updateFavorites(): Promise<void> {
        const tweets = await this.fetchFavorites()

        const oldTweets: Tweet[] = (await Database.getTweets()) ?? []

        console.log(`Update Twitter favorites:`)
        console.log(`${oldTweets.length} before, ${tweets.length} from API,`)

        const mergedTweets = Twitter.mergeTweets(oldTweets, tweets)
        await Database.updateTwitter(
            mergedTweets,
            Twitter.parseTweets(mergedTweets)
        )
        console.log(`${mergedTweets.length} in total now.`)
    }

    static async updateFavoritesFromHar(): Promise<void> {
        if (!FileIO.existFile(Const.tweetsHarPath)) return
        const tweetsFromHar: Tweet[] = await FileIO.readObject(
            Const.tweetsHarPath
        )

        const tweets: Tweet[] = (await Database.getTweets()) ?? []

        console.log(`Update Twitter favorites from HAR file:`)
        console.log(
            `${tweets.length} before, ${tweetsFromHar.length} in HAR file,`
        )

        const mergedTweets = this.mergeTweets(tweets, tweetsFromHar)

        await Database.updateTwitter(
            mergedTweets,
            this.parseTweets(mergedTweets)
        )
        console.log(`${mergedTweets.length} in total after merged.`)
    }

    static async updateCollectionIndexFromData(): Promise<void> {
        const tweets: Tweet[] = (await Database.getTweets()) ?? []
        await Database.updateTwitter(tweets, this.parseTweets(tweets))
    }

    static async getNotDownloadedTask(): Promise<DownloadTask[]> {
        const index = await Database.getTweetIndex()

        return (
            Object.entries(index)
                .filter((entry) => entry[1].state == FileState.notDownloaded)
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .map((entry) => parseUrl(entry[1].info!.url))
        )

        function parseUrl(url: string): DownloadTask {
            const extension = url.slice(url.lastIndexOf(".") + 1)
            const base = url.slice(0, url.lastIndexOf("."))
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const filename = Util.extractFilename(url)!
            return {
                url: `${base}?format=${extension}&name=large`,
                path: path.join(Const.twitterImageDirectory, filename),
            }
        }
    }

    private async fetchFavorites(): Promise<Tweet[]> {
        const result: Tweet[] = []

        let maxID: bigint | undefined
        let partialResult: Tweet[]
        do {
            partialResult = await this.fetchFavoritesOnce(maxID)
            result.push(...partialResult)
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

    private async fetchFavoritesOnce(maxID?: bigint): Promise<Tweet[]> {
        console.log(`Twitter: Fetching favorites, maxID=${maxID}`)

        const result = (await this.client.get("favorites/list", {
            screen_name: this.username,
            max_id: maxID ? maxID.toString() : undefined,
            count: 200,
            include_entities: true,
        })) as Tweet[]

        const last = result[result.length - 1]

        console.log(
            `\tgot ${result.length} results, last created at ${last?.created_at}, id=${last?.id_str}`
        )

        return result
    }

    private static mergeTweets(tweetsA: Tweet[], tweetsB: Tweet[]): Tweet[] {
        const result: Tweet[] = tweetsA
        const tweetSet = new Set<string>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tweetsA.forEach((tweet: any) => tweetSet.add(tweet.id_str))
        tweetsB.forEach((tweet) => {
            if (!tweetSet.has(tweet.id_str)) {
                tweetSet.add(tweet.id_str)
                result.push(tweet)
            }
        })
        return result
    }

    private static parseTweets(tweets: Tweet[]): FileDictionary {
        const result: FileDictionary = {}

        tweets.forEach((tweet) => {
            const mediaArray = tweet.extended_entities?.media
            if (!mediaArray) return
            mediaArray.forEach((media) => {
                const url: string = media.media_url_https
                const filename = Util.extractFilename(url)
                if (filename) result[filename] = { id: tweet.id_str, url }
            })
        })

        return result
    }
}
