const NATURES = {
  Cuddly:    { up: "hp", down: "atk" },
  Distracted:{ up: "hp", down: "def" },
  Proud:     { up: "hp", down: "spatk" },
  Decisive:  { up: "hp", down: "spdef" },
  Patient:   { up: "hp", down: "spd" },

  Desperate: { up: "atk", down: "hp" },
  Lonely:    { up: "atk", down: "def" },
  Adamant:   { up: "atk", down: "spatk" },
  Naughty:   { up: "atk", down: "spdef" },
  Brave:     { up: "atk", down: "spd" },

  Stark:     { up: "def", down: "hp" },
  Bold:      { up: "def", down: "atk" },
  Impish:    { up: "def", down: "spatk" },
  Lax:       { up: "def", down: "spdef" },
  Relaxed:   { up: "def", down: "spd" },

  Curious:   { up: "spatk", down: "hp" },
  Modest:    { up: "spatk", down: "atk" },
  Mild:      { up: "spatk", down: "def" },
  Rash:      { up: "spatk", down: "spdef" },
  Quiet:     { up: "spatk", down: "spd" },

  Dreamy:    { up: "spdef", down: "hp" },
  Calm:      { up: "spdef", down: "atk" },
  Gentle:    { up: "spdef", down: "def" },
  Careful:   { up: "spdef", down: "spatk" },
  Sassy:     { up: "spdef", down: "spd" },

  Skittish:  { up: "spd", down: "hp" },
  Timid:     { up: "spd", down: "atk" },
  Hasty:     { up: "spd", down: "def" },
  Jolly:     { up: "spd", down: "spatk" },
  Naive:     { up: "spd", down: "spdef" },

  // neutras (aumenta e diminui o mesmo stat)
  Composed:  { up: "hp", down: "hp" },
  Hardy:     { up: "atk", down: "atk" },
  Docile:    { up: "def", down: "def" },
  Bashful:   { up: "spatk", down: "spatk" },
  Quirky:    { up: "spdef", down: "spdef" },
  Serious:   { up: "spd", down: "spd" }
};

function getNatureModifier(statKey, system) {
  const natureName = system.nature?.value;
  if (!natureName) return 0;

  const nature = NATURES[natureName];
  if (!nature) return 0;

  // neutra (up === down)
  if (nature.up === nature.down) return 0;

  if (statKey === nature.up) {
    return statKey === "hp" ? 1 : 2;
  }

  if (statKey === nature.down) {
    return statKey === "hp" ? -1 : -2;
  }

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

  setTimeout(() => {
    console.log("PTU Old Stats | Recalculando actors no load");

    for (const actor of game.actors.contents) {
      try {
        // guards ABSOLUTOS
        if (!actor?.system?.stats) continue;
        if (typeof actor.prepareData !== "function") continue;

        actor.prepareData();
      } catch (err) {
        console.warn(
          `PTU Old Stats | Falha ao recalcular actor no load: ${actor.name}`,
          err
        );
      }
    }
  }, 500);
});

function applyOldStatTotals(system) {
  const stats = system.stats;
  let levelUpPoints = system.levelUpPoints?.value ?? 0;

  for (const [key, value] of Object.entries(stats)) {
    const natureMod = getNatureModifier(key, system);

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