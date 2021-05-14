export default class Util {
    static toUpperLowerCase(s: string): string {
        if (s.length == 0) return s
        return s[0].toUpperCase() + s.slice(1)
    }
}
