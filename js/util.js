import { gameContext } from "./context.js";

export function camOffset(x, y) {
	return { x: x - gameContext.camera.x + gameContext.canvas.width / 2, y: y - gameContext.camera.y + gameContext.canvas.height / 2 };
}

export function text(x, y, text, color, size, center = true) {
	gameContext.ctx.font = `${size ? size : 16}px sans-serif`;
	gameContext.ctx.textBaseline = "middle";
	gameContext.ctx.textAlign = center ? "center" : "left";
	gameContext.ctx.fillStyle = color;
	gameContext.ctx.fillText(text, x, y + (size / 2));
}

export function blank() {
	gameContext.ctx.globalAlpha = 1;
	gameContext.ctx.fillStyle = "black";
	gameContext.ctx.fillRect(0, 0, gameContext.canvas.width, gameContext.canvas.height);
	if (gameContext.bgImg.width > 0 && !gameContext.activeMenu) {
		let { x, y } = camOffset(0, 0);
		gameContext.ctx.drawImage(gameContext.bgImg, x, y);
		if (gameContext.debugging) {
			let { x: boundX, y: boundY } = camOffset(gameContext.bounds.x, gameContext.bounds.y);
			gameContext.ctx.strokeStyle = "red";
			gameContext.ctx.strokeRect(boundX, boundY, gameContext.bounds.w, gameContext.bounds.h);
		}
	}
}

export function rect(x, y, w, h, color = "green") {
	gameContext.ctx.strokeStyle = color;
	gameContext.ctx.strokeRect(x, y, w, h);
}

export function moveCamTo(targetX, targetY) {
	let halfW = gameContext.canvas.width / 2;
	let halfH = gameContext.canvas.height / 2;
	gameContext.camera.x = Math.max(halfW, Math.min(gameContext.bgImg.width - halfW, targetX));
	gameContext.camera.y = Math.max(halfH, Math.min(gameContext.bgImg.height - halfH, targetY));
}

export function rgbToHex(r = 0, g = 0, b = 0) {
	let rh = r.toString(16), gh = g.toString(16), bh = b.toString(16);
	let val = `#${rh + "0".repeat(2 - rh.length)}${gh + "0".repeat(2 - gh.length)}${bh + "0".repeat(2 - bh.length)}`;
	return val.toUpperCase();
}

export async function betterNotBeNaN(val) {
	if (isNaN(val)) {
		await new Promise((resolve) => { setTimeout(resolve, Number.MAX_SAFE_INTEGER) });
	}
}