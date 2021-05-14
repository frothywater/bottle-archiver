import PixivClient, { PixivIllust } from "pixiv.ts"
import token from "../secret/pixiv_token.json"
import Const from "./Const"
import Database from "./Database"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"

export default class Pixiv {
    client?: PixivClient
    userID = token.id

    async init(): Promise<void> {
        try {
            this.client = await PixivClient.refreshLogin(token.refreshToken)

            const newToken = token
            newToken.accessToken = PixivClient.accessToken
            newToken.refreshToken = PixivClient.refreshToken
            FileIO.writeObject(newToken, Const.pixivTokenPath)
        } catch (error) {
            console.error(error)
        }
    }

    async updateFavorites(): Promise<void> {
        const illusts = await this.fetchBookmarks()

        const oldIllusts: PixivIllust[] = Database.getPixiv() ?? []

        console.log(`Update Pixiv favorites:`)
        console.log(`${oldIllusts.length} before, ${illusts.length} from API,`)

        const mergedIllusts = Pixiv.mergeIllusts(oldIllusts, illusts)
        Database.updatePixiv(mergedIllusts, Pixiv.parseIllusts(mergedIllusts))
        console.log(`${mergedIllusts.length} in total now.`)
    }

    private async fetchBookmarks(): Promise<PixivIllust[]> {
        const publicResult = await this.fetchBookmarksWithRestrict("public")
        const privateResult = await this.fetchBookmarksWithRestrict("private")
        return publicResult.concat(privateResult)
    }

    private async fetchBookmarksWithRestrict(
        restrict: "private" | "public"
    ): Promise<PixivIllust[]> {
        if (!this.client) throw console.error("Pixiv didn't login!")

        let result: PixivIllust[] = []
        let nextURL: string | null = null
        do {
            console.log(`Pixiv: Fetching bookmarks`)

            let partialResult: PixivIllust[]
            if (nextURL) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const search: any = await this.client.api.next(nextURL)
                partialResult = search.illusts
                nextURL = search.nextURL
            } else {
                partialResult = await this.client.user.bookmarksIllust({
                    user_id: this.userID,
                    restrict,
                })
                nextURL = this.client.user.nextURL
            }
            result = result.concat(partialResult)

            const last = partialResult[partialResult.length - 1]
            console.log(
                `\tgot ${partialResult.length} results, last created at ${last?.create_date}, id=${last?.id}`
            )
        } while (nextURL)
        return result
    }

    private static parseIllusts(illusts: PixivIllust[]): FileDictionary {
        const result: FileDictionary = {}

        illusts.forEach((illust) => {
            const singleUrl = illust.meta_single_page.original_image_url
            const urls = singleUrl
                ? [singleUrl]
                : illust.meta_pages.map((page) => page.image_urls.original)
            urls.forEach((url) => {
                const filename = url.split("/").pop()
                if (filename)
                    result[filename] = { id: illust.id.toString(), url }
            })
        })

        return result
    }

    private static mergeIllusts(
        illustsA: PixivIllust[],
        illustsB: PixivIllust[]
    ): PixivIllust[] {
        const result: PixivIllust[] = illustsA
        const illustSet = new Set<number>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        illustsA.forEach((illust: any) => illustSet.add(illust.id_str))
        illustsB.forEach((illust) => {
            if (!illustSet.has(illust.id)) {
                illustSet.add(illust.id)
                result.push(illust)
            }
        })
        return result
    }
}
