export interface Metadata {
    twitter: {
        lastRetrieved: LastRetrievedInfo | undefined
        collectionIndex: CollectionIndex
    }
    pixiv: {
        lastRetrieved: LastRetrievedInfo | undefined
        collectionIndex: CollectionIndex
    }
}

export interface LastRetrievedInfo {
    date: Date
}

export interface CollectionIndex {
    [filename: string]: {
        state: FileState
        info: FileInfo | undefined
    }
}

export interface FileInfo {
    id: string
    url: string
}

export enum FileState {
    traced = "traced", // File exists, and its source is known
    notDownloaded = "notDownloaded", // File doesn't exist, but its source is known
    untraced = "untraced", // File exists, but its source is unknown
}
