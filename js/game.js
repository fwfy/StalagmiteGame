import { Miku } from "./entities/miku.js";
import { Menu } from "./menu.js";
import { Cutscene } from "./cutscene.js";
import { Level } from "./level.js";
import { gameContext, setGameContext } from "./context.js";
import { text, blank } from "./util.js";
import { AudioManager } from "./audio.js";
import { DevConnector } from "./devconnector.js";

const assetRoot = window.location.href.replaceAll(/\/$/g, "");

setGameContext({
	debugging: true,
	run: true,
	assetRoot,
	audioManager: null,
	accumulator: 0,
	previousTime: performance.now(),
	started: false,
	bgImg: new Image(),
	dogs: [new Image(), new Image()],
	keysPressed: new Set(),
	ents: [],
	overlays: [],
	framecount: 0,
	camera: {
		x: 0,
		y: 0
	},
	bounds: {
		x: 0,
		y: 0,
		w: 100,
		h: 100
	},
	dbgFlags: {
		disableSpiralPrevention: false,
		showPropmap: false
	},
	activeMenu: null,
	activeLevel: null,
	activeCutscene: null,
	player: null,
	inputs: [],
	recording: false,
	playingDemo: false,
	LEVEL_SEQUENCE: [
		"test2",
		"test"
	],
	sounds: {
		"itemget": {
			channel: "SFX",
			path: `${assetRoot}/assets/sfx/itemget.mp3`
		},
		"jump": {
			channel: "SFX",
			path: `${assetRoot}/assets/sfx/jump.mp3`
		},
		"title": {
			channel: "Music",
			path: `${assetRoot}/assets/music/title.mp3`,
			loop: true
		},
		"dance": {
			channel: "Music",
			path: `${assetRoot}/assets/music/dance.mp3`,
			loop: true
		}
	},
	keyBinds: {
		"arrowup": {
			fn: _ => {
				if (gameContext.activeMenu) {
					if (gameContext.debugging) gameContext.keyBinds["arrowup"].sf = true;
					if (gameContext.activeMenu.nav) gameContext.activeMenu.nav(-1);
				} else if (gameContext.debugging) {
					gameContext.keyBinds["arrowup"].sf = false;
					gameContext.player.y--;
				}
			}, sf: true
		},
		"arrowdown": {
			fn: _ => {
				if (gameContext.activeMenu) {
					if (gameContext.debugging) gameContext.keyBinds["arrowup"].sf = true;
					if (gameContext.activeMenu.nav) gameContext.activeMenu.nav(1);
				} else if (gameContext.debugging) {
					gameContext.keyBinds["arrowdown"].sf = false;
					gameContext.player.y++;
				}
			}, sf: true
		},
		"enter": {
			fn: _ => {
				if (gameContext.activeMenu) {
					if (gameContext.activeMenu.confirm) gameContext.activeMenu.confirm();
				}
			}, sf: true
		},
		"f2": {
			fn: _ => {
				if (!gameContext.debugging || gameContext._DEVCONNECTOR) return;
				new DevConnector();
			}, sf: true
		},
		"m": {
			fn: _ => {
				if (!gameContext.debugging) return;
				new Miku();
			}, sf: true
		},
		"t": {
			fn: _ => {
				gameContext.audioManager.haltAll();
			}, sf: true
		},
		"c": {
			fn: _ => {
				if (!gameContext.debugging) return;
				new Cutscene(gameContext.CUTSCENES.DANCE_OF_DOG);
			}, sf: true
		},
		" ": {
			fn: _ => {
				if (gameContext.player) {
					gameContext.player.jump();
				}
			}, sf: true
		},
		"s": {
			fn: _ => {
				if (gameContext.player) {
					gameContext.player.yv += 1;
				}
			}
		},
		"a": {
			fn: _ => {
				if (gameContext.player) {
					gameContext.player.xv += -0.20;
				}
			}
		},
		"d": {
			fn: _ => {
				if (gameContext.player) {
					gameContext.player.xv += 0.20;
				}
			}
		},
		"u": {
			fn: _ => {
				gameContext.recording = true;
				gameContext.framecount = 0;
				gameContext.player.x = activeLevel.originX;
				gameContext.player.y = activeLevel.originY;
				gameContext.player.xv = 0;
				gameContext.player.yv = 0;
			}, sf: true
		},
		"m": {
			fn: _ => {
				if (!gameContext.debugging) return;
				new Menu(gameContext.MENUS.SECRET_MENU_LAYOUT);
			}
		},
		"i": {
			fn: _ => {
				gameContext.recording = false;
				gameContext.inputs[0] = [];
			}, sf: true
		},
		"p": {
			fn: _ => {
				gameContext.playingDemo = true;
				gameContext.framecount = 0;
				gameContext.player.x = activeLevel.originX;
				gameContext.player.y = activeLevel.originY;
				gameContext.player.xv = 0;
				gameContext.player.yv = 0;
			}, sf: true
		},
		"v": {
			fn: _ => {
				gameContext.player.noclip = !gameContext.player.noclip;
			}, sf: true
		},
		"arrowleft": {
			fn: _ => {
				if (gameContext.debugging) gameContext.player.x--;
			}
		},
		"arrowright": {
			fn: _ => {
				if (gameContext.debugging) gameContext.player.x++;
			}
		},
		"escape": {
			fn: _ => {
				if (gameContext.activeLevel && !gameContext.activeMenu) {
					new Menu(gameContext.MENUS.PAUSE_MENU_LAYOUT);
				}
			}, sf: true
		},
		"k": {
			fn: _ => {
				if (gameContext.player) gameContext.player.kill();
			}, sf: true
		},
		"n": {
			fn: _ => {
				if (gameContext.activeLevel) gameContext.activeLevel.next();
			}, sf: true
		}
	},
	curr_level: 0,
	MENUS: {
		MAIN_MENU_LAYOUT: {
			"title": "Stalagmite Game",
			"title_img": `${assetRoot}/assets/other/title.png`,
			"title_animation": e => { return Math.max(1, 50 + (5 * Math.sin(e / 90))) },
			"defaultOption": "Begin Game",
			"options": {
				"Begin Game": _ => {
					gameContext.audioManager.haltAll();
					gameContext.activeMenu.dismiss();
					new Level(gameContext.LEVEL_SEQUENCE[gameContext.curr_level]);
				},
				"Options": _ => {
					gameContext.activeMenu.openSubMenu(gameContext.MENUS.OPTIONS_LAYOUT);
				}
			}
		},

		RECORDING_LAYOUT: {
			"title": "Input / Demo Recording",
			"options": {
				"Start Recording": _ => {
					gameContext.activeMenu.previousMenu = false;
					gameContext.activeMenu.dismiss();
					beginRecording();
				},
				"Finish Recording": _ => {
					gameContext.activeMenu.previousMenu = false;
					gameContext.activeMenu.dismiss();
					endRecording();
					alert(`Recording finished! Copy the below text to share your input recording:\n\n${exportRecording()}`);
				},
				"Play Recording": async _ => {
					gameContext.activeMenu.previousMenu = false;
					gameContext.activeMenu.dismiss();
					await playRecording(importRecording(prompt(`Paste in some recorded data to play it back!`)));
				}
			}
		},

		PAUSE_MENU_LAYOUT: {
			"title": "Game Paused",
			"options": {
				"Resume": _ => {
					gameContext.activeMenu.dismiss();
				},
				"Options": _ => {
					gameContext.activeMenu.openSubMenu(gameContext.MENUS.OPTIONS_LAYOUT);
				},
				"Recording": _ => {
					gameContext.activeMenu.openSubMenu(gameContext.MENUS.RECORDING_LAYOUT);
				},
				"Return to Main Menu": _ => {
					gameContext.audioManager.playSound("title");
					blank();
					gameContext.player.remove();
					gameContext.activeLevel = null;
					gameContext.activeMenu.dismiss();
					new Menu(gameContext.MENUS.MAIN_MENU_LAYOUT);
				}
			}
		},

		OPTIONS_LAYOUT: {
			"title": "Options",
			"options": {
				"Toggle Debug": _ => {
					gameContext.debugging = !gameContext.debugging;
				},
				"Back": _ => {
					gameContext.activeMenu.dismiss();
				}
			}
		},

		ISRAEL_LAYOUT: {
			"title_img": `${assetRoot}/assets/other/israel.webp`,
			"title": "Israel Configuration Menu",
			"options": {
				"Commit Warcrime": _ => { },
				"Acquire Funding": _ => { },
				"Abolish": _ => { }
			}
		},

		CONNECTOR_LAYOUT: {
			"title": "DevConnector",
			"options": {
				"Enable DevConnector": _ => {
					new DevConnector();
				},
				"Back": _ => {
					gameContext.activeMenu.dismiss();
				}
			}
		},

		MENU_STRESS_LAYOUT: {
			"title": "BIG MENU",
			"init": _ => {
				for (let i = 0; i < 20; i++) {
					gameContext.activeMenu.layout.options["BIG ".repeat(i + 1)] = _ => { };
				}
			},
			options: {}
		},

		SECRET_MENU_LAYOUT: {
			"title": "ALL MENUS",
			"init": _ => {
				for (const m in gameContext.MENUS) {
					let menu = gameContext.MENUS[m];
					gameContext.activeMenu.layout.options[menu.title] = _ => { gameContext.activeMenu.openSubMenu(menu) };
				}
			},
			"options": {}
		}
	},
	CUTSCENES: {
		TEST_CUTSCENE: [
			{
				duration: 1000,
				func: _ => {
					gameContext.camera.x += 2;
				}
			},
			{
				duration: 500,
			},
			{
				duration: 800,
				func: _ => {
					gameContext.camera.x *= 0.99;
				},
				canProceedWhen: _ => gameContext.camera.x <= gameContext.player.x
			}
		],

		DANCE_OF_DOG: [
			{
				func: _ => {
					gameContext.audioManager.haltAll();
					gameContext.ctx.fillStyle = "black";
					gameContext.ctx.globalAlpha = 1;
					gameContext.ctx.fillRect(0, 0, gameContext.canvas.width, gameContext.canvas.height);
					gameContext.audioManager.playSound("dance");
				},
				canProceedWhen: _ => true
			},
			{
				func: _ => {
					gameContext.ctx.fillStyle = "black";
					gameContext.ctx.globalAlpha = 1;
					gameContext.ctx.fillRect(0, 0, gameContext.canvas.width, gameContext.canvas.height);
					gameContext.ctx.drawImage(gameContext.dogs[0], (gameContext.canvas.width / 2) - (gameContext.dogs[0].width * 5), (gameContext.canvas.height / 2) - (gameContext.dogs[0].height * 5), gameContext.dogs[0].width * 10, gameContext.dogs[0].height * 10);
					if (gameContext.debugging) {
						text(gameContext.canvas.width / 2, gameContext.canvas.height * 0.75, `(You tried to load an unknown level, but all you found was this dog!)`, "white", 20, true);
					}
				},
				duration: 50
			},
			{
				func: _ => {
					gameContext.ctx.fillStyle = "black";
					gameContext.ctx.globalAlpha = 1;
					gameContext.ctx.fillRect(0, 0, gameContext.canvas.width, gameContext.canvas.height);
					gameContext.ctx.drawImage(gameContext.dogs[1], (gameContext.canvas.width / 2) - (gameContext.dogs[0].width * 5), (gameContext.canvas.height / 2) - (gameContext.dogs[0].height * 5), gameContext.dogs[1].width * 10, gameContext.dogs[1].height * 10);
					if (gameContext.debugging) {
						text(gameContext.canvas.width / 2, gameContext.canvas.height * 0.75, `(You tried to load an unknown level, but all you found was this dog!)`, "white", 20, true);
					}
				},
				duration: 50,
				next: -1
			}
		]
	}
});

