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

  Composed:  { up: "hp", down: "hp" },
  Hardy:     { up: "atk", down: "atk" },
  Docile:    { up: "def", down: "def" },
  Bashful:   { up: "spatk", down: "spatk" },
  Quirky:    { up: "spdef", down: "spdef" },
  Serious:   { up: "spd", down: "spd" }
};

function getNatureModifier(statKey, system) {
  const natureName = system.nature?.value;
  const nature = NATURES[natureName];
  if (!nature || nature.up === nature.down) return 0;

  if (statKey === nature.up) return statKey === "hp" ? 1 : 2;
  if (statKey === nature.down) return statKey === "hp" ? -1 : -2;
  return 0;
}

function safe(obj, path, fallback = 0) {
  return path.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj) ?? fallback;
}

function applyOldStatTotals(system) {
  if (!system?.stats) return;

  for (const [key, stat] of Object.entries(system.stats)) {
    const base = stat.value ?? stat.base ?? 0;
    const levelUp = stat.levelUp ?? 0;
    const modValue = safe(stat, ["mod", "value"]);
    const modMod = safe(stat, ["mod", "mod"]);
    const stage = safe(stat, ["stage", "value"]) + safe(stat, ["stage", "mod"]);
    const nature = getNatureModifier(key, system);

    let sub = base + levelUp + modValue + modMod + nature;

    let total;
    if (stage > 0) {
      total = Math.floor(sub * (1 + stage * 0.2));
    } else if (stage < 0 && key !== "hp") {
      total = Math.ceil(sub * (1 + stage * 0.1));
    } else {
      total = sub;
    }

    stat.total = total;
  }
}

Hooks.once("ready", async () => {
  if (game.system.id !== "ptu") return;

  console.log("PTU Old Stats | Módulo ativo");

  // espera o mundo terminar completamente
  await new Promise(r => setTimeout(r, 500));

  const actors = game.actors.filter(a => a.type === "pokemon");

  for (const actor of actors) {
    applyOldStatTotals(actor.system);
  }

  console.log("PTU Old Stats | Recalculo limpo aplicado");
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