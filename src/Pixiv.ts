import path from "path"
import PixivAppApi from "pixiv-app-api"
import { PixivIllustSearch } from "pixiv-app-api/dist/PixivTypes"
import token from "../secret/pixiv_token.json"
import Const from "./Const"
import Database from "./Database"
import { DownloadTask } from "./Downloader"
import FileIO from "./FileIO"
import { Illust } from "./typing/BasicType"
import { FileDictionary } from "./typing/FileDictionary"
import { FileState } from "./typing/Metadata"
import Util from "./Util"

export default class Pixiv {
    private client = new PixivAppApi("", "", {
        camelcaseKeys: true,
    })
    private userID?: number

    async init(): Promise<void> {
        this.client.refreshToken = token.refreshToken
        const loginResult = await this.client.login()
        this.userID = parseInt(loginResult.user.id, 10)

        await this.updateToken()
    }

    async updateFavorites(): Promise<void> {
        const illusts = await this.fetchBookmarks()

        const oldIllusts: Illust[] = (await Database.getPixiv()) ?? []

        console.log(`Update Pixiv favorites:`)
        console.log(`${oldIllusts.length} before, ${illusts.length} from API,`)

        const mergedIllusts = Pixiv.mergeIllusts(oldIllusts, illusts)
        await Database.updatePixiv(
            mergedIllusts,
            Pixiv.parseIllusts(mergedIllusts)
        )
        console.log(`${mergedIllusts.length} in total now.`)
    }

    static async updateCollectionIndexFromData(): Promise<void> {
        const illusts: Illust[] = (await Database.getPixiv()) ?? []
        await Database.updatePixiv(illusts, this.parseIllusts(illusts))
    }

    static async getNotDownloadedTask(): Promise<DownloadTask[]> {
        const index = await Database.getPixivIndex()

        return (
            Object.entries(index)
                .filter((entry) => entry[1].state == FileState.notDownloaded)
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .map((entry) => parseUrl(entry[1].info!.url))
        )

        function parseUrl(url: string): DownloadTask {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const filename = Util.extractFilename(url)!
            return {
                url,
                path: path.join(Const.pixivImageDirectory, filename),
                headers: { Referer: "http://www.pixiv.net/" },
            }
        }
    }

    private async updateToken(): Promise<void> {
        const newToken = {
            accessToken: this.client.authToken,
            refreshToken: this.client.refreshToken,
        }
        await FileIO.writeObject(newToken, Const.pixivTokenPath)
    }

    private async fetchBookmarks(): Promise<Illust[]> {
        const privateResult = await this.fetchBookmarksWithRestrict("private")
        const publicResult = await this.fetchBookmarksWithRestrict("public")
        return privateResult.concat(publicResult)
    }

    private async fetchBookmarksWithRestrict(
        restrict: "private" | "public"
    ): Promise<Illust[]> {
        if (!this.userID) throw console.error("Pixiv didn't login!")

        const result: Illust[] = []
        let search: PixivIllustSearch | undefined
        do {
            console.log(`Pixiv: Fetching ${restrict} bookmarks`)

            if (!search)
                search = await this.client.userBookmarksIllust(this.userID, {
                    restrict,
                })
            else search = (await this.client.next()) as PixivIllustSearch
            result.push(...search.illusts)

            const last = search.illusts[search.illusts.length - 1]
            console.log(
                `\tgot ${search.illusts.length} results, last created at ${last?.createDate}, id=${last?.id}`
            )
        } while (this.client.hasNext())
        return result
    }

    private static parseIllusts(illusts: Illust[]): FileDictionary {
        const result: FileDictionary = {}

        illusts.forEach((illust) => {
            const urls: string[] = []
            if (illust.metaSinglePage?.originalImageUrl)
                urls.push(illust.metaSinglePage.originalImageUrl)
            if (illust.metaPages)
                urls.push(
                    ...illust.metaPages.map((page) => page.imageUrls.original)
                )
            urls.forEach((url) => {
                const filename = Util.extractFilename(url)
                if (filename)
                    result[filename] = { id: illust.id.toString(), url }
            })
        })

        return result
    }

    private static mergeIllusts(
        illustsA: Illust[],
        illustsB: Illust[]
    ): Illust[] {
        const result: Illust[] = illustsA
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
