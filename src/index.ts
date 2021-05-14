import https from "https"
import { SocksProxyAgent } from "socks-proxy-agent"
import Twitter from "twitter"
import token from "../secret/token.json"

async function main() {
    https.globalAgent = new SocksProxyAgent("socks://127.0.0.1:7891")

    const twitter = new Twitter(token)
    const result = await twitter.get("favorites/list", {})
    console.log(result)
}

main()
