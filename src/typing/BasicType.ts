import { PixivIllust } from "pixiv-app-api/dist/PixivTypes"

export interface Tweet {
    id_str: string
    created_at: string
    extended_entities?: {
        media?: TwitterMedia[]
    }
}

interface TwitterMedia {
    media_url_https: string
}

export type Illust = PixivIllust
