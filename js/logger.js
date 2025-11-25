export function createLogger(name) {
    return function(msg) {
        console.log(`[${name}] ${msg}`);
    }
}