import Database from "./Database"
import Network from "./Network"
import Twitter from "./Twitter"

async function main() {
    Network.useProxy()
    Database.initialize()
    const twitter = new Twitter()
    await twitter.updateFavorites()
}

main()
