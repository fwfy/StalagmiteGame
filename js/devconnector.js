import { gameContext } from "./context.js";
import { createLogger } from "./logger.js";
import { text } from "./util.js";

export class DevConnector {
    #log = createLogger("DevConnector");
    constructor() {
        if(gameContext._DEVCONNECTOR) throw new Error("There's already an instance of DevConnector attached!");
        gameContext._DEVCONNECTOR = true;
        gameContext.assetRoot = `https://127.0.0.1:22422`;
        this.ws = null;
        this.connecting = false;
        this.errored = false;
        this.overlayText = "";
        gameContext.overlays.push(this.overlay.bind(this));
        gameContext.dbgFlags.showPropmap = true;
        this.setupConnection();
    }
    overlay(forced = false) {
        text(gameContext.canvas.width / 2, forced ? 15 : 0, this.overlayText, "#F0F", 15, true);
    }
    status(msg) {
        this.overlayText = `DEVCONNECTOR: ${msg}`;
        this.overlay(true);
    }
    setupConnection() {
        if (this.connecting) return;
        this.connecting = true;
        try {
            this.#log(`Connecting to local DevConnector instance...`);
            this.status("Setting up connection...");
            this.ws = new WebSocket("wss://127.0.0.1:22422");
            this.ws.addEventListener("open", this.wsOpen.bind(this));
            this.ws.addEventListener("close", this.wsError.bind(this));
            this.ws.addEventListener("error", this.wsError.bind(this));
            this.ws.addEventListener("message", this.wsMessage.bind(this));
        } catch (err) {
            this.status("Connection failed! :(");
            alert(`Failed to open connection to the local dev server.\n\nError details: ${err}`);
        } finally {
            this.connecting = false;
        }
    }
    wsError(err) {
        if (this.errored) return;
        this.errored = true;
        this.status("Connection lost! :(");
        const retry = confirm(`Connection to the local dev server was lost. Would you like to try again?\n\nError details: ${err}`);
        if (retry) {
            this.errored = false;
            this.setupConnection();
        }
    }
    wsOpen() {
        this.#log(`Connection established!`);
        this.status("Connected and waiting for changes!");
    }
    async wsMessage(data) {
        let msg = data.data;
        console.log(msg);
        switch(msg) {
            case "reload_levelbg":
                this.status("Reloading the levelBg...");
                gameContext.run = false;
                gameContext?.activeLevel?.loadLevelBg();
                await new Promise((resolve) => {
                    setInterval(_ => {
                        if(gameContext.activeLevel._levelBgReady) resolve()
                    }, 100);
                });
                gameContext.run = true;
                gameContext.startGame();
                this.status("Reloaded the levelBg!");
                break;
            case "reload_propmap":
                this.status("Reloading the propmap...");
                gameContext.run = false;
                gameContext?.activeLevel?.loadPropmap();
                await new Promise((resolve) => {
                    setInterval(_ => {
                        if(gameContext.activeLevel._propmapReady) resolve()
                    }, 100);
                });
                gameContext.run = true;
                gameContext.startGame();
                this.status("Reloaded the propmap!");
                break;
        }
    }
}