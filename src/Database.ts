import Const from "./Const"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"
import { CollectionIndex, FileState, Metadata } from "./typing/Metadata"
import Util from "./Util"

export default class Database {
    static async init(): Promise<void> {
        if (!FileIO.existFile(Const.metadataPath)) {
            console.log("Metadata doesn't exist, create empty metadata file.")
            const metadata: Metadata = {
                twitter: { collectionIndex: {} },
                pixiv: { collectionIndex: {} },
            }
            await FileIO.writeObject(metadata, Const.metadataPath)
        }
        await this.rebuildTwitterIndex()
        await this.rebuildPixivIndex()
    }

    static async getTweets<T>(): Promise<T | undefined> {
        return await this.getData<T>("twitter")
    }

    static async getPixiv<T>(): Promise<T | undefined> {
        return await this.getData<T>("pixiv")
    }

    static async getTweetIndex(): Promise<CollectionIndex> {
        return await this.getCollectionIndex("twitter")
    }

    static async getPixivIndex(): Promise<CollectionIndex> {
        return await this.getCollectionIndex("pixiv")
    }

    static async updateTwitter<T>(
        data: T,
        dict: FileDictionary
    ): Promise<void> {
        await this.update("twitter", data, dict)
    }

    static async updatePixiv<T>(data: T, dict: FileDictionary): Promise<void> {
        await this.update("pixiv", data, dict)
    }

    static async rebuildTwitterIndex(): Promise<void> {
        await this.rebuildCollectionIndex("twitter")
    }

    static async rebuildPixivIndex(): Promise<void> {
        await this.rebuildCollectionIndex("pixiv")
    }

    private static async update<T>(
        type: "twitter" | "pixiv",
        data: T,
        dict: FileDictionary
    ): Promise<void> {
        const filePath = type == "twitter" ? Const.tweetsPath : Const.pixivPath
        await FileIO.writeObject(data, filePath)

        const metadata = await FileIO.readObject<Metadata>(Const.metadataPath)
        metadata[type].lastRetrieved = { date: new Date() }
        await FileIO.writeObject(metadata, Const.metadataPath)
        console.log(`${Util.toUpperLowerCase(type)}'s data file is updated.`)

        await this.updateCollectionIndex(type, dict)
    }

    private static async getData<T>(
        type: "twitter" | "pixiv"
    ): Promise<T | undefined> {
        const filePath = type == "twitter" ? Const.tweetsPath : Const.pixivPath
        if (!filePath) return undefined
        if (!FileIO.existFile(filePath)) return undefined
        return await FileIO.readObject(filePath)
    }

    private static async getCollectionIndex(
        type: "twitter" | "pixiv"
    ): Promise<CollectionIndex> {
        const metadata = await FileIO.readObject<Metadata>(Const.metadataPath)
        return metadata[type].collectionIndex
    }

    private static async updateCollectionIndex(
        type: "twitter" | "pixiv",
        dict: FileDictionary
    ): Promise<void> {
        const metadata: Metadata = await FileIO.readObject(Const.metadataPath)
        const index = metadata[type].collectionIndex

        Object.keys(dict).forEach((filename) => {
            if (!index[filename])
                index[filename] = {
                    state: FileState.notDownloaded,
                    info: dict[filename],
                }
            else if (index[filename].state == FileState.untraced)
                index[filename] = {
                    state: FileState.traced,
                    info: dict[filename],
                }
        })

        await FileIO.writeObject(metadata, Const.metadataPath)
        await this.logCollectionIndexInfo(type)
    }

    private static async rebuildCollectionIndex(
        type: "twitter" | "pixiv"
    ): Promise<void> {
        const metadata: Metadata = await FileIO.readObject(Const.metadataPath)
        metadata[type].collectionIndex = this.lookupAndMergeCollectionIndex(
            type == "twitter"
                ? Const.twitterImageDirectory
                : Const.pixivImageDirectory,
            metadata[type].collectionIndex
        )
        await FileIO.writeObject(metadata, Const.metadataPath)
        await this.logCollectionIndexInfo(type)
    }

    private static lookupAndMergeCollectionIndex(
        path: string,
        oldIndex: CollectionIndex
    ): CollectionIndex {
        const newIndex: CollectionIndex = {}
        // Look at files at this time
        FileIO.listFiles(path).forEach((filename) => {
            if (!oldIndex[filename])
                newIndex[filename] = { state: FileState.untraced }
            else if (oldIndex[filename].state == FileState.notDownloaded)
                newIndex[filename] = {
                    state: FileState.traced,
                    info: oldIndex[filename].info,
                }
            else newIndex[filename] = oldIndex[filename]
        })
        // Look at old index
        Object.keys(oldIndex).forEach((filename) => {
            if (
                !newIndex[filename] &&
                oldIndex[filename].state != FileState.untraced
            )
                newIndex[filename] = {
                    state: FileState.notDownloaded,
                    info: oldIndex[filename].info,
                }
        })
        return newIndex
    }

    private static async logCollectionIndexInfo(
        type: "twitter" | "pixiv"
    ): Promise<void> {
        const metadata: Metadata = await FileIO.readObject(Const.metadataPath)
        const index = metadata[type].collectionIndex
        let tracedCount = 0
        let notDownloadedCount = 0
        let untracedCount = 0
        Object.entries(index).forEach((entry) => {
            switch (entry[1].state) {
                case FileState.traced:
                    tracedCount++
                    break
                case FileState.notDownloaded:
                    notDownloadedCount++
                    break
                case FileState.untraced:
                    untracedCount++
                    break
            }
        })
        console.log(
            `${Util.toUpperLowerCase(type)}'s collection index is updated:`
        )
        console.log(
            `\t${tracedCount} traced, ${notDownloadedCount} traced but not downloaded, ${untracedCount} untraced, `
        )
        console.log(
            `\t${tracedCount + notDownloadedCount} metadata, ${
                tracedCount + untracedCount
            } files, ${
                tracedCount + notDownloadedCount + untracedCount
            } record in total.`
        )
    }
}