gameContext.canvas = document.getElementById("game_canvas");
gameContext.ctx = gameContext.canvas.getContext("2d");
gameContext.PHYSICS_HZ = 160;
gameContext.PHYSICS_TICK_MS = 1000 / gameContext.PHYSICS_HZ;

gameContext.dogs[0].src = `${gameContext.assetRoot}/assets/other/dog1.png`;
gameContext.dogs[1].src = `${gameContext.assetRoot}/assets/other/dog2.png`;

function beginRecording() {
	gameContext.inputs = [];
	gameContext.recording = true;
	gameContext.framecount = 0;
	gameContext.player.x = gameContext.activeLevel.originX;
	gameContext.player.y = gameContext.activeLevel.originY;
	gameContext.player.xv = 0;
	gameContext.player.yv = 0;
}

function endRecording() {
	gameContext.recording = false;
	gameContext.inputs[0] = [`${gameContext.activeLevel.name}`];
	console.log(exportRecording());
	return gameContext.inputs;
}

async function playRecording(input_sequence = gameContext.inputs) {
	if(input_sequence[0]?.[0]?.[0] == "%") { // handle loading of a specific level
		gameContext.player.remove();
		let level = new Level(input_sequence.shift()[0].slice(1));
		await new Promise((resolve) => {
			setInterval(_ => {
				if(level.doneLoading) resolve();
			},100);
		});
	}
	gameContext.inputs = input_sequence;
	gameContext.framecount = 0;
	gameContext.accumulator = 0;
	gameContext.player.x = gameContext.activeLevel.originX;
	gameContext.player.y = gameContext.activeLevel.originY;
	gameContext.player.xv = 0;
	gameContext.player.yv = 0;
	gameContext.playingDemo = true;
}

function exportRecording(input_sequence = gameContext.inputs) {
	let out = [];
	let currSameStreak = 0;
	let lastInput = null;
	for (const inp of input_sequence) {
		const input = inp.join("+");
		if (lastInput === input) {
			currSameStreak++;
		} else {
			if (currSameStreak > 0) {
				out.push(`#${currSameStreak}`);
				currSameStreak = 0;
			}
			lastInput = input;
			out.push(input);
		}
	}
	if (currSameStreak > 0) out.push(`#${currSameStreak}`);
	return btoa(out.join(","));
}

function importRecording(encoded) {
	const tokens = atob(encoded).split(",");
	const output = [];
	let lastFrame = [];

	for (const token of tokens) {
		if (token.startsWith("#")) {
			const repeatCount = parseInt(token.slice(1), 10);
			for (let i = 0; i < repeatCount; i++) {
				output.push([...lastFrame]);
			}
		} else {
			const frame = token ? token.split("+") : [];
			output.push(frame);
			lastFrame = frame;
		}
	}
	return output;
}


async function getAudioFromFile(filepath) {
	const response = await fetch(filepath);
	const arrayBuffer = await response.arrayBuffer();
	const audioBuffer = await gameContext.audioContext.decodeAudioData(arrayBuffer);
	return audioBuffer;
}

