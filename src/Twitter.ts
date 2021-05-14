import TwitterClient from "twitter"
import token from "../secret/twitter_token.json"
import Const from "./Const"
import Database from "./Database"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"

type Tweet = TwitterClient.ResponseData

export default class Twitter {
    client = new TwitterClient(token)
    username: string | undefined

    constructor(username?: string) {
        this.username = username
    }

    async updateFavorites(): Promise<void> {
        const tweets = await this.fetchFavorites()

        const oldTweets: Tweet[] = Database.getTweets() ?? []

        console.log(`Update Twitter favorites:`)
        console.log(`${oldTweets.length} before, ${tweets.length} from API,`)

        const mergedTweets = Twitter.mergeTweets(oldTweets, tweets)
        Database.updateTwitter(mergedTweets, Twitter.parseTweets(mergedTweets))
        console.log(`${mergedTweets.length} in total now.`)
    }

    static async updateFavoritesFromHar(): Promise<void> {
        if (!FileIO.existFile(Const.twitterFavoritesHarPath)) return
        const tweetsFromHar: Tweet[] = FileIO.readObject(
            Const.twitterFavoritesHarPath
        )

        const tweets: Tweet[] = Database.getTweets() ?? []

        console.log(`Update Twitter favorites from HAR file:`)
        console.log(
            `${tweets.length} before, ${tweetsFromHar.length} in HAR file,`
        )

        const mergedTweets = this.mergeTweets(tweets, tweetsFromHar)

        Database.updateTwitter(mergedTweets, this.parseTweets(mergedTweets))
        console.log(`${mergedTweets.length} in total after merged.`)
    }

    private async fetchFavorites(): Promise<Tweet[]> {
        let result: Tweet[] = []

        let maxID: bigint | undefined
        let partialResult: Tweet[]
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
}
