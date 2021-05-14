/* eslint-disable @typescript-eslint/no-explicit-any */
import { Har } from "har-format"
import Const from "./Const"
import FileIO from "./FileIO"

export default class TwitterHarReader {
    static update(): void {
        const har: Har = FileIO.readObject(Const.twitterHarPath)
        const tweetSet = new Set<string>()
        const result: any[] = []
        har.log.entries
            .filter((entry) => entry.request.url.indexOf("Likes?") != -1)
            .forEach((entry) => {
                const text = entry.response.content.text
                if (!text) return
                const tweets = this.parseResponse(text)
                tweets.forEach((tweet) => {
                    if (!tweet?.id_str) return
                    if (!tweetSet.has(tweet.id_str)) {
                        tweetSet.add(tweet.id_str)
                        result.push(tweet)
                    }
                })
            })
        FileIO.writeObject(result, Const.twitterFavoritesHarPath)
    }

    private static parseResponse(text: string): any[] {
        const json = JSON.parse(text)
        const entries =
            json?.data?.user?.result?.timeline?.timeline?.instructions[0]
                ?.entries
        return entries.map(
            (entry: any) => entry?.content?.itemContent?.tweet?.legacy
        )
    }
}
