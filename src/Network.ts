import https from "https"
import { SocksProxyAgent } from "socks-proxy-agent"

export default class Network {
    static useProxy() {
        https.globalAgent = new SocksProxyAgent("socks://127.0.0.1:7891")
    }
}
