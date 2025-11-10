import { Player } from "./entities/player.js";
import { Cutscene } from "./cutscene.js";
import { gameContext } from "./context.js";
import { camOffset, rect, rgbToHex } from "./util.js";

export class Level {
	constructor(name) {
		this.name = name;
		this._levelBgReady = false;
		this._propmapReady = false;
		this.levelBg = new Image();
		this.levelBg.src = `assets/levels/${name}/level.png`;
		this.levelBg.onload = _ => this.levelBgLoaded();
		this.levelBg.onerror = _ => this.dogcheck();
		this.propmapImg = new Image();
		this.propmapImg.src = `assets/levels/${name}/propmap.png`;
		this.propmapImg.onload = _ => this.propmapLoaded();
		this.propmapImg.onerror = _ => this.dogcheck();
		this.propmapCanvas = document.createElement("canvas");
		this.propmapCtx = this.propmapCanvas.getContext("2d");
		this.originX = 0;
		this.originY = 0;
		this.isTransitioning = false;
	}
	levelBgLoaded() {
		gameContext.bgImg = this.levelBg;
		console.log("levelbg is loaded");
		gameContext.bounds.x = 0;
		gameContext.bounds.y = 0;
		gameContext.bounds.w = this.levelBg.width;
		gameContext.bounds.h = this.levelBg.height;
		this._levelBgReady = true;
		this.checkReady();
	}
	dogcheck() {
		new Cutscene(gameContext.CUTSCENES.DANCE_OF_DOG);
	}
	propmapLoaded() {
		this.propmapCanvas.width = this.propmapImg.width;
		this.propmapCanvas.height = this.propmapImg.height;
		this.propmapCtx.drawImage(this.propmapImg, 0, 0);
		this.propmapData = this.propmapCtx.getImageData(0, 0, this.propmapImg.width, this.propmapImg.height);
		this.propmap = this.propmapData.data;
		for (let i = 0; i < this.propmap.length; i += 4) {
			let isOrigin = rgbToHex(this.propmap[i], this.propmap[i+1], this.propmap[i+2]) == "#00FFFF";
			if (isOrigin) {
				let pixelIndex = i / 4;
				this.originX = pixelIndex % this.propmapData.width;
				this.originY = Math.floor(pixelIndex / this.propmapData.width);
				console.log(`found level origin for ${this.name} @ X: ${this.originX}, Y: ${this.originY}`);
				break;
			}
		}
		console.log("propmap is loaded");
		this._propmapReady = true;
		// bgImg = this.propmapImg;
		this.checkReady();
	}
	checkReady() {
		if (this._levelBgReady && this._propmapReady) {
			this.levelReady();
		}
	}
	levelReady() {
		new Player();
		gameContext.player.x = this.originX;
		gameContext.player.y = this.originY;
		gameContext.activeLevel = this;
		console.log(`level ${this.name} finished loading`);
	}
	getProps(x, y) {
		x = Math.floor(x);
		y = Math.floor(y);
		if (gameContext.debugging) {
			let { x: plotX, y: plotY } = camOffset(x, y);
			rect(plotX-2.5, plotY-2.5, 5, 5, "green");
		}
		const index = (y * this.propmapImg.width + x) * 4;
		const color = rgbToHex(this.propmap[index], this.propmap[index + 1], this.propmap[index + 2])
		return {
			collision: color == "#FF0000" || typeof this.propmap[index] == "undefined",
			conditionalCollision: color == "#FFFF00",
			hazardous: color == "#FFAA00",
			goal: color == "#00FF00",
			rawH: color,
			rawR: this.propmap[index],
			rawG: this.propmap[index + 1],
			rawB: this.propmap[index + 2]
		}
	}
	next() {
		if(this.isTransitioning) return; // prevent level skipping (i think?)
		this.isTransitioning = true;
		gameContext.player.remove();
		gameContext.curr_level++;
		return new Level(gameContext.LEVEL_SEQUENCE[gameContext.curr_level]);
	}
}