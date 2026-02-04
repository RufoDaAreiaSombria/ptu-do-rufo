Hooks.once("ready", () => {
  console.log("PTU Old Stats | Inicializando");

  if (game.system.id !== "ptu") {
    console.warn("PTU Old Stats | Sistema não é PTU, abortando");
    return;
  }

  const helpers = CONFIG.PTU?.helpers;
  if (!helpers) {
    console.error("PTU Old Stats | CONFIG.PTU.helpers não encontrado");
    return;
  }

  // guarda referência da função nova, se quiser restaurar depois
  helpers._originalCalculateStatTotal ??=
    helpers.calculateStatTotal;

  helpers.calculateStatTotal = calculateOldStatTotal;

  console.log("PTU Old Stats | Fórmula OLD aplicada com sucesso");
});

/**
 * Aplica bônus da Nature clássica (+2 / -2)
 */
function getNatureModifier(statKey, nature) {
  if (!nature) return 0;

  const up = nature.up ?? nature.increase;
  const down = nature.down ?? nature.decrease;

  if (statKey === up) return 2;
  if (statKey === down) return -2;
  return 0;
}

/**
 * Fórmula clássica de cálculo de stats do PTU
 */
function calculateOldStatTotal(levelUpPoints, stats, options = {}) {
  const {
    twistedPower = false,
    ignoreStages = false,
    nature = null
  } = options;

  for (const [key, value] of Object.entries(stats)) {
    // -------------------
    // SUBTOTAL BASE
    // -------------------
    const natureMod = getNatureModifier(key, nature);

    let sub =
      value.value +
      value.mod.value +
      value.mod.mod +
      value.levelUp +
      natureMod;

    levelUpPoints -= value.levelUp;

    // -------------------
    // IGNORAR STAGES
    // -------------------
    if (ignoreStages) {
      value.total = sub;
      continue;
    }

    // -------------------
    // COMBAT STAGES
    // -------------------
    const stage =
      (value.stage?.value ?? 0) +
      (value.stage?.mod ?? 0);

    if (stage > 0) {
      value.total = Math.floor(sub * stage * 0.2 + sub);
    } else if (stage < 0) {
      value.total = Math.ceil(sub * stage * 0.1 + sub);
    } else {
      value.total = sub;
    }
  }

  // -------------------
  // TWISTED POWER
  // -------------------
  if (twistedPower && stats.atk && stats.spatk) {
    const atk = stats.atk.total;
    const spatk = stats.spatk.total;

    stats.atk.total += Math.floor(spatk / 2);
    stats.spatk.total += Math.floor(atk / 2);
  }

  return { levelUpPoints, stats };
}