import Const from "./Const"
import FileIO from "./FileIO"
import { CollectionIndexInfo } from "./typing/CollectionIndexInfo"
import { FileDictionary } from "./typing/FileDictionary"
import { CollectionIndex, FileState, Metadata } from "./typing/Metadata"
import Util from "./Util"

export default class Database {
    static async init(): Promise<void> {
        let metadata: Metadata

        if (FileIO.existFile(Const.metadataPath))
            metadata = await FileIO.readObject(Const.metadataPath)
        else {
            console.log("Metadata doesn't exist, create empty metadata file.")
            metadata = {
                twitter: {
                    lastRetrieved: undefined,
                    collectionIndex: {},
                },
                pixiv: {
                    lastRetrieved: undefined,
                    collectionIndex: {},
                },
            }
        }

        metadata.twitter.collectionIndex = this.buildCollectionIndex(
            Const.twitterImageDirectory,
            metadata.twitter.collectionIndex
        )
        console.log("Twitter's collection index is updated.")

        metadata.pixiv.collectionIndex = this.buildCollectionIndex(
            Const.pixivImageDirectory,
            metadata.pixiv.collectionIndex
        )
        console.log("Pixiv's collection index is updated.")

        await FileIO.writeObject(metadata, Const.metadataPath)
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

        const info = await this.updateCollectionIndex(type, dict)
        console.log(
            `${Util.toUpperLowerCase(type)}'s collection index is updated:`
        )
        console.log(
            `\t${info.tracedCount} traced, ${info.notDownloadedCount} traced but not downloaded, ${info.untracedCount} untraced, `
        )
        console.log(
            `\t${info.metadataCount} metadata, ${info.fileCount} files, ${info.total} record in total.`
        )
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
    ): Promise<CollectionIndexInfo> {
        const metadata = await FileIO.readObject<Metadata>(Const.metadataPath)
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

        // Collect numbers of files of each state
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
        return {
            tracedCount,
            notDownloadedCount,
            untracedCount,
            fileCount: tracedCount + untracedCount,
            metadataCount: tracedCount + notDownloadedCount,
            total: tracedCount + notDownloadedCount + untracedCount,
        }
    }

    private static buildCollectionIndex(
        path: string,
        oldIndex: CollectionIndex
    ): CollectionIndex {
        const newIndex: CollectionIndex = {}
        // Look at files at this time
        FileIO.listFiles(path).forEach((filename) => {
            newIndex[filename] = oldIndex[filename] ?? {
                state: FileState.untraced,
            }
        })
        // Look at old index
        Object.keys(oldIndex).forEach((filename) => {
            if (!newIndex[filename]) {
                newIndex[filename] = oldIndex[filename]
                newIndex[filename].state = FileState.notDownloaded
            }
        })
        return newIndex
    }
}