async function loadSounds() {
	if (gameContext.soundsLoaded || gameContext.soundsLoading) return;
	gameContext.audioManager = new AudioManager();
	let soundPromises = [];
	gameContext.soundsLoading = true;
	for (const soundName of Object.keys(gameContext.sounds)) {
		let sound = gameContext.sounds[soundName];
		soundPromises.push(gameContext.audioManager.registerSound(soundName, sound.path, sound.channel, sound.loop))
	}
	await Promise.all(soundPromises);
	console.log(`finished loading all sounds`);
	gameContext.soundsLoaded = true;
	gameContext.soundsLoading = false;
}

function renderAll() {
	for (const ent of gameContext.ents) {
		if (ent.visible) ent.draw();
	}
}

// TODO: either bring back or get rid of this. it caused too many issues during refactoring
/* function fatal(err = "Unknown fatal error.") {
	if (fatal_triggered) return console.warn("Multiple fatal() calls! This is probably bad.");
	fatal_triggered = true;
	run = false;
	cancelAnimationFrame(animFrameID);
	ctx.fillStyle = "black";
	ctx.globalAlpha = 1;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	if (debugging) {
		const debug = {
			err,
			ents,
			accumulator,
			queuedSounds,
			PHYSICS_HZ,
			camera,
			bounds,
			activeMenu,
			activeLevel,
			activeCutscene,
			LEVEL_SEQUENCE,
			curr_level
		}
		const debugStr = JSON.stringify(debug, (k, v) => {
			let forbidden = ["propmap", "propmapData"];
			let passthruTypes = ["string", "number", "boolean", "object"];
			if (forbidden.includes(k)) {
				return "(Redacted)";
			} else if (v === null) {
				return null;
			} else if (!passthruTypes.includes(typeof v)) {
				return `<${typeof v}>`;
			} else if (v.constructor) {
				v["$CLASSTYPE"] = v.constructor.name;
				return v;
			}
			return v;
		});
		const body = new TextEncoder().encode(debugStr);
		const lengthBytes = new Uint8Array(4);
		new DataView(lengthBytes.buffer).setUint32(0, body.length);
		const data = new Uint8Array(4 + body.length);
		data.set(lengthBytes, 0);
		data.set(body, 4);
		const width = canvas.width;
		const height = canvas.height;
		const imgData = ctx.getImageData(0, 0, width, height);
		const pixels = imgData.data;
		let byteIdx = 0;
		for (let i = 0; i < pixels.length; i += 4) {
			let pixIdx = i / 4;
			let x = (pixIdx % width);
			let y = Math.floor(pixIdx / width);
			if (byteIdx > data.length) {
				let w = fatalErr[(Math.floor(y / 5) % 10) * 59 + (Math.floor(x / 5) % 59)];
				pixels[i] = w ? 255 : 0;
				pixels[i + 1] = w ? 255 : 0;
				pixels[i + 2] = 255;
				pixels[i + 3] = 255;
			} else {
				pixels[i] = data[byteIdx++] || 0;
				pixels[i + 1] = data[byteIdx++] || 0;
				pixels[i + 2] = data[byteIdx++] || 0;
				pixels[i + 3] = 255;
			}
		}
		ctx.putImageData(imgData, 0, 0);
		throw err;
	} else {
		text(0, 0, "Something went wrong. Check the console for details.", "red", 10, false);
		throw err;
	}
}

function dbg_fatal(err = "Unknown dbg_fatal() call") {
	if (debugging) fatal(err);
} */

