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

        metadata.twitter.collectionIndex = this.getCollectionIndex(
            Const.twitterImageDirectory,
            metadata.twitter.collectionIndex
        )

        metadata.pixiv.collectionIndex = this.getCollectionIndex(
            Const.pixivImageDirectory,
            metadata.pixiv.collectionIndex
        )

        FileIO.writeObject(metadata, Const.metadataPath)
    }

    static updateCollectionIndex(
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

    static updateLastRetrieved(
        type: "twitter" | "pixiv",
        filename: string
    ): void {
        const metadata = FileIO.readObject<Metadata>(Const.metadataPath)
        metadata[type].lastRetrieved = { filename, date: new Date() }
        FileIO.writeObject(metadata, Const.metadataPath)
    }

    private static getCollectionIndex(
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
