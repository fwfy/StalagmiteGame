import { gameContext } from "../context.js";
import { Entity } from "./index.js";
import { text, moveCamTo } from "../util.js";

export class Player extends Entity {
	constructor() {
		super(gameContext.canvas.width / 2, gameContext.canvas.height / 2, 50, null, "assets/sprites/stalagmite.png", "player");
		gameContext.player = this;
		this.jumpState = 0;
		this.ignoreCamOffset = false;
		this.onGround = false;
		this.noclip = false;
	}
	draw() {
		if (!gameContext.activeCutscene) moveCamTo(this.x, this.y);
		super.draw();
	}
	jump() {
		if (this.onGround) {
			this.y--;
			this.jumpState = 1;
			this.yv = -15;
			this.playSound("jump");
		} else if (!this.onGround && this.jumpState == 1) {
			this.xv *= 2.5;
			this.yv = -15;
			this.jumpState = 2;
		}
	}
	tick() {
		if (!gameContext.activeLevel) return;
		if (!this.noclip) super.tick();
		if (this.onGround) this.jumpState = 0;
		for (const ent of gameContext.ents.filter(e => e.isItem)) {
			if (this.isCollidingWith(ent)) {
				ent.action(this);
			}
		}
		if (gameContext.debugging) {
			let dbgInfo = {
				onGround: this.onGround,
				jumpState: this.jumpState,
				xv: this.xv,
				yv: this.yv,
				x: this.x,
				y: this.y,
				noclip: this.noclip,
				recording: gameContext.recording,
				playingDemo: gameContext.playingDemo,
				pctDemoDone: gameContext.playingDemo ? Math.floor((gameContext.framecount / gameContext.inputs.length * 100)) : 0
			}
			let i = 0;
			for (const prop of Object.keys(this.propsBelow)) {
				text(0, 50 + (15 * i), `${prop}: ${this.propsBelow[prop]}`, "red", 15, false);
				i++;
			}
			for (const prop of Object.keys(dbgInfo)) {
				text(0, 50 + (15 * i), `${prop}: ${dbgInfo[prop]}`, "cyan", 15, false);
				i++;
			}
		}
		if (this.propsAt.goal) {
			gameContext.activeLevel.next();
		}
	}
}