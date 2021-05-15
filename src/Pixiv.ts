import PixivAppApi from "pixiv-app-api"
import { PixivIllust, PixivIllustSearch } from "pixiv-app-api/dist/PixivTypes"
import token from "../secret/pixiv_token.json"
import Const from "./Const"
import Database from "./Database"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"

export default class Pixiv {
    client = new PixivAppApi("", "", {
        camelcaseKeys: true,
    })
    userID?: number

    async init(): Promise<void> {
        this.client.refreshToken = token.refreshToken
        const loginResult = await this.client.login()
        this.userID = parseInt(loginResult.user.id, 10)

        this.updateToken()
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

    private updateToken(): void {
        const newToken: typeof token = {
            accessToken: this.client.authToken,
            refreshToken: this.client.refreshToken,
        }
        FileIO.writeObject(newToken, Const.pixivTokenPath)
    }

    private async fetchBookmarks(): Promise<PixivIllust[]> {
        const privateResult = await this.fetchBookmarksWithRestrict("private")
        const publicResult = await this.fetchBookmarksWithRestrict("public")
        return privateResult.concat(publicResult)
    }

    private async fetchBookmarksWithRestrict(
        restrict: "private" | "public"
    ): Promise<PixivIllust[]> {
        if (!this.userID) throw console.error("Pixiv didn't login!")

        const result: PixivIllust[] = []
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

    private static parseIllusts(illusts: PixivIllust[]): FileDictionary {
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
