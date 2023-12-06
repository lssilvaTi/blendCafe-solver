const express = require("express");
const bodyParser = require("body-parser");
const solver = require("javascript-lp-solver");
const app = express();

app.use(bodyParser.json());

app.post("/solve", function (req, res) {
  try {
    const blendDetails = req.body.blendDetail;
    const grains = req.body.grains;
    const quantity = req.body.quantity;

    if (!blendDetails || !grains || !quantity) {
      return res
        .status(400)
        .send({ error: "Dados necessários não fornecidos" });
    }

    const result = solveLpProblem(blendDetails, grains, quantity);
    return res.send({ status: "success", result: result });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Erro interno do servidor" });
  }
});

app.post("/maximize-lots", function (req, res) {
  try {
    const blendDetails = req.body.blendDetail;
    const grains = req.body.grains;
    const quantity = req.body.quantity;

    if (!blendDetails || !grains || !quantity) {
      return res
        .status(400)
        .send({ error: "Dados necessários não fornecidos" });
    }

    const result = solveMaximizeLots(blendDetails, grains, quantity);
    return res.send({ status: "success", result: result });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Erro interno do servidor" });
  }
});

app.post("/maximize-age", function (req, res) {
  try {
    const blendDetails = req.body.blendDetail;
    const grains = req.body.grains;
    const quantity = req.body.quantity;

    if (!blendDetails || !grains || !quantity) {
      return res
        .status(400)
        .send({ error: "Dados necessários não fornecidos" });
    }

    const result = solveMaximizeAge(blendDetails, grains, quantity);
    return res.send({ status: "success", result: result });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Erro interno do servidor" });
  }
});

function solveLpProblem(blendDetails, grains, quantity) {
  let model = {
    optimize: "folgaTotal",
    opType: "max",
    constraints: {
      quantidadeTotal: { equal: quantity },
    },
    variables: {},
    ints: {}
  };

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    model.variables[grainVar] = { folgaTotal: 1, quantidadeTotal: 1 };
    model.constraints[grainVar] = { max: grain.qtd };
    model.ints[grainVar] = 1;
  });
  
  Object.keys(blendDetails).forEach(key => {
    if (key.startsWith("min_") || key.startsWith("max_")) {
      let characteristic = key.split("_").slice(1).join("_");
      let minOrMax = key.startsWith("min_") ? "min" : "max";
      let bound = blendDetails[key];

      if (bound > 0) {
        model.constraints[characteristic] = model.constraints[characteristic] || {};
        model.constraints[characteristic][minOrMax] = bound * quantity;

        grains.forEach(grain => {
          model.variables[`grain_${grain.id}`][characteristic] = grain[characteristic];
          model.variables[`grain_${grain.id}`][`grain_${grain.id}`] = 1;
        });
      }
    }
  });

  // Resolve o problema de otimização
  let result = solver.Solve(model);

  // Prepara a resposta com os grãos utilizados
  let grainsUsed = [];
  
  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      grainsUsed.push({ id: grain.id, lote: grain.lote, quantity: grainQuantity });
    }
  });

  // Calcula as médias das características
  let characteristicsSum = {};
  let totalQuantityUsed = 0;

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      totalQuantityUsed += grainQuantity;

      Object.keys(grain).forEach(char => {
        if (char !== 'id' && char !== 'lote' && char !== 'qtd') {
          characteristicsSum[char] = (characteristicsSum[char] || 0) + grain[char] * grainQuantity;
        }
      });
    }
  });

  let characteristicsAvg = {};

  if (totalQuantityUsed > 0) {
    Object.keys(characteristicsSum).forEach(char => {
      characteristicsAvg[char] = Math.floor((characteristicsSum[char] / totalQuantityUsed) * 100) / 100;
    });
  }

  return {
    optimizationResult: {
      feasible: result.feasible,
      result: result.result,
      bounded: result.bounded,
      isIntegral: result.isIntegral,
      grainsUsed: grainsUsed
    },
    characteristicsAvg: characteristicsAvg,
    totalQuantityUsed: totalQuantityUsed
  };
}

function solveMaximizeAge(blendDetails, grains, quantity) {
  let model = {
    optimize: "safra",
    opType: "max",
    constraints: {
      quantidadeTotal: { equal: quantity },
    },
    variables: {},
    ints: {}
  };

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    model.variables[grainVar] = { quantidadeTotal: 1 };
    model.constraints[grainVar] = { max: grain.qtd };
    model.ints[grainVar] = 1;
  });
  
  Object.keys(blendDetails).forEach(key => {
    if (key.startsWith("min_") || key.startsWith("max_")) {
      let characteristic = key.split("_").slice(1).join("_");
      let minOrMax = key.startsWith("min_") ? "min" : "max";
      let bound = blendDetails[key];

      if (bound > 0) {
        model.constraints[characteristic] = model.constraints[characteristic] || {};
        model.constraints[characteristic][minOrMax] = bound * quantity;

        grains.forEach(grain => {
          model.variables[`grain_${grain.id}`][characteristic] = grain[characteristic];
          model.variables[`grain_${grain.id}`][`grain_${grain.id}`] = 1;
          model.variables[`grain_${grain.id}`]['safra'] = grain['safra'];
        });
      }
    }
  });
  // Resolve o problema de otimização
  let result = solver.Solve(model);

  // Prepara a resposta com os grãos utilizados
  let grainsUsed = [];
  
  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      grainsUsed.push({ id: grain.id, lote: grain.lote, quantity: grainQuantity });
    }
  });

  // Calcula as médias das características
  let characteristicsSum = {};
  let totalQuantityUsed = 0;

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      totalQuantityUsed += grainQuantity;

      Object.keys(grain).forEach(char => {
        if (char !== 'id' && char !== 'lote' && char !== 'qtd') {
          characteristicsSum[char] = (characteristicsSum[char] || 0) + grain[char] * grainQuantity;
        }
      });
    }
  });

  let characteristicsAvg = {};

  if (totalQuantityUsed > 0) {
    Object.keys(characteristicsSum).forEach(char => {
      characteristicsAvg[char] = Math.floor((characteristicsSum[char] / totalQuantityUsed) * 100) / 100;
    });
  }

  return {
    optimizationResult: {
      feasible: result.feasible,
      result: result.result,
      bounded: result.bounded,
      isIntegral: result.isIntegral,
      grainsUsed: grainsUsed
    },
    characteristicsAvg: characteristicsAvg,
    totalQuantityUsed: totalQuantityUsed
  };
}

function solveMaximizeLots(blendDetails, grains, quantity) {
  let model = {
    optimize: "lotUtilization",
    opType: "max",
    constraints: {
      quantidadeTotal: { equal: quantity },
    },
    variables: {},
    ints: {}
  };

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let lotUtilization = grain.qtd > 0 ? 1 / grain.qtd : 0;
    model.variables[grainVar] = { lotUtilization: lotUtilization, quantidadeTotal: 1 };
    model.constraints[grainVar] = { max: grain.qtd };
    model.ints[grainVar] = 1;
  });
  console.log(model);
  Object.keys(blendDetails).forEach(key => {
    if (key.startsWith("min_") || key.startsWith("max_")) {
      let characteristic = key.split("_").slice(1).join("_");
      let minOrMax = key.startsWith("min_") ? "min" : "max";
      let bound = blendDetails[key];

      if (bound > 0) {
        model.constraints[characteristic] = model.constraints[characteristic] || {};
        model.constraints[characteristic][minOrMax] = bound * quantity;

        grains.forEach(grain => {
          model.variables[`grain_${grain.id}`][characteristic] = grain[characteristic];
          model.variables[`grain_${grain.id}`][`grain_${grain.id}`] = 1;
        });
      }
    }
  });
  
  // Resolve o problema de otimização
  let result = solver.Solve(model);

  // Prepara a resposta com os grãos utilizados
  let grainsUsed = [];
  
  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      grainsUsed.push({ id: grain.id, lote: grain.lote, quantity: grainQuantity });
    }
  });

  // Calcula as médias das características
  let characteristicsSum = {};
  let totalQuantityUsed = 0;

  grains.forEach(grain => {
    let grainVar = `grain_${grain.id}`;
    let grainQuantity = result[grainVar] || 0;

    if (grainQuantity > 0) {
      totalQuantityUsed += grainQuantity;

      Object.keys(grain).forEach(char => {
        if (char !== 'id' && char !== 'lote' && char !== 'qtd') {
          characteristicsSum[char] = (characteristicsSum[char] || 0) + grain[char] * grainQuantity;
        }
      });
    }
  });

  let characteristicsAvg = {};

  if (totalQuantityUsed > 0) {
    Object.keys(characteristicsSum).forEach(char => {
      characteristicsAvg[char] = Math.floor((characteristicsSum[char] / totalQuantityUsed) * 100) / 100;
    });
  }

  return {
    optimizationResult: {
      feasible: result.feasible,
      result: result.result,
      bounded: result.bounded,
      isIntegral: result.isIntegral,
      grainsUsed: grainsUsed
    },
    characteristicsAvg: characteristicsAvg,
    totalQuantityUsed: totalQuantityUsed
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor está rodando na porta ${PORT}`);
});
