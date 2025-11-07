import { Item } from "./item.js";

export class Miku extends Item {
	constructor() {
		super(Math.random() * canvas.width, 10, "assets/sprites/miku.webp", "miku");
	}
	action(ent) {
		new Miku();
		new Miku();
		// playSound("ooeeoo");
		this.remove();
	}
}