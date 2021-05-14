import Const from "./Const"
import FileIO from "./FileIO"
import { FileDictionary } from "./typing/FileDictionary"
import { CollectionIndex, FileState, Metadata } from "./typing/Metadata"

export default class Database {
    static initialize(): void {
        let metadata: Metadata

        if (FileIO.existFile(Const.metadataPath))
            metadata = FileIO.readObject(Const.metadataPath)
        else {
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

        metadata.pixiv.collectionIndex = this.buildCollectionIndex(
            Const.pixivImageDirectory,
            metadata.pixiv.collectionIndex
        )

        FileIO.writeObject(metadata, Const.metadataPath)
    }

    static updateTwitter<T>(data: T, dict: FileDictionary): void {
        this.update("twitter", data, dict)
    }

    static updatePixiv<T>(data: T, dict: FileDictionary): void {
        this.update("pixiv", data, dict)
    }

    static getLastRetrievedTwitter<T>(): T | undefined {
        return this.getLastRetrieved<T>("twitter")
    }

    static getLastRetrievedPixiv<T>(): T | undefined {
        return this.getLastRetrieved<T>("pixiv")
    }

    private static update<T>(
        type: "twitter" | "pixiv",
        data: T,
        dict: FileDictionary
    ): void {
        const filename =
            type == "twitter"
                ? Const.twitterFavoritesFileName
                : Const.pixivFavoritesFileName
        const filePath = FileIO.getFilePathWithDate(
            Const.dataDirectory,
            filename
        )
        FileIO.writeObject(data, filePath)

        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
        metadata[type].lastRetrieved = { filePath: filePath, date: new Date() }
        FileIO.writeObject(metadata, Const.metadataPath)

        this.updateCollectionIndex(type, dict)
    }

    private static getLastRetrieved<T>(
        type: "twitter" | "pixiv"
    ): T | undefined {
        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
        const filePath = metadata[type].lastRetrieved?.filePath
        if (!filePath) return undefined
        if (!FileIO.existFile(filePath)) return undefined
        return FileIO.readObject(filePath)
    }

    private static updateCollectionIndex(
        type: "twitter" | "pixiv",
        dict: FileDictionary
    ): void {
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
