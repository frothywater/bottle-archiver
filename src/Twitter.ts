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

    async likeUnlikedTweets(): Promise<void> {
        const unliked = await Twitter.getUnlikedTweets()

        const worker = (tweet: Tweet) => async () => {
            try {
                await this.likeTweet(tweet)
                console.log(`Posted Like: ${tweet.id_str}`)
            } catch (error) {
                console.log(
                    `Failed Like: ${tweet.id_str}, ${Util.errorString(error)}`
                )
            } finally {
                await Util.delay(500)
            }
        }

        await Util.concurrentlyRun(
            unliked.slice(0, 500).map((tweet) => worker(tweet)),
            1
        )
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

    private static async getUnlikedTweets(): Promise<Tweet[]> {
        const tweets: Tweet[] = (await Database.getTweets()) ?? []
        return tweets.filter((tweet) => tweet.favorited == false)
    }

    private async likeTweet(tweet: Tweet): Promise<void> {
        await this.client.post("favorites/create", { id: tweet.id_str })
    }

    private async unlikeTweet(tweet: Tweet): Promise<void> {
        await this.client.post("favorites/destroy", { id: tweet.id_str })
    }

    private static mergeTweets(tweetsA: Tweet[], tweetsB: Tweet[]): Tweet[] {
        // Assume that B is newer than A
        const dict: { [id: string]: Tweet } = {}
        tweetsA.forEach((tweet) => (dict[tweet.id_str] = tweet))
        tweetsB.forEach((tweet) => (dict[tweet.id_str] = tweet))
        return Object.values(dict)
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
