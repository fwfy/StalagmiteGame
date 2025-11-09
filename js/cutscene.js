import { gameContext } from "./context.js";

export class Cutscene {
	constructor(script) {
		gameContext.activeCutscene = this;
		this.script = script;
		this.pos = 0;
		this.counter = 0;
	}
	draw() {
		let instruction = this.script[this.pos];
		if (instruction.func) instruction.func(this.counter);
		this.counter++;
		if (instruction.canProceedWhen) {
			if (instruction.canProceedWhen(this.counter)) {
				if (instruction.next) {
					this.pos += instruction.next;
				} else {
					this.pos++;
				}
				this.counter = 0;
			}
		} else if (this.counter > instruction.duration) {
			if (instruction.next) {
				this.pos += instruction.next;
			} else {
				this.pos++;
			}
			this.counter = 0;
		}
		if (this.pos > this.script.length - 1) {
			this.end();
		}
	}
	end() {
		gameContext.activeCutscene = false;
	}
}