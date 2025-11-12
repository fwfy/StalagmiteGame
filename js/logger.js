export class Logger {
    constructor(name) {
        this.name = name;
    }
    log(msg) {
        console.log(`[${this.name}]\t${msg}`);
    }
}