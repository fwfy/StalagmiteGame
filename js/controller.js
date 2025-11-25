import { gameContext } from "./context.js";
import { createLogger } from "./logger.js";
import { Cutscene } from "./cutscene.js";

function determineControllerProfile(id) {
    let normalized = id.toLowerCase().trim();
    if (normalized.includes("xbox")) return "XBOX";
    return "GENERIC";
}

const CONTROLLER_LAYOUTS = {
    "XBOX": [
        " ",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "w",
        "s",
        "a",
        "d",
        "escape"
    ]
}

export class ControllerInputHandler {
    #log = createLogger(`ControllerInput`);
    constructor() {
        window.addEventListener("gamepadconnected", this.onGamepadConnected.bind(this));
        this.gamepadRegistered = false;
        this.gp = null;
        this.lastInputs = [];
        this.theorem = false;
    }
    onGamepadConnected(event) {
        if (this.gamepadRegistered) return;
        this.gamepadRegistered = true;
        this.gp = navigator.getGamepads()[event.gamepad.index];
        this.profileName = determineControllerProfile(this.gp.id)
        this.profile = CONTROLLER_LAYOUTS[this.profileName];
        this.#log(`New gamepad connected! ID: ${this.gp.id}. Has ${this.gp.buttons.length} buttons, ${this.gp.axes.length} axes.`);
        this.#log(`We will use the ${this.profileName} input profile for this device.`);
        this.lastInputs = this.gp.buttons.map(b => ({ pressed: b.pressed, value: b.value }));
    }
    applyPowerCurve(input) {
        return Math.sign(input) * Math.pow(input, 2);
    }
    deadzone(input) {
        return Math.abs(input) > 0.1;
    }
    processAxis(input) {
        return this.deadzone(input) * this.applyPowerCurve(input);
    }
    update() {
        if (!this.gamepadRegistered) return;
        let pressed = 0;
        for (let i = 0; i < this.profile.length; i++) {
            if(this.gp.buttons[i].pressed) pressed++;
            if (this.gp.buttons[i].pressed && !this.lastInputs[i].pressed) { // newly pressed button on this frame
                let mapping = this.profile[i];
                if (mapping) gameContext.keysPressed.add(mapping);
            } else if (!this.gp.buttons[i].pressed && this.lastInputs[i].pressed) { // input was let go
                let mapping = this.profile[i];
                if (mapping) gameContext.keysPressed.delete(mapping);
            }
        }
        if(gameContext.player) {
            gameContext.player.xv += this.processAxis(this.gp.axes[0]) * gameContext.player.speed;
            gameContext.player.lookXO = this.processAxis(this.gp.axes[4]) * 500;
            gameContext.player.lookYO = this.processAxis(this.gp.axes[5]) * 500;
        }
        if(pressed == this.profile.length - 7 && !this.theorem) { // fix: subtract two because dpad conflicts, and another two because clicking the sticks might be impossible, and another two because triggers aren't recognized even though they're buttons on the standard layout
            // uh oh
            this.theorem = true;
            new Cutscene(gameContext.CUTSCENES.THEOREM);
        }
        this.lastInputs = this.gp.buttons.map(b => ({ pressed: b.pressed, value: b.value }));
    }
}