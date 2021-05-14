/* eslint-disable @typescript-eslint/no-unused-vars */
import Database from "./Database"
import Network from "./Network"

async function main() {
    Network.useProxy()
    Database.initialize()
}

main()
