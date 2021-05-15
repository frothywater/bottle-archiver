/* eslint-disable @typescript-eslint/no-unused-vars */
import Database from "./Database"
import Network from "./Network"
import Pixiv from "./Pixiv"

async function main() {
    Network.useProxy()
    await Database.init()
    const pixiv = new Pixiv()
    await pixiv.init()
    await pixiv.updateFavorites()
}

main()
