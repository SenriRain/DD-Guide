String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` };
const config = require('./config.json');
const Vec3 = require('tera-vec3');
const mapID = [9782, 9982];
const HuntingZn = [782, 982];
const BossID = [1000, 2000, 3000];

const FirstBossActions = {
	107: {msg: '后喷(击退)'},
	109: {msg: '滚石!!'},
	110: {msg: '滚石!!'},
	301: {msg: '地刺(眩晕)'},
	309: {msg: '1朵花-鉴定!!'},
	310: {msg: '2朵花-鉴定!!'},
	116: {msg: '全屏'},
	312: {msg: '金色花'}
};
const SecondBossActions = {
	113: {msg: '双手(眩晕)'},
	114: {msg: '三连地板(靠近)'},
	301: {msg: '出-旋转(击退)'},
	302: {msg: '进-捶地(击飞)'}
};
const ThirdBossActions = {
	118: {msg: '三连击(左-右-喷)'},
	143: {msg: '↑左(远) 左后'}, // 140 ?
	145: {msg: '↑左(远) 左后'},
	146: {msg: '↑左(远) 左后 (左后扩散)'},
	154: {msg: '↑左(远) 左后 (左后扩散)'},
	144: {msg: '↓右(近) 右后'},
	147: {msg: '↓右(近) 右后'},
	148: {msg: '↓右(近) 右后 (右后扩散)'},
	155: {msg: '↓右(近) 右后 (右后扩散)'},
	139: {msg: '←顺时针139 (摆头抬脚 打右边)', sign_degrees: 270, sign_distance: 200}, //151
//未录像次技能 猜测?150: {msg: '←顺时针139 (落地直接 打右边)', sign_degrees: 270, sign_distance: 200}, //151
	141: {msg: '逆时针141→ (摆头抬脚 打左边)', sign_degrees: 90, sign_distance: 200}, //153
	152: {msg: '逆时针152→ (落地直接 打左边)', sign_degrees: 90, sign_distance: 200}, //153
	//160: {msg: '左-右-左'},
	161: {msg: '左-右-左 (后砸) (前砸)'},
	162: {msg: '左-右-左 (后砸) (前砸)'},
	300: {msg: '闪避!!'},
	360: {msg: '爆炸!!爆炸!!'}
};

module.exports = function ccGuide(d) {
	let	enabled = config.enabled,
		sendToParty = config.sendToParty,
		streamenabled = config.streamenabled,

		insidemap = false,
		insidezone = false,
		whichmode = 0,
		whichboss = 0,
		hooks = [], bossCurLocation, bossCurAngle, uid0 = 999999999, uid1 = 899999999, uid2 = 799999999;

	d.hook('S_LOAD_TOPO', 3, sLoadTopo);

	d.command.add('ddinfo', (arg) => {
		d.command.message('模块开关: '.clr('00FFFF') + enabled);
		d.command.message('副本地图: ' + insidemap);
		d.command.message('区域位置: ' + insidezone);
		d.command.message('副本难度: ' + whichmode);
		d.command.message('副本首领: ' + whichboss);
		d.command.message('发送通知 ' + (sendToParty ? '组队'.clr('56B4E9') : '自己'.clr('E69F00')));
	})
	d.command.add('ddg', (arg) => {
		if (!arg) {
			enabled = !enabled;
			d.command.message('辅助提示 ' + (enabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
		} else {
			switch (arg) {
				case "party":
					sendToParty = !sendToParty;
					d.command.message('发送通知 ' + (sendToParty ? '组队'.clr('56B4E9') : '自己'.clr('E69F00')));
					break;
				case "proxy":
					streamenabled = !streamenabled;
					d.command.message('代理频道 ' + (streamenabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				default :
					d.command.message('无效的参数!'.clr('FF0000'));
					break;
			}
		}
	});

	function sLoadTopo(event) {
		if (event.zone === mapID[0]) {								
			insidemap = true;
			d.command.message('进入副本: ' + '里安的地下殿堂 '.clr('56B4E9') + '[下级]'.clr('E69F00'));
			load();
		} else if (event.zone === mapID[1]) {
			insidemap = true;
			d.command.message('进入副本: ' + '里安的地下殿堂 '.clr('56B4E9') + '[上级]'.clr('00FFFF'));
			load();
		} else {
			unload();
		}
    }

	function load() {
		if (!hooks.length) {
			hook('S_BOSS_GAGE_INFO', 3, sBossGageInfo);
			hook('S_ACTION_STAGE', 8, sActionStage);
			hook('S_DUNGEON_EVENT_MESSAGE', 2,sDungeonEventMessage);
			function sBossGageInfo(event) {
				if (!insidemap) return;

				let bosshp = (event.curHp / event.maxHp);
				if (bosshp <= 0) {
					whichboss = 0;
				}

				if (event.huntingZoneId == HuntingZn[0]) {
					insidezone = true;
					whichmode = 1;
				} else if (event.huntingZoneId == HuntingZn[1]) {
					insidezone = true;
					whichmode = 2;
				} else {
					insidezone = false;
					whichmode = 0;
				}

				if (event.templateId == BossID[0]) whichboss = 1;
				else if (event.templateId == BossID[1]) whichboss = 2;
				else if (event.templateId == BossID[2]) whichboss = 3;
				else whichboss = 0;
			}

			function sActionStage(event) {
				if (!enabled || !insidezone || whichboss==0) return;
				if (event.templateId!=BossID[0] && event.templateId!=BossID[1] && event.templateId!=BossID[2]) return;
				let skillid = event.skill.id % 1000;
				bossCurLocation = event.loc;
				bossCurAngle = event.w;

				if (whichboss==1 && FirstBossActions[skillid]) {
					sendMessage(FirstBossActions[skillid].msg);
				}
				if (whichboss==2 && SecondBossActions[skillid]) {
					sendMessage(SecondBossActions[skillid].msg);
					if (skillid === 114 || skillid === 301 || skillid === 302) {
						Spawnitem(603, 20, 260);
						Spawnitem(603, 40, 260);
						Spawnitem(603, 60, 260);
						Spawnitem(603, 80, 260);
						Spawnitem(603, 100, 260);
						Spawnitem(603, 120, 260);
						Spawnitem(603, 140, 260);
						Spawnitem(603, 160, 260);
						Spawnitem(603, 180, 260);
						Spawnitem(603, 200, 260);
						Spawnitem(603, 220, 260);
						Spawnitem(603, 240, 260);
						Spawnitem(603, 260, 260);
						Spawnitem(603, 280, 260);
						Spawnitem(603, 300, 260);
						Spawnitem(603, 320, 260);
						Spawnitem(603, 340, 260);
						Spawnitem(603, 360, 260);
					}
				}
				if (whichboss==3 && ThirdBossActions[skillid]) {
					sendMessage(ThirdBossActions[skillid].msg);
					if (skillid === 151 || skillid === 152) {
						SpawnThing(ThirdBossActions[skillid].sign_degrees, ThirdBossActions[skillid].sign_distance);
					}
				}
			}

			function sDungeonEventMessage(event) {
				if (!enabled || !insidezone || whichboss==0) return;
				let sDungeonEventMessage = parseInt(event.message.replace('@dungeon:', ''));
				if (whichboss==1) {
					if (sDungeonEventMessage === 0000000) {
						sendMessage('!!');
					}
				}
			}
		}
	}

	function hook() {
		hooks.push(d.hook(...arguments));
	}

	function unload() {
		if (hooks.length) {
			for (let h of hooks)
				d.unhook(h);
			hooks = [];
		}
		reset();
	}

	function reset() {
		insidemap = false;
		insidezone = false;
		whichmode = 0;
		whichboss = 0;
	}

	function sendMessage(msg) {
		if (sendToParty) {
			d.toServer('C_CHAT', 1, {
				channel: 21, //21 = p-notice, 1 = party, 2 = guild
				message: msg
			});
		} else if (streamenabled) {
			d.command.message(msg);
		} else {
			d.toClient('S_CHAT', 2, {
				channel: 21, //21 = p-notice, 1 = party
				authorName: 'DG-Guide',
				message: msg
			});
		}
	}
	//二王地面提示(草地圆圈范围)
	function Spawnitem(item, degrees, radius) { //显示物品 持续时间 偏移角度 半径距离
		let r = null, rads = null, finalrad = null, spawnx = null, spawny = null, pos = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		spawnx = bossCurLocation.x + radius * Math.cos(finalrad);
		spawny = bossCurLocation.y + radius * Math.sin(finalrad);
		pos = {x:spawnx, y:spawny};

		d.toClient('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : new Vec3(pos.x, pos.y, bossCurLocation.z),
			w : r,
			unk1 : 0,
			unk2 : 0
		});

		setTimeout(Despawn, 5000, uid0)
		uid0--;
	}

	function Despawn(uid_arg0) { //消除草地
		d.toClient('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	//三王地面提示(光柱+告示牌)
	function SpawnThing(degrees, radius) { //偏移角度 半径距离
		let r = null, rads = null, finalrad = null, pos = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		bossCurLocation.x = bossCurLocation.x + radius * Math.cos(finalrad);
		bossCurLocation.y = bossCurLocation.y + radius * Math.sin(finalrad);

		d.toClient('S_SPAWN_BUILD_OBJECT', 2, { //告示牌
			gameId : uid1,
			itemId : 1,
			loc : bossCurLocation,
			w : r,
			unk : 0,
			ownerName : '提示',
			message : '提示区'
		});

		setTimeout(DespawnThing, 5000, uid1, uid2);
		uid1--;

		bossCurLocation.z = bossCurLocation.z - 100;

		d.toClient('S_SPAWN_DROPITEM', 6, { //龙头光柱
			gameId: uid2,
			loc: bossCurLocation,
			item: 98260,
			amount: 1,
			expiry: 6000,
			owners: [{playerId: uid2}]
		});
		uid2--;
	}

	function DespawnThing(uid_arg1, uid_arg2) { //消除 光柱+告示
		d.toClient('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId : uid_arg1,
			unk : 0
		});
		d.toClient('S_DESPAWN_DROPITEM', 4, {
			gameId: uid_arg2
		});
	}
}