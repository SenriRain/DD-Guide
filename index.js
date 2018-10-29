String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` };
const Vec3 = require('tera-vec3');
// 定义恒量
const mapID = [9782, 9982];							// 地区坐标 zone 区分副本 下/上级
const HuntingZn = [782, 982];						// 大型怪物 huntingZoneId 区分副本 下/上级
const BossID = [1000, 2000, 3000];					// 大型怪物 templateId 区分副本 1-2-3王
// 获取配置文档数据
const config = require('./config.json');
const FirstBossActions = {							// 1王攻击动作
	106: {msg: 'Heavy'},
	107: {msg: 'Pushback'},
	108: {msg: 'Fly (Evade)'},
	109: {msg: 'Rocks (Small)'},
	110: {msg: 'Rocks (Large)'},
	301: {msg: 'Flower stuns'},
	307: {msg: 'Cage (DON`T MOVE)'},
	309: {msg: '1 flowers!!'},
	310: {msg: '2 flowers!!'},
	116: {msg: 'Big AoE attack!!'},
	312: {msg: 'Golden flower!!'}
};
const SecondBossActions = {							// 2王攻击动作
	105: {msg: 'Spin'},
	113: {msg: 'Stun inc'},
	114: {msg: 'Get IN'},
	116: {msg: 'Front then Back'},
	301: {msg: '↓ Get OUT + dodge'},
	302: {msg: '↑ Get IN + dodge'}
};
const ThirdBossActions = {							// 3王攻击动作
	//118: {msg: 'Front triple'},
	143: {msg: '←← Left rear Stun ←←'},
	145: {msg: '←← Left rear Stun ←←'},
	146: {msg: '←← Left rear Stun ←← (pulses)', sign_degrees: 325, sign_distance: 370},
	154: {msg: '←← Left rear Stun ←← (pulses)', sign_degrees: 325, sign_distance: 370},
	144: {msg: '→→ Right rear Stun →→'},
	147: {msg: '→→ Right rear Stun →→'},
	148: {msg: '→→ Right rear Stun →→ (pulses)', sign_degrees: 25, sign_distance: 380},
	155: {msg: '→→ Right rear Stun →→ (pulses)', sign_degrees: 25, sign_distance: 380},
	161: {msg: 'Front then Back'},
	162: {msg: 'Front then Back'},
	213: {msg: 'Tail'},
	215: {msg: 'Tail!!!!'},

	139: {msg: 'Left safe', sign_degrees: 270, sign_distance: 200}, //151
	150: {msg: 'Left safe!', sign_degrees: 270, sign_distance: 200}, //151
	141: {msg: 'Right safe', sign_degrees: 90, sign_distance: 200}, //153
	152: {msg: 'Right safe!', sign_degrees: 90, sign_distance: 200}, //153

	300: {msg: '(Awakening 1)', level_Msg: ['1 ОДИН', '2 ДВА', '3 ТРИ', '<font color="#FF0000">EVADE! Взрыв! Explosion!</font>']},
	399: {msg: '(Awakening 2)', level_Msg: ['1 Один', '<font color="#FF0000">EVADE! Взрыв! Explosion!</font>']},
	360: {msg: 'Explosion!! Evade '}
};

module.exports = function GrottoOfLostSoulsGuide(d) {	// 定义变量
	let	enabled = config.enabled,					// 模块启动开关
		sendToParty = config.sendToParty,			// 发送真实组队频道通知
		streamenabled = config.streamenabled,		// 关闭队长通知, 并将消息发送到代理频道

		isTank = false,								// 坦克职业 / 打手职业
		insidemap = false,							// 确认进入副本地图
		insidezone = false,							// 确认进入BOSS地图
		whichmode = 0,								// 确认副本上/下级
		whichboss = 0,								// 判定当前是哪个王

		hooks = [],
		bossCurLocation,
		bossCurAngle,
		uid0 = 999999999,
		uid1 = 899999999,
		uid2 = 799999999,

		power = false,
		Level = 0,
		levelMsg = [],
		powerMsg = '';

	d.command.add('gls', (arg) => {
		if (!arg) {
			enabled = !enabled;
			d.command.message('辅助提示 ' + (enabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
		} else {
			switch (arg) {
				case "p":
				case "party":
					sendToParty = !sendToParty;
					d.command.message('发送通知 ' + (sendToParty ? '组队'.clr('56B4E9') : '自己'.clr('E69F00')));
					break;
				case "proxy":
					streamenabled = !streamenabled;
					d.command.message('代理频道 ' + (streamenabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "debug":
					d.command.message('模块开关: ' + `${enabled}`.clr('00FFFF'));
					d.command.message('副本地图: ' + insidemap);
					d.command.message('区域位置: ' + insidezone);
					d.command.message('副本难度: ' + whichmode);
					d.command.message('副本首领: ' + whichboss);
					d.command.message('发送通知 ' + (sendToParty ? '真实组队'.clr('56B4E9') : '仅自己见'.clr('E69F00')));
					d.command.message('职业分类 ' + (isTank ? '坦克'.clr('00FFFF') : '打手'.clr('FF0000')));
					sendMessage('test');
					break;
				default :
					d.command.message('无效的参数!'.clr('FF0000'));
					break;
			}
		}
	});

	d.hook('S_LOGIN', 10, sLogin)						// 获取 登入角色信息
	d.hook('S_LOAD_TOPO', 3, sLoadTopo);				// 获取 登陆地区信息

	function sLogin(event) {
		let job = (event.templateId - 10101) % 100;
		if (job === 1 || job === 10) {					// 0-双刀, 1-枪骑, 2-大剑, 3-斧头, 4-魔道
			isTank = true;								// 5-弓箭, 6-祭司, 7-元素, 8-飞镰, 9-魔工
		} else {										// 10-拳师, 11-忍者 12 月光
			isTank = false;
		}
	}

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
	// 加载 获取信息
	function load() {
		if (!hooks.length) {
			hook('S_BOSS_GAGE_INFO', 3, sBossGageInfo);					// 获取 大型怪物血量信息
			hook('S_ACTION_STAGE', 8, sActionStage);					// 获取 周围全部[攻击动作]事件

			function sBossGageInfo(event) {
				if (!insidemap) return;

				let bosshp = (event.curHp / event.maxHp);

				if (bosshp <= 0) {
					whichboss = 0;
				}

				if (bosshp === 1) {
					power = false,
					Level = 0,
					levelMsg = [],
					powerMsg = '';
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
				// 模块关闭 或 不在副本中 或 找不到BOSS血条
				if (!enabled || !insidezone || whichboss==0) return;
				// 攻击技能 不是[1王] 也不是 [2王] 也不是 [3王] , 函数到此结束 (屏蔽 玩家/队友/NPC/召唤生物 攻击技能)
				if (event.templateId!=BossID[0] && event.templateId!=BossID[1] && event.templateId!=BossID[2]) return;
				let skillid = event.skill.id % 1000;		// 攻击技能编号简化 取1000余数运算
				bossCurLocation = event.loc;				// BOSS的 x y z 坐标
				bossCurAngle = event.w;						// BOSS的角度

				if (whichboss==1 && FirstBossActions[skillid]) {
					// 打手职业 不提示的技能
					if (!isTank && skillid === 106) return;
					// 坦克职业 不提示的技能
					if ( isTank && (skillid === 107 || skillid === 108 || skillid === 307)) return;

					sendMessage(FirstBossActions[skillid].msg);
				}

				if (whichboss==2 && SecondBossActions[skillid]) {
					// 2王 内外圈
					if (skillid === 114 || skillid === 301 || skillid === 302) {
						Spawnitem2(603, 20, 260, 5000);
					}
					// 2王 前砸后砸 横向对称轴
					if (skillid === 116) {
						// 左侧直线花朵
						Spawnitem1(603, 270, 500, 5000);
						// 右侧直线花朵
						Spawnitem1(603, 90, 500, 5000);
					}

					sendMessage(SecondBossActions[skillid].msg);
				}

				if (whichboss==3 && ThirdBossActions[skillid]) {
					// 蓄电层数计数
					if (whichmode==2) {
						// 一次觉醒 开始充能计数
						if (skillid===300) Level = 0, levelMsg = ThirdBossActions[skillid].level_Msg, power = true;
						// 放电爆炸 重置充能计数
						if (skillid===360) Level = 0;
						// 二次觉醒 重置充能计数
						if (skillid===399) Level = 0, levelMsg = ThirdBossActions[skillid].level_Msg;
						// 充能开关打开 并且 施放以下技能 则增加一层
						if (power) {
							switch (skillid) {
								case 118:	// 三连击

								case 143:	// 左后
								case 145:	// 左后

								case 146:	// 左后 (扩散)
								case 154:	// 左后 (扩散)

								case 144:	// 右后
								case 147:	// 右后

								case 148:	// 右后 (扩散)
								case 155:	// 右后 (扩散)

								case 161:	// (后砸) (前砸)
								case 162:	// (后砸) (前砸)

								case 213:	// 尾巴
								case 215:	// 尾巴
									powerMsg = ' | ' + levelMsg[Level];
									Level++;
									break;
								default :
									powerMsg = '';
									break;
							}
						}
						// 屏蔽[三连击]技能连续触发充能
						if (power && (skillid===118)) {
							power = false;
							setTimeout(function() { power = true }, 4000);
						}
					}

					// 3王 左右扩散电圈位置标记
					if (skillid === 146 || skillid === 154 || skillid === 148 || skillid === 155) {
						SpawnThing(ThirdBossActions[skillid].sign_degrees, ThirdBossActions[skillid].sign_distance, 8000);

						setTimeout(function() { Spawnitem2(603, 10, 160, 5500) }, 2500);
						setTimeout(function() { Spawnitem2(603, 8, 320, 5500) }, 2500);
						setTimeout(function() { Spawnitem2(603, 6, 480, 5500) }, 2500);
						setTimeout(function() { Spawnitem2(603, 4, 640, 5500) }, 2500);
						setTimeout(function() { Spawnitem2(603, 2, 800, 5500) }, 2500);
					}

					// 3王 飞天半屏攻击
					if (skillid === 139 || skillid === 150 || skillid === 141 || skillid === 152) {
						// 垂直对称轴 头部
						Spawnitem1(603, 180, 500, 5000);
						// 垂直对称轴 尾部
						Spawnitem1(603, 0, 225, 5000);
						Spawnitem(556, 0, 250, 5000);
						// 光柱+告示牌
						SpawnThing(ThirdBossActions[skillid].sign_degrees, ThirdBossActions[skillid].sign_distance, 4000);
					}

					sendMessage(ThirdBossActions[skillid].msg + powerMsg);
				}
			}

		}
	}
	// 获取信息
	function hook() {
		hooks.push(d.hook(...arguments));
	}
	// 卸载 获取信息
	function unload() {
		if (hooks.length) {
			for (let h of hooks)
				d.unhook(h);
			hooks = [];
		}
		reset();
	}
	// 重置数据配置
	function reset() {
		insidemap = false,
		insidezone = false,
		whichmode = 0,
		whichboss = 0,
		power = false,
		Level = 0,
		levelMsg = [],
		powerMsg = '';
	}
	// 发送提示文字
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
	//地面提示(花朵)
	function Spawnitem(item, degrees, radius, times) { // 显示物品 偏移角度 半径距离 持续时间
		let r = null, rads = null, finalrad = null, spawnx = null, spawny = null, pos = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		spawnx = bossCurLocation.x + radius * Math.cos(finalrad);
		spawny = bossCurLocation.y + radius * Math.sin(finalrad);
		pos = {x:spawnx, y:spawny};
		// 花朵
		d.toClient('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : new Vec3(pos.x, pos.y, bossCurLocation.z),
			w : r,
			unk1 : 0,
			unk2 : 0
		});
		// 延时消除
		setTimeout(Despawn, times, uid0);
		uid0--;
	}
	// 消除花朵
	function Despawn(uid_arg0) {
		d.toClient('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	// 构造直线花朵
	function Spawnitem1(item, degrees, maxRadius, times) {  // 显示物品 偏移角度 最远距离 持续时间
		for (var radius=25; radius<=maxRadius; radius+=25) { // 距离间隔 25
			Spawnitem(item, degrees, radius, times); // 显示物品 偏移角度 半径距离 持续时间
		}
	}
	// 构造圆形花圈
	function Spawnitem2(item, intervalDegrees, radius, times) { // 显示物品 偏移间隔 半径距离 持续时间
		for (var degrees=0; degrees<360; degrees+=intervalDegrees) {
			Spawnitem(item, degrees, radius, times); // 显示物品 偏移角度 半径距离 持续时间
		}
	}
	// 地面提示(光柱+告示牌)
	function SpawnThing(degrees, radius, times) { // 偏移角度 半径距离 持续时间
		let r = null, rads = null, finalrad = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		bossCurLocation.x = bossCurLocation.x + radius * Math.cos(finalrad);
		bossCurLocation.y = bossCurLocation.y + radius * Math.sin(finalrad);

		// 告示牌
		d.toClient('S_SPAWN_BUILD_OBJECT', 2, {
			gameId : uid1,
			itemId : 1,
			loc : bossCurLocation,
			w : r,
			unk : 0,
			ownerName : '提示',
			message : '安全区'
		});

		// 龙头光柱
		bossCurLocation.z = bossCurLocation.z - 1000;
		d.toClient('S_SPAWN_DROPITEM', 6, {
			gameId: uid2,
			loc: bossCurLocation,
			item: 98260,
			amount: 1,
			expiry: 6000,
			owners: [{playerId: uid2}]
		});
		bossCurLocation.z = bossCurLocation.z + 1000;

		// 延迟消除
		setTimeout(DespawnThing, times, uid1, uid2);
		uid1--;
		uid2--;
	}
	// 消除 光柱+告示牌
	function DespawnThing(uid_arg1, uid_arg2) {
		d.toClient('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId : uid_arg1,
			unk : 0
		});
		d.toClient('S_DESPAWN_DROPITEM', 4, {
			gameId: uid_arg2
		});
	}

}
