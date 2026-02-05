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

Hooks.on("renderPTUPokemonTrainingSheet", (app, html, data) => {
  // Campo de bônus flat
  const bonusHtml = `
    <div class="form-group">
      <label>Bônus Flat de EXP</label>
      <input type="number" name="flatBonus" value="0"/>
    </div>
  `;

  html.find("button[type=submit]").before(bonusHtml);

  // Permitir múltiplos treinos (checkbox)
  html.find("input[name='training']").each((_, el) => {
    el.type = "checkbox";
    el.name = "trainingTypes";
  });
});

/*--------------------------- Tirar Level Cap -------------------------------*/

Hooks.once("ready", () => {
  const Sheet = game.ptu?.PTUPokemonTrainingSheet;
  if (!Sheet) {
    console.error("PTU | TrainingSheet não encontrado");
    return;
  }

  const original = Sheet.prototype._onDrop;

  Sheet.prototype._onDrop = async function (event) {
    const data = JSON.parse(event.dataTransfer.getData("text/plain") || "{}");
    const actor = data?.uuid ? await fromUuid(data.uuid) : null;

    // Se estiver tentando dropar em training, força ignorar cap
    const target = event.currentTarget?.dataset?.partyStatus;
    if (target === "training" && actor?.type === "pokemon") {
      // clona o actor para enganar a checagem
      actor.system.level.current = -999;
    }

    return original.call(this, event);
  };

  console.log("PTU | Level cap de treino REMOVIDO");
});

/*--------------------------- Tirar Limite de Treinos -------------------------------*/

Hooks.once("ready", () => {
  const Sheet = game.ptu.PTUPokemonTrainingSheet;
  if (!Sheet) return;

  const originalPrepare = Sheet.prototype._prepare;

  Sheet.prototype._prepare = function (...args) {
    originalPrepare.call(this, ...args);

    // deixa "infinito"
    this.instancesOfTraining = 999999;
  };
});

/*---------------------- Modificar a Fórmula de Treino ---------------------------*/

Hooks.once("ready", () => {
  const Sheet = game.ptu.PTUPokemonTrainingSheet;
  if (!Sheet) return;

  // sobrescreve o cálculo de XP
  Sheet.prototype._calculateXPToDistribute = function () {
    this.xpToDistribute = 0; // valor base, será recalculado por pokémon
  };

  // intercepta o completeTraining
  const originalComplete = Sheet.prototype.completeTraining;

  Sheet.prototype.completeTraining = function (trainingType, trainingData) {
    const trainer = this.trainer;
    const hasChampion = trainer.items?.some(i =>
      i.name.toLowerCase().includes("trainer of champions")
    );

    // pega o rank numérico de Command
    const commandRank = trainer.system?.skills?.command?.rank ?? 1;

    let commandBonus = 0;
    if (commandRank >= 8) commandBonus = 15;
    else if (commandRank >= 5) commandBonus = 10;
    else if (commandRank >= 3) commandBonus = 5;

    // bônus flat digitado
    const flatBonus = parseInt(this.form?.querySelector('input[name="flatBonus"]')?.value) || 0;

    let message = trainer.name + " completou o treino!<br>";

    Object.entries(trainingData).forEach(([key, value]) => {
      const actor = game.actors.get(key);
      if (!actor) return;

      const instances = parseInt(value) || 0;
      if (instances === 0) return;

      const level = actor.system.level.current;
      const base = Math.floor(level / 2);

      const xpPerInstance =
        base +
        commandBonus +
        (hasChampion ? 5 : 0) +
        flatBonus;

      const totalXP = xpPerInstance * instances;

      actor.update({ "system.level.exp": actor.system.level.exp + totalXP });

      message += `${actor.name} ganhou ${totalXP} EXP (${instances}× ${xpPerInstance})<br>`;
    });

    this.sendChatMessage(message);
  };
});