function tickAll() {
	for (const ent of gameContext.ents) {
		ent.tick();
	}
}

function processKeys() {
	if (gameContext.playingDemo && gameContext.framecount >= gameContext.inputs.length) {
		gameContext.playingDemo = false;
		return;
	}
	if (gameContext.playingDemo) {
		gameContext.keysPressed.clear();
		for (const k of gameContext.inputs[gameContext.framecount]) {
			gameContext.keysPressed.add(k);
		}
	}
	for (const k of Object.keys(gameContext.keyBinds)) {
		if (gameContext.keysPressed.has(k)) {
			gameContext.keyBinds[k].fn();
			if (gameContext.recording && !gameContext.activeMenu) {
				if (!gameContext.inputs[gameContext.framecount]) {
					gameContext.inputs[gameContext.framecount] = [k];
				} else {
					gameContext.inputs[gameContext.framecount].push(k);
				}
			}
			if (gameContext.keyBinds[k]?.sf) gameContext.keysPressed.delete(k);
		}
	}
	if (gameContext.recording && !gameContext.inputs[gameContext.framecount]) gameContext.inputs[gameContext.framecount] = [];
}

function gameLoop(currentTime) {
	// some physics lag prevention stuff
	// tl;dr: if a gameLoop takes more than PHYSICS_TICK_MS, it'll tick physics more than once during the frame to keep physics running at a predictable pace.
	// this also uncouples the physics code from the speed at which the user's monitor refreshes, so John on his shitty 60hz screen won't have a slower game than Joe on his 165hz.
	// BUG: the below line is ran every frame because this property of the canvas seems to like mysteriously changing itself.
	gameContext.ctx.imageSmoothingEnabled = false;
	if (!gameContext.run) return;
	let deltaTime = currentTime - gameContext.previousTime;
	gameContext.previousTime = currentTime;
	gameContext.accumulator += deltaTime;

	gameContext.ents = gameContext.ents.filter(e => !e._kill); // remove all entities marked for deletion


	let shouldRender = true;

	while (gameContext.accumulator >= gameContext.PHYSICS_TICK_MS) {
		gameContext.framecount++;
		blank();
		if (gameContext.activeCutscene) {
			shouldRender = false;
			if (gameContext.activeCutscene.draw) gameContext.activeCutscene.draw();
		} else if (gameContext.activeMenu) {
			shouldRender = false;
			if (gameContext.activeMenu.draw) gameContext.activeMenu.draw();
		} else {
			tickAll();
		}
		processKeys();
		gameContext.accumulator -= gameContext.PHYSICS_TICK_MS;
	}

	if (gameContext.accumulator > 20 * gameContext.PHYSICS_TICK_MS && !gameContext.dbgFlags.disableSpiralPrevention) {
		gameContext.accumulator = 20 * gameContext.PHYSICS_TICK_MS; // if the user's pc is REALLY STRUGGLING to run the game, this will prevent it from entering a death spiral
		if (gameContext.debugging) text(0, 15, "LAG!", "red", 15, false);
	} else {
		if (gameContext.debugging) text(0, 15, `${gameContext.accumulator.toFixed(0)}`, "red", 15, false);
	}

	if (shouldRender) renderAll();

	if (gameContext.debugging) {
		text(0, 0, "DEBUG MODE", "red", 15, false);
	}

	for(const overlay of gameContext.overlays) {
		overlay();
	}

	if (gameContext.run) gameContext.animFrameID = window.requestAnimationFrame(gameLoop);
}

function startGameOnKeypress() {
	if (gameContext.started) return;
	gameContext.started = true;
	gameContext.keysPressed.clear();
	gameContext.audioManager.playSound("title");
	new Menu(gameContext.MENUS.MAIN_MENU_LAYOUT);
	startGame();
}

function startGame() {
	gameContext.accumulator = 0;
	gameContext.previousTime = performance.now();
	window.requestAnimationFrame(gameLoop);
}

gameContext.startGame = startGame;

document.addEventListener("keydown", function (e) {
	console.log(e.key);
	gameContext.keysPressed.add(e.key.toLowerCase());
});

document.addEventListener("keyup", function (e) {
	gameContext.keysPressed.delete(e.key.toLowerCase());
});

document.addEventListener("mousedown", function (e) {
	loadSounds();
	startGameOnKeypress();
});

// scaleCanvas();
gameContext.canvas.width = 1500;
gameContext.canvas.height = 800;

blank();
text(gameContext.canvas.width / 2, gameContext.canvas.height / 2, "Click anywhere to start!", "white", 60, true);
window.gameContext = gameContext;