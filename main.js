const NATURE_STAT_MAP = {
  "Attack": "atk",
  "Defense": "def",
  "Special Attack": "spatk",
  "Special Defense": "spdef",
  "Speed": "spd",
  "HP": "hp",

  // variações comuns
  "Atk": "atk",
  "Def": "def",
  "SpAtk": "spatk",
  "SpDef": "spdef",
  "Spd": "spd"
};

function getNatureModifier(statKey, nature) {
  if (!nature) return 0;

  const upRaw = nature.up ?? nature.increase;
  const downRaw = nature.down ?? nature.decrease;

  const up = NATURE_STAT_MAP[upRaw];
  const down = NATURE_STAT_MAP[downRaw];

  if (statKey === up) return 2;
  if (statKey === down) return -2;

  return 0;
}


Hooks.once("ready", () => {
  if (game.system.id !== "ptu") return;

  console.log("PTU Old Stats | Módulo ativo");

  // pega o prototype real do sistema PTR
  const ActorPTR = CONFIG.Actor.documentClass;

  if (!ActorPTR?.prototype?.prepareData) {
    console.error("PTU Old Stats | prepareData não encontrado");
    return;
  }

  const originalPrepareData = ActorPTR.prototype.prepareData;

  ActorPTR.prototype.prepareData = function () {
    // deixa o PTU fazer TUDO primeiro
    originalPrepareData.call(this);

    // agora sim, ajusta apenas os totais
    if (!this.system?.stats) return;

    applyOldStatTotals(this.system);
  };

  console.log("PTU Old Stats | Patch aplicado com sucesso");
});

function applyOldStatTotals(system) {
  const stats = system.stats;
  let levelUpPoints = system.levelUpPoints?.value ?? 0;

  for (const [key, value] of Object.entries(stats)) {
    const natureMod = getNatureModifier(key, system.nature);

    const sub =
    value.value +
    value.mod.value +
    value.mod.mod +
    value.levelUp +
    natureMod;

    levelUpPoints -= value.levelUp;

    const stage =
      (value.stage?.value ?? 0) +
      (value.stage?.mod ?? 0);

    let total;
    if (stage > 0) {
      total = Math.floor(sub * stage * 0.2 + sub);
    } else {
      total = key === "hp"
        ? sub
        : Math.ceil(sub * stage * 0.1 + sub);
    }

    // ⚠️ MUITO IMPORTANTE:
    // só muda o campo total, não o objeto inteiro
    value.total = total;
  }

  system.levelUpPoints.value = levelUpPoints;
}