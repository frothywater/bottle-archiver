import Const from "./Const"
import FileIO from "./FileIO"
import { CollectionIndexInfo } from "./typing/CollectionIndexInfo"
import { FileDictionary } from "./typing/FileDictionary"
import { CollectionIndex, FileState, Metadata } from "./typing/Metadata"
import Util from "./Util"

export default class Database {
    static initialize(): void {
        let metadata: Metadata

        if (FileIO.existFile(Const.metadataPath))
            metadata = FileIO.readObject(Const.metadataPath)
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

        FileIO.writeObject(metadata, Const.metadataPath)
    }

    static updateTwitter<T>(data: T, dict: FileDictionary): void {
        this.update("twitter", data, dict)
    }

    static updatePixiv<T>(data: T, dict: FileDictionary): void {
        this.update("pixiv", data, dict)
    }

    static getTweets<T>(): T | undefined {
        return this.getData<T>("twitter")
    }

    static getPixiv<T>(): T | undefined {
        return this.getData<T>("pixiv")
    }

    static getTweetIndex(): CollectionIndex {
        return this.getCollectionIndex("twitter")
    }

    static getPixivIndex(): CollectionIndex {
        return this.getCollectionIndex("pixiv")
    }

    private static update<T>(
        type: "twitter" | "pixiv",
        data: T,
        dict: FileDictionary
    ): void {
        const filePath = type == "twitter" ? Const.tweetsPath : Const.pixivPath
        FileIO.writeObject(data, filePath)

        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
        metadata[type].lastRetrieved = { date: new Date() }
        FileIO.writeObject(metadata, Const.metadataPath)
        console.log(`${Util.toUpperLowerCase(type)}'s data file is updated.`)

        const info = this.updateCollectionIndex(type, dict)
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

    private static getData<T>(type: "twitter" | "pixiv"): T | undefined {
        const filePath = type == "twitter" ? Const.tweetsPath : Const.pixivPath
        if (!filePath) return undefined
        if (!FileIO.existFile(filePath)) return undefined
        return FileIO.readObject(filePath)
    }

    private static getCollectionIndex(
        type: "twitter" | "pixiv"
    ): CollectionIndex {
        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
        return metadata[type].collectionIndex
    }

    private static updateCollectionIndex(
        type: "twitter" | "pixiv",
        dict: FileDictionary
    ): CollectionIndexInfo {
        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
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

        FileIO.writeObject(metadata, Const.metadataPath)

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
