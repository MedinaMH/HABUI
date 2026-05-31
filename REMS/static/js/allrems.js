// ============================================================
// ============ BATERÍA  ============
// ============================================================
function prepararSvgResponsivo(svg, width, height) {
    svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block")
        .style("margin", "0 auto")
        .style("max-width", "100%")
        .style("max-height", "100%");
}

// ============================================================
// ============ PALETA GLOBAL DE ESTADOS ============
// ============================================================
const COLOR_ESTADO = {
    optimo: "#10b981",       // Verde
    advertencia: "#fbbf24",  // Amarillo
    critico: "#ef4444",      // Rojo
    moderado: "#3b82f6"      // Azul para estado moderado
};

const TEXTO_VALOR_GAUGE = {
    fontSize: "40px",
    fontWeight: "700"
};

function obtenerPrimerElementoRespuesta(payload) {
    if (!payload) return null;

    if (Array.isArray(payload)) {
        return payload.length > 0 ? payload[0] : null;
    }

    if (Array.isArray(payload.results)) {
        return payload.results.length > 0 ? payload.results[0] : null;
    }

    if (Array.isArray(payload.data)) {
        return payload.data.length > 0 ? payload.data[0] : null;
    }

    if (payload.data && typeof payload.data === "object") {
        return payload.data;
    }

    if (payload.ultimo && typeof payload.ultimo === "object") {
        return payload.ultimo;
    }

    if (payload.latest && typeof payload.latest === "object") {
        return payload.latest;
    }

    return payload;
}

function obtenerCampoNumerico(objeto, campos) {
    if (!objeto) return null;

    for (const campo of campos) {
        if (objeto[campo] !== undefined && objeto[campo] !== null && objeto[campo] !== "") {
            const numero = parseFloat(objeto[campo]);
            if (!isNaN(numero)) return numero;
        }
    }

    return null;
}

function normalizarSoc(valor) {
    let numero = parseFloat(valor);
    if (isNaN(numero)) return 0;

    if (numero > 1) {
        numero = numero / 100;
    }

    return Math.max(0, Math.min(1, numero));
}

function extraerSocEnergia(dato) {
    const valor = obtenerCampoNumerico(dato, [
        "battery",
        "soc_bateria_pct",
        "soc_pct",
        "battery_soc",
        "bateria",
        "nivel",
        "valor",
        "porcentaje",
        "estado_carga"
    ]);

    if (valor === null) return null;
    return normalizarSoc(valor);
}

function obtenerFechaDato(dato) {
    if (!dato) return null;
    return dato.fecha_hora || dato.timestamp || dato.created_at || dato.fecha || dato.time || null;
}

function formatearHora(fecha) {
    if (!fecha) return new Date().toLocaleTimeString();

    const date = new Date(fecha);
    if (isNaN(date.getTime())) {
        return new Date().toLocaleTimeString();
    }

    return date.toLocaleTimeString();
}

function clasificarEnergiaPorSoc(soc) {
    const socNormalizado = normalizarSoc(soc);
    const socPercent = socNormalizado * 100;

    if (socPercent < 15) {
        return {
            color: COLOR_ESTADO.critico,
            estado: TRANSLATIONS.critical || "CRÍTICO",
            alerta: TRANSLATIONS.critical_battery || "Nivel de batería crítico",
            tipoAlerta: "critical"
        };
    }

    if (socPercent < 30) {
        return {
            color: COLOR_ESTADO.advertencia,
            estado: TRANSLATIONS.low || "BAJO",
            alerta: TRANSLATIONS.low_battery || "Nivel de batería bajo",
            tipoAlerta: "warning"
        };
    }

    if (socPercent < 70) {
        return {
            color: COLOR_ESTADO.moderado,
            estado: TRANSLATIONS.moderate || "MODERADO",
            alerta: TRANSLATIONS.moderate_battery || "Nivel de batería moderado",
            tipoAlerta: "info"
        };
    }

    return {
        color: COLOR_ESTADO.optimo,
        estado: TRANSLATIONS.optimal || "ÓPTIMO",
        alerta: null,
        tipoAlerta: "info"
    };
}

function initBatteryVisualization(containerId, initialSOC) {
    const svg = d3.select(containerId);
    const width = 320;
    const height = 460;

    svg.selectAll("*").remove();
    prepararSvgResponsivo(svg, width, height);

    const batteryGroup = svg.append("g")
        .attr("transform", `translate(${width / 2 + 25}, 22)`);

    const batteryWidth = 180;
    const batteryHeight = 340;

    batteryGroup.append("rect")
        .attr("x", -batteryWidth / 2)
        .attr("y", 0)
        .attr("width", batteryWidth)
        .attr("height", batteryHeight)
        .attr("rx", 15)
        .attr("ry", 15)
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 6);

    batteryGroup.append("rect")
        .attr("x", -25)
        .attr("y", -22)
        .attr("width", 50)
        .attr("height", 22)
        .attr("rx", 6)
        .attr("fill", COLOR_ESTADO.advertencia)
        .attr("stroke", "#d97706")
        .attr("stroke-width", 3);

    const chargeLevel = batteryGroup.append("rect")
        .attr("x", -batteryWidth / 2 + 12)
        .attr("y", batteryHeight)
        .attr("width", batteryWidth - 24)
        .attr("height", 0)
        .attr("rx", 10)
        .attr("fill", COLOR_ESTADO.optimo);

    for (let i = 0; i <= 100; i += 20) {
        const yPos = batteryHeight - (i / 100) * batteryHeight;

        batteryGroup.append("line")
            .attr("x1", -batteryWidth / 2 - 20)
            .attr("x2", -batteryWidth / 2 - 5)
            .attr("y1", yPos)
            .attr("y2", yPos)
            .attr("stroke", "#6b7280")
            .attr("stroke-width", 4);

        batteryGroup.append("text")
            .attr("x", -batteryWidth / 2 - 25)
            .attr("y", yPos + 5)
            .attr("text-anchor", "end")
            .attr("fill", "#ffffff")
            .attr("font-size", "28px")
            .attr("font-weight", "600")
            .text(i + "%");
    }

    function updateBattery(soc) {
        const socNormalizado = normalizarSoc(soc);
        const socPercent = socNormalizado * 100;
        const fillHeight = (socPercent / 100) * batteryHeight;
        const yPos = batteryHeight - fillHeight;

        const estadoEnergia = clasificarEnergiaPorSoc(socNormalizado);
        const color = estadoEnergia.color;

        chargeLevel.transition()
            .duration(800)
            .attr("y", yPos)
            .attr("height", fillHeight)
            .attr("fill", color);

        const percentageLarge = document.getElementById("battery-percentage-large");
        if (percentageLarge) {
            percentageLarge.textContent = Math.round(socPercent) + "%";
            percentageLarge.style.color = color;
            percentageLarge.style.fontSize = "40px";
            percentageLarge.style.fontWeight = "700";
            percentageLarge.style.lineHeight = "1";
            percentageLarge.style.textShadow = `0 0 10px ${color}55`;
        }

        const statusElement = document.getElementById("battery-status");
        if (statusElement) {
            statusElement.textContent = estadoEnergia.estado;
            statusElement.style.color = color;
        }

        return socPercent;
    }

    async function cargarUltimoDatoBD() {
        try {
            console.log("Cargando último dato de energía desde /api/energia_get/...");
            const response = await fetch("/api/energia_get/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de energía de la BD");
                return null;
            }

            const payload = await response.json();
            const ultimoDato = obtenerPrimerElementoRespuesta(payload);
            const soc = extraerSocEnergia(ultimoDato);

            if (soc === null) {
                console.log("No se encontró un campo de batería/SoC válido:", payload);
                return null;
            }

            updateBattery(soc);

            const timeElement = document.getElementById("battery-time");
            if (timeElement) {
                timeElement.textContent = formatearHora(obtenerFechaDato(ultimoDato));
            }

            return soc;
        } catch (error) {
            console.log("Error al cargar el último dato de energía:", error);
            return null;
        }
    }

    async function cargarDatosRecientesBD(limite = 10) {
        try {
            const response = await fetch("/api/energia_get/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos recientes de energía");
                return [];
            }

            const payload = await response.json();

            const datos = Array.isArray(payload)
                ? payload
                : Array.isArray(payload.results)
                    ? payload.results
                    : Array.isArray(payload.data)
                        ? payload.data
                        : payload ? [obtenerPrimerElementoRespuesta(payload)] : [];

            return datos
                .filter(Boolean)
                .slice(0, limite)
                .map(dato => {
                    const soc = extraerSocEnergia(dato);
                    if (soc === null) return null;

                    const estadoEnergia = clasificarEnergiaPorSoc(soc);

                    return {
                        id: dato.id,
                        valor: soc * 100,
                        soc: soc,
                        fecha: obtenerFechaDato(dato),
                        estado: estadoEnergia.estado,
                        color: estadoEnergia.color
                    };
                })
                .filter(Boolean);
        } catch (error) {
            console.log("Error al cargar datos recientes de energía:", error);
            return [];
        }
    }

    updateBattery(initialSOC || 0.5);

    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    const funcionActualizar = function(soc) {
        return updateBattery(soc);
    };

    funcionActualizar.update = updateBattery;
    funcionActualizar.actualizar = updateBattery;
    funcionActualizar.cargarUltimoDato = cargarUltimoDatoBD;
    funcionActualizar.cargarDatosRecientes = cargarDatosRecientesBD;

    return funcionActualizar;
}

// ============================================================
// ============ TANQUE DE AGUA ============
// ============================================================
function crearTanqueAguaRealista(containerId, valorInicial) {
    const container = d3.select(containerId);
    container.html("");

    const width = 380;
    const height = 520;

    const svg = container.append("svg");
    prepararSvgResponsivo(svg, width, height);

    const tanqueWidth = 200;
    const tanqueHeight = 340;
    const tanqueX = (width - tanqueWidth) / 2;
    const tanqueY = 50;
    const tanqueCurvatura = 15;

    const defs = svg.append("defs");

    const gradienteTanque = defs.append("linearGradient")
        .attr("id", "gradTanque")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    gradienteTanque.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#2c3e50")
        .attr("stop-opacity", 0.8);

    gradienteTanque.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#34495e")
        .attr("stop-opacity", 1);

    gradienteTanque.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#2c3e50")
        .attr("stop-opacity", 0.8);

    const filtroSombra = defs.append("filter")
        .attr("id", "sombraTanque")
        .attr("x", "-20%").attr("y", "-20%")
        .attr("width", "140%").attr("height", "140%");

    filtroSombra.append("feDropShadow")
        .attr("dx", "2")
        .attr("dy", "5")
        .attr("stdDeviation", "8")
        .attr("flood-color", "#000")
        .attr("flood-opacity", "0.3");

    const gradienteAgua = defs.append("linearGradient")
        .attr("id", "gradAgua")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

    gradienteAgua.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.color(COLOR_ESTADO.optimo).darker(0.5))
        .attr("stop-opacity", 0.9);

    gradienteAgua.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", COLOR_ESTADO.optimo)
        .attr("stop-opacity", 0.8);

    gradienteAgua.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.color(COLOR_ESTADO.optimo).brighter(0.5))
        .attr("stop-opacity", 0.7);

    svg.append("rect")
        .attr("x", tanqueX + 5)
        .attr("y", tanqueY + 5)
        .attr("width", tanqueWidth)
        .attr("height", tanqueHeight)
        .attr("rx", tanqueCurvatura)
        .attr("ry", tanqueCurvatura)
        .attr("fill", "#000")
        .attr("opacity", 0.3)
        .attr("filter", "url(#sombraTanque)");

    svg.append("rect")
        .attr("x", tanqueX)
        .attr("y", tanqueY)
        .attr("width", tanqueWidth)
        .attr("height", tanqueHeight)
        .attr("rx", tanqueCurvatura)
        .attr("ry", tanqueCurvatura)
        .attr("fill", "url(#gradTanque)")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 3);

    svg.append("rect")
        .attr("x", tanqueX + 5)
        .attr("y", tanqueY + 5)
        .attr("width", 40)
        .attr("height", tanqueHeight - 10)
        .attr("rx", 8)
        .attr("fill", "rgba(255, 255, 255, 0.15)")
        .attr("opacity", 0.6);

    svg.append("rect")
        .attr("x", tanqueX - 10)
        .attr("y", tanqueY - 15)
        .attr("width", tanqueWidth + 20)
        .attr("height", 20)
        .attr("rx", 10)
        .attr("fill", "#2c3e50")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    const agua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("fill", "url(#gradAgua)")
        .attr("rx", tanqueCurvatura - 2)
        .attr("opacity", 0.85);

    const superficieAgua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("height", 3)
        .attr("fill", "rgba(255, 255, 255, 0.4)")
        .attr("rx", 2);

    for (let i = 0; i <= 100; i += 25) {
        const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;

        svg.append("line")
            .attr("x1", tanqueX - 15)
            .attr("x2", tanqueX - 5)
            .attr("y1", y)
            .attr("y2", y)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 4);

        svg.append("text")
            .attr("x", tanqueX - 20)
            .attr("y", y + 4)
            .attr("fill", "#ffffff")
            .attr("font-size", "28px")
            .attr("text-anchor", "end")
            .text(i + "%");
    }

    const textoNivel = svg.append("text")
        .attr("x", tanqueX + tanqueWidth - 100)
        .attr("y", tanqueY + tanqueHeight + 60)
        .attr("fill", COLOR_ESTADO.optimo)
        .attr("font-size", TEXTO_VALOR_GAUGE.fontSize)
        .attr("font-weight", TEXTO_VALOR_GAUGE.fontWeight)
        .attr("text-anchor", "middle")
        .style("font-family", "inherit")
        .text("00.0%");

    const escala = d3.scaleLinear()
        .domain([0, 100])
        .range([tanqueY + tanqueHeight, tanqueY]);

    function actualizar(valor) {
        const porcentaje = Math.max(0, Math.min(100, valor));
        const yAgua = escala(porcentaje);
        const alturaAgua = tanqueY + tanqueHeight - yAgua;

        const yIndicador = escala(porcentaje);
        const alturaIndicador = tanqueY + tanqueHeight - yIndicador;

        let colorAgua;
        let colorIndicador;
        let estadoTexto;

        if (porcentaje < 20) {
            colorAgua = COLOR_ESTADO.critico;
            colorIndicador = COLOR_ESTADO.critico;
            estadoTexto = TRANSLATIONS.critical || "CRÍTICO";
        } else if (porcentaje < 40) {
            colorAgua = COLOR_ESTADO.advertencia;
            colorIndicador = COLOR_ESTADO.advertencia;
            estadoTexto = TRANSLATIONS.low || "BAJO";
        } else if (porcentaje < 70) {
            colorAgua = COLOR_ESTADO.moderado;
            colorIndicador = COLOR_ESTADO.moderado;
            estadoTexto = TRANSLATIONS.moderate || "MODERADO";
        } else {
            colorAgua = COLOR_ESTADO.optimo;
            colorIndicador = COLOR_ESTADO.optimo;
            estadoTexto = TRANSLATIONS.optimal || "ÓPTIMO";
        }

        agua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua)
            .attr("height", alturaAgua);

        superficieAgua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua);

        textoNivel.transition()
            .duration(400)
            .text(porcentaje.toFixed(1) + "%")
            .attr("fill", colorAgua);

        const statusElement = document.getElementById("agua-status");
        if (statusElement) {
            statusElement.textContent = estadoTexto;
            statusElement.style.color = colorAgua;
        }

        const timeElement = document.getElementById("agua-time");
        if (timeElement) {
            const ahora = new Date();
            const horaStr = ahora.getHours().toString().padStart(2, "0") + ":" +
                            ahora.getMinutes().toString().padStart(2, "0");
            timeElement.textContent = horaStr;
        }

        defs.select("#gradAgua").remove();

        const nuevoGradiente = defs.append("linearGradient")
            .attr("id", "gradAgua")
            .attr("x1", "0%").attr("y1", "100%")
            .attr("x2", "0%").attr("y2", "0%");

        nuevoGradiente.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d3.color(colorAgua).darker(0.5))
            .attr("stop-opacity", 0.9);

        nuevoGradiente.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", colorAgua)
            .attr("stop-opacity", 0.8);

        nuevoGradiente.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.color(colorAgua).brighter(0.5))
            .attr("stop-opacity", 0.7);

        agua.attr("fill", "url(#gradAgua)");

        if (porcentaje > 90) {
            for (let i = 0; i < 3; i++) {
                const bubbleX = tanqueX + Math.random() * tanqueWidth * 0.8 + tanqueWidth * 0.1;
                const bubbleY = yAgua + Math.random() * 10;
                const bubbleSize = Math.random() * 4 + 2;

                const bubble = svg.append("circle")
                    .attr("cx", bubbleX)
                    .attr("cy", bubbleY)
                    .attr("r", bubbleSize)
                    .attr("fill", "rgba(255, 255, 255, 0.6)")
                    .attr("opacity", 0);

                bubble.transition()
                    .duration(1500)
                    .attr("cy", bubbleY - 30)
                    .attr("opacity", 0.8)
                    .transition()
                    .duration(500)
                    .attr("opacity", 0)
                    .remove();
            }
        }

        return porcentaje;
    }

    actualizar(valorInicial);

    async function cargarUltimoDatoBD() {
        try {
            console.log("Cargando datos de agua desde BD para obtener el último...");
            const response = await fetch("/api/agua/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de agua de la BD");
                return null;
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos) && datos.length > 0) {
                const ultimoDato = datos[0];
                const ultimoNivel = parseFloat(ultimoDato.nivel);

                console.log("Último dato de agua encontrado:", ultimoNivel, "ID:", ultimoDato.id, "Fecha:", ultimoDato.fecha_hora);
                actualizar(ultimoNivel);
                return ultimoNivel;
            } else {
                console.log("No hay datos de agua en la BD");
                return null;
            }
        } catch (error) {
            console.log("Error al cargar datos de agua:", error);
            return null;
        }
    }

    async function cargarDatosRecientesBD(limite = 10) {
        try {
            const response = await fetch("/api/agua/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de agua de la BD");
                return [];
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos)) {
                const datosRecientes = datos.slice(0, limite);
                console.log(`Cargados ${datosRecientes.length} datos recientes de agua`);
                return datosRecientes;
            }

            return [];
        } catch (error) {
            console.log("Error al cargar datos recientes:", error);
            return [];
        }
    }

    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    const funcionActualizar = function(valor) {
        return actualizar(valor);
    };

    funcionActualizar.cargarUltimoDato = cargarUltimoDatoBD;
    funcionActualizar.cargarDatosRecientes = cargarDatosRecientesBD;
    funcionActualizar.actualizar = actualizar;

    return funcionActualizar;
}

// ===================== GAUGE VERTICAL (Oxígeno %) =====================
function gaugeO2(containerId, initial) {
    const container = d3.select(containerId);
    container.html("");

    const width = 300;
    const height = 520;
    const min = 0.0;
    const max = 100.0;

    const svg = container.append("svg");
    prepararSvgResponsivo(svg, width, height);

    const colorPalette = {
        green: COLOR_ESTADO.optimo,
        yellow: COLOR_ESTADO.advertencia,
        red: COLOR_ESTADO.critico,
        white: "#ffffff"
    };

    const frameX = 85;
    const frameY = 15;
    const frameW = 180;
    const frameH = 360;

    svg.append("rect")
        .attr("x", frameX)
        .attr("y", frameY)
        .attr("width", frameW)
        .attr("height", frameH)
        .attr("rx", 14)
        .attr("fill", "#0f172a")
        .attr("stroke", colorPalette.white)
        .attr("stroke-width", 3);

    const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);

    for (let i = 0; i <= 100; i += 25) {
        const y = scale(i);

        svg.append("line")
            .attr("x1", frameX - 10)
            .attr("y1", y)
            .attr("x2", frameX)
            .attr("y2", y)
            .attr("stroke", colorPalette.white)
            .attr("stroke-width", 1.5);

        svg.append("text")
            .attr("x", frameX - 20)
            .attr("y", y + 4)
            .attr("fill", colorPalette.white)
            .attr("font-size", "28px")
            .attr("font-weight", "500")
            .attr("text-anchor", "end")
            .text(i + "%");
    }

    const fillRect = svg.append("rect")
        .attr("x", frameX)
        .attr("width", frameW)
        .attr("y", scale(initial))
        .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
        .attr("fill", colorFor(initial))
        .attr("rx", 12);

    const valueText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", frameY + frameH + 50)
        .attr("fill", colorFor(initial))
        .attr("font-size", TEXTO_VALOR_GAUGE.fontSize)
        .attr("font-weight", TEXTO_VALOR_GAUGE.fontWeight)
        .attr("text-anchor", "middle")
        .text(initial.toFixed(2) + " %");

    function colorFor(v) {
        const valor = Math.max(0, Math.min(100, v));

        if (valor >= 19.5 && valor <= 23.5) {
            return colorPalette.green;
        } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
            return colorPalette.yellow;
        } else {
            return colorPalette.red;
        }
    }

    function getQualityText(v) {
        const valor = Math.max(0, Math.min(100, v));

        if (valor >= 19.5 && valor <= 23.5) {
            return TRANSLATIONS.optimal || "ÓPTIMO";
        } else if ((valor >= 17 && valor <= 19.4) || (valor >= 23.6 && valor <= 25)) {
            return TRANSLATIONS.warning || "ADVERTENCIA";
        } else {
            return TRANSLATIONS.critical || "CRÍTICO";
        }
    }

    function getFooterQualityText(v) {
        return getQualityText(v);
    }

    function actualizarGauge(newVal) {
        const valorLimitado = Math.max(0, Math.min(100, newVal));

        const y = scale(valorLimitado);
        const h = Math.max(2, (frameY + frameH) - y);
        const newColor = colorFor(valorLimitado);

        fillRect
            .transition().duration(300)
            .attr("y", y)
            .attr("height", h)
            .attr("fill", newColor);

        valueText
            .transition().duration(300)
            .text(valorLimitado.toFixed(2) + " %")
            .attr("fill", newColor);

        const qualityElement = document.getElementById("oxigeno-quality");
        const timeElement = document.getElementById("oxigeno-time");

        if (qualityElement) {
            const footerText = getFooterQualityText(valorLimitado);
            qualityElement.textContent = footerText;
            qualityElement.style.color = newColor;
        }

        if (timeElement) {
            const ahora = new Date();
            const horaStr = ahora.getHours().toString().padStart(2, "0") + ":" +
                            ahora.getMinutes().toString().padStart(2, "0");
            timeElement.textContent = horaStr;
        }

        return valorLimitado;
    }

    async function cargarUltimoDatoBD() {
        try {
            console.log("Cargando datos de oxígeno desde BD para obtener el último...");
            const response = await fetch("/api/o2/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de oxígeno de la BD");
                return null;
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos) && datos.length > 0) {
                const ultimoDato = datos[0];

                let ultimoValor = parseFloat(ultimoDato.nivel);
                ultimoValor = Math.max(0, Math.min(100, ultimoValor));

                console.log("Último dato de oxígeno encontrado:", ultimoValor.toFixed(2) + "%", 
                    "ID:", ultimoDato.id, "Fecha:", ultimoDato.fecha_hora || ultimoDato.timestamp);

                actualizarGauge(ultimoValor);

                return ultimoValor;
            } else {
                console.log("No hay datos de oxígeno en la BD");
                return null;
            }
        } catch (error) {
            console.log("Error al cargar datos de oxígeno:", error);
            return null;
        }
    }

    async function cargarDatosRecientesBD(limite = 10) {
        try {
            console.log(`Cargando últimos ${limite} datos de oxígeno...`);
            const response = await fetch("/api/o2/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de oxígeno de la BD");
                return [];
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos)) {
                const datosRecientes = datos.slice(0, limite);

                const datosFormateados = datosRecientes.map(dato => {
                    let valor = parseFloat(dato.nivel);

                    if (isNaN(valor)) return null;
                    valor = Math.max(0, Math.min(100, valor));

                    return {
                        id: dato.id,
                        valor: valor,
                        fecha: dato.fecha_hora || dato.timestamp,
                        calidad: getQualityText(valor)
                    };
                }).filter(dato => dato !== null);

                console.log(`Cargados ${datosFormateados.length} datos recientes de oxígeno`);
                return datosFormateados;
            }

            return [];
        } catch (error) {
            console.log("Error al cargar datos recientes de oxígeno:", error);
            return [];
        }
    }

    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    const gaugeObject = {
        update: function(newVal) {
            const valorActualizado = actualizarGauge(newVal);

            return {
                valor: valorActualizado,
                calidad: getQualityText(valorActualizado),
                color: colorFor(valorActualizado),
                textoFooter: getFooterQualityText(valorActualizado)
            };
        },
        cargarUltimoDato: cargarUltimoDatoBD,
        cargarDatosRecientes: cargarDatosRecientesBD,
        actualizar: actualizarGauge,
        obtenerColorSegunValor: colorFor,
        obtenerTextoCalidad: getQualityText,
        obtenerRangos: function() {
            return {
                optimo: { min: 19.5, max: 23.5, color: colorPalette.green, estado: TRANSLATIONS.optimal || "ÓPTIMO" },
                advertencia: [
                    { min: 17, max: 19.4, color: colorPalette.yellow, estado: TRANSLATIONS.warning || "ADVERTENCIA" },
                    { min: 23.6, max: 25, color: colorPalette.yellow, estado: TRANSLATIONS.warning || "ADVERTENCIA" }
                ],
                critico: [
                    { min: 0, max: 16.9, color: colorPalette.red, estado: TRANSLATIONS.critical || "CRÍTICO" },
                    { min: 25.1, max: 100, color: colorPalette.red, estado: TRANSLATIONS.critical || "CRÍTICO" }
                ]
            };
        }
    };

    return gaugeObject;
}

// ===================== GAUGE VERTICAL (CO2 ppm) =====================
function gaugeCO2(containerId, initial) {
    const container = d3.select(containerId);
    container.html("");

    const width = 300;
    const height = 520;
    const min = 0.0;
    const max = 3000.0;

    const svg = container.append("svg");
    prepararSvgResponsivo(svg, width, height);

    const colorPalette = {
        green: COLOR_ESTADO.optimo,
        yellow: COLOR_ESTADO.advertencia,
        red: COLOR_ESTADO.critico,
        white: "#ffffff"
    };

    const frameX = 85;
    const frameY = 15;
    const frameW = 180;
    const frameH = 360;

    svg.append("rect")
        .attr("x", frameX)
        .attr("y", frameY)
        .attr("width", frameW)
        .attr("height", frameH)
        .attr("rx", 14)
        .attr("fill", "#0f172a")
        .attr("stroke", colorPalette.white)
        .attr("stroke-width", 3);

    const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
    const nivelesCO2 = [0, 600, 1200, 1800, 2400, 3000];

    nivelesCO2.forEach(ppm => {
        const y = scale(ppm);

        svg.append("line")
            .attr("x1", frameX - 10)
            .attr("y1", y)
            .attr("x2", frameX)
            .attr("y2", y)
            .attr("stroke", colorPalette.white)
            .attr("stroke-width", 1.5);

        svg.append("text")
            .attr("x", frameX - 20)
            .attr("y", y + 4)
            .attr("fill", colorPalette.white)
            .attr("font-size", "28px")
            .attr("font-weight", "500")
            .attr("text-anchor", "end")
            .text(formatPPM(ppm));
    });

    function formatPPM(ppm) {
        if (ppm >= 1000) {
            return (ppm / 1000).toFixed(1) + "k";
        }
        return ppm.toString();
    }

    const fillRect = svg.append("rect")
        .attr("x", frameX)
        .attr("width", frameW)
        .attr("y", scale(initial))
        .attr("height", Math.max(2, (frameY + frameH) - scale(initial)))
        .attr("fill", colorFor(initial))
        .attr("rx", 12);

    const valueText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", frameY + frameH + 50)
        .attr("fill", colorFor(initial))
        .attr("font-size", TEXTO_VALOR_GAUGE.fontSize)
        .attr("font-weight", TEXTO_VALOR_GAUGE.fontWeight)
        .attr("text-anchor", "middle")
        .text(initial.toFixed(0) + " ppm");

    function colorFor(v) {
        const valor = Math.max(min, Math.min(max, v));

        if (valor >= 400 && valor <= 1000) {
            return colorPalette.green;
        } else if (valor > 1000 && valor <= 2000) {
            return colorPalette.yellow;
        } else {
            return colorPalette.red;
        }
    }

    function getQualityText(v) {
        const valor = Math.max(min, Math.min(max, v));

        if (valor >= 400 && valor <= 1000) {
            return TRANSLATIONS.optimal || "ÓPTIMO";
        } else if (valor > 1000 && valor <= 2000) {
            return TRANSLATIONS.warning || "ADVERTENCIA";
        } else {
            return TRANSLATIONS.critical || "CRÍTICO";
        }
    }

    function getFooterQualityText(v) {
        return getQualityText(v);
    }

    function actualizarGauge(newVal) {
        const valorLimitado = Math.max(min, Math.min(max, newVal));

        const y = scale(valorLimitado);
        const h = Math.max(2, (frameY + frameH) - y);
        const newColor = colorFor(valorLimitado);

        fillRect
            .transition().duration(300)
            .attr("y", y)
            .attr("height", h)
            .attr("fill", newColor);

        valueText
            .transition().duration(300)
            .text(valorLimitado.toFixed(0) + " ppm")
            .attr("fill", newColor);

        const qualityElement = document.getElementById("co2-concentration");
        const timeElement = document.getElementById("co2-time");

        if (qualityElement) {
            const footerText = getFooterQualityText(valorLimitado);
            qualityElement.textContent = footerText;
            qualityElement.style.color = newColor;
        }

        if (timeElement) {
            const ahora = new Date();
            const horaStr = ahora.getHours().toString().padStart(2, "0") + ":" +
                            ahora.getMinutes().toString().padStart(2, "0");
            timeElement.textContent = horaStr;
        }

        return valorLimitado;
    }

    async function cargarUltimoDatoBD() {
        try {
            console.log("Cargando datos de CO₂ desde BD para obtener el último...");
            const response = await fetch("/api/co2/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de CO₂ de la BD");
                return null;
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos) && datos.length > 0) {
                const ultimoDato = datos[0];

                let ultimoValor = null;

                if (ultimoDato.concentracion !== undefined && ultimoDato.concentracion !== null) {
                    ultimoValor = parseFloat(ultimoDato.concentracion);
                } else if (ultimoDato.valor !== undefined && ultimoDato.valor !== null) {
                    ultimoValor = parseFloat(ultimoDato.valor);
                } else if (ultimoDato.nivel !== undefined && ultimoDato.nivel !== null) {
                    ultimoValor = parseFloat(ultimoDato.nivel);
                } else {
                    console.log('Campo "concentracion", "valor" o "nivel" no encontrado en:', ultimoDato);
                    return null;
                }

                if (isNaN(ultimoValor)) {
                    console.log("Valor de CO₂ no es un número:", ultimoDato);
                    return null;
                }

                console.log("Último dato de CO₂ encontrado:", ultimoValor.toFixed(0) + " ppm", 
                    "ID:", ultimoDato.id, "Fecha:", ultimoDato.fecha_hora || ultimoDato.timestamp);

                actualizarGauge(ultimoValor);

                return ultimoValor;
            } else {
                console.log("No hay datos de CO₂ en la BD");
                return null;
            }
        } catch (error) {
            console.log("Error al cargar datos de CO₂:", error);
            return null;
        }
    }

    async function cargarDatosRecientesBD(limite = 10) {
        try {
            console.log(`Cargando últimos ${limite} datos de CO₂...`);
            const response = await fetch("/api/co2/");

            if (!response.ok) {
                console.log("No se pudieron obtener datos de CO₂ de la BD");
                return [];
            }

            const datos = await response.json();

            if (datos && Array.isArray(datos)) {
                const datosRecientes = datos.slice(0, limite);

                const datosFormateados = datosRecientes.map(dato => {
                    let valor;

                    if (dato.concentracion !== undefined && dato.concentracion !== null) {
                        valor = parseFloat(dato.concentracion);
                    } else if (dato.valor !== undefined && dato.valor !== null) {
                        valor = parseFloat(dato.valor);
                    } else if (dato.nivel !== undefined && dato.nivel !== null) {
                        valor = parseFloat(dato.nivel);
                    } else {
                        return null;
                    }

                    if (isNaN(valor)) return null;

                    return {
                        id: dato.id,
                        valor: valor,
                        fecha: dato.fecha_hora || dato.timestamp,
                        calidad: getQualityText(valor)
                    };
                }).filter(dato => dato !== null);

                console.log(`Cargados ${datosFormateados.length} datos recientes de CO₂`);
                return datosFormateados;
            }

            return [];
        } catch (error) {
            console.log("Error al cargar datos recientes de CO₂:", error);
            return [];
        }
    }

    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    const gaugeObject = {
        update: function(newVal) {
            const valorActualizado = actualizarGauge(newVal);

            return {
                valor: valorActualizado,
                calidad: getQualityText(valorActualizado),
                color: colorFor(valorActualizado),
                textoFooter: getFooterQualityText(valorActualizado)
            };
        },
        cargarUltimoDato: cargarUltimoDatoBD,
        cargarDatosRecientes: cargarDatosRecientesBD,
        actualizar: actualizarGauge,
        obtenerColorSegunValor: colorFor,
        obtenerTextoCalidad: getQualityText,
        obtenerRangos: function() {
            return {
                optimo: { min: 400, max: 1000, color: colorPalette.green, estado: TRANSLATIONS.optimal || "ÓPTIMO" },
                advertencia: { min: 1000, max: 2000, color: colorPalette.yellow, estado: TRANSLATIONS.warning || "ADVERTENCIA" },
                critico: { min: 2000, max: 3000, color: colorPalette.red, estado: TRANSLATIONS.critical || "CRÍTICO" }
            };
        }
    };

    return gaugeObject;
}



// ===================== SISTEMA PRINCIPAL =====================
let batteryActualizar = null;
let tanqueAguaActualizar = null;
let gaugeO2Instancia = null;
let gaugeCO2Instancia = null;

// WebSockets
let wsBateria = null;
let wsAgua = null;
let wsO2 = null;
let wsCO2 = null;

// Conexión status
let connectionStatus = {
    bateria: false,
    agua: false,
    oxigeno: false,
    co2: false
};

// Tiempos de última actualización
let lastUpdate = {
    bateria: null,
    agua: null,
    oxigeno: null,
    co2: null
};

function inicializarVisualizaciones() {
    console.log("Inicializando visualizaciones...");

    batteryActualizar = initBatteryVisualization("#battery-svg", 0.65);
    tanqueAguaActualizar = crearTanqueAguaRealista("#tanque-agua", 65);
    gaugeO2Instancia = gaugeO2("#oxigeno-gauge", 21.5);
    gaugeCO2Instancia = gaugeCO2("#co2-gauge", 600);

    inicializarWebSockets();

    setInterval(() => {
        const now = new Date();
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent =
                `${TRANSLATIONS.last_update || "Última actualización"}: ${now.toLocaleTimeString()}`;
        }
    }, 1000);
}

function inicializarWebSockets() {
    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    console.log("Inicializando WebSockets...");
    console.log("Host:", host);
    console.log("Protocol:", protocol);

    const connectionElement = document.getElementById('connection-status');
    if (connectionElement) {
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>${TRANSLATIONS.connecting_websockets || "Conectando WebSockets..."}</span>`;
    }

    // ========== WEBSOCKET PARA BATERÍA ==========
    try {
        wsBateria = new WebSocket("ws://" + window.location.host + "/ws/energia/");
        
        wsBateria.onopen = function() {
            console.log("WebSocket Batería conectado");
            connectionStatus.bateria = true;
            actualizarEstadoConexion();
        };
        
        wsBateria.onmessage = function(e) {
            console.log("Datos recibidos de batería:", e.data);
            try {
                const data = JSON.parse(e.data);
                const soc = parseFloat(data.battery);
                const fecha = data.fecha_hora || new Date().toISOString();
                if (data.sample_id) {
                    wsBateria.send(JSON.stringify({
                        type: "ack_metric",
                        sample_id: data.sample_id,
                        cliente: "web"
                    }));
                }
                if (batteryActualizar) {
                    batteryActualizar(soc);
                }
                lastUpdate.bateria = fecha;

                const statusElement = document.getElementById('battery-status');
                const timeElement = document.getElementById('battery-time');
                
                if (statusElement) {
                    if (soc < 0.15) {
                        statusElement.textContent = TRANSLATIONS.critical || "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta(TRANSLATIONS.critical_battery || "Nivel de batería crítico", "critical");
                    } else if (soc < 0.3) {
                        statusElement.textContent = TRANSLATIONS.low || "BAJO";
                        statusElement.style.color = "#f59e0b";
                        agregarAlerta(TRANSLATIONS.low_battery || "Nivel de batería bajo", "warning");
                    } else if (soc < 0.7) {
                        statusElement.textContent = TRANSLATIONS.moderate || "MODERADO";
                        statusElement.style.color = "#3b82f6";
                    } else {
                        statusElement.textContent = TRANSLATIONS.optimal || "ÓPTIMO";
                        statusElement.style.color = "#10b981";
                    }
                }
                
                if (timeElement) {
                    timeElement.textContent = new Date(fecha).toLocaleTimeString();
                }
                
            } catch (error) {
                console.error('❌ Error procesando datos de batería:', error);
            }
        };
        
        wsBateria.onerror = function(error) {
            console.error("❌ Error en WebSocket Batería:", error);
            connectionStatus.bateria = false;
            actualizarEstadoConexion();
        };
        
        wsBateria.onclose = function() {
            console.warn("⚠️ WebSocket Batería desconectado");
            connectionStatus.bateria = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de batería...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Batería:", error);
    }
}
    // ========== WEBSOCKET PARA AGUA ==========
    try {
        wsAgua = new WebSocket("ws://" + window.location.host + "/ws/agua/");
        
        wsAgua.onopen = function() {
            console.log("WebSocket Agua conectado");
            connectionStatus.agua = true;
            actualizarEstadoConexion();
        };
        
        wsAgua.onmessage = function(e) {
            console.log("Datos recibidos de agua:", e.data);
            try {
                const data = JSON.parse(e.data);
                const valor = parseFloat(data.nivel);
                const fecha = data.fecha_hora;
                if (data.sample_id) {
                    wsAgua.send(JSON.stringify({
                        type: "ack_metric",
                        sample_id: data.sample_id,
                        cliente: "web"
                    }));
                }
                if (tanqueAguaActualizar) {
                    tanqueAguaActualizar(valor);
                }
                lastUpdate.agua = fecha;

                const statusElement = document.getElementById('agua-status');
                const timeElement = document.getElementById('agua-time');
                
                if (statusElement) {
                    if (valor < 20) {
                        statusElement.textContent = TRANSLATIONS.critical || "CRÍTICO";
                        statusElement.style.color = "#ef4444";
                        agregarAlerta(TRANSLATIONS.critical_water || "Nivel de agua crítico", "critical");
                    } else if (valor < 40) {
                        statusElement.textContent = TRANSLATIONS.low || "BAJO";
                        statusElement.style.color = "#f59e0b";
                    } else if (valor < 70) {
                        statusElement.textContent = TRANSLATIONS.moderate || "MODERADO";
                        statusElement.style.color = "#00bfff";
                    } else {
                        statusElement.textContent = TRANSLATIONS.optimal || "ÓPTIMO";
                        statusElement.style.color = "#22c55e";
                    }
                }
                
                if (timeElement) {
                    timeElement.textContent = new Date(fecha).toLocaleTimeString();
                }
            } catch (error) {
                console.error('❌ Error procesando datos de agua:', error);
            }
        };
        
        wsAgua.onerror = function(error) {
            console.error("❌ Error en WebSocket Agua:", error);
            connectionStatus.agua = false;
            actualizarEstadoConexion();
        };
        
        wsAgua.onclose = function() {
            console.warn("⚠️ WebSocket Agua desconectado");
            connectionStatus.agua = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de agua...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Agua:", error);
    }

    // ========== WEBSOCKET PARA OXÍGENO ==========
    try {
        wsO2 = new WebSocket(`${protocol}//${host}/ws/oxigeno/`);
        
        wsO2.onopen = function() {
            console.log("WebSocket Oxígeno conectado");
            connectionStatus.oxigeno = true;
            actualizarEstadoConexion();
        };
        
        wsO2.onmessage = function(e) {
            console.log("Datos recibidos de oxígeno:", e.data);
            try {
                const data = JSON.parse(e.data);
                if (gaugeO2Instancia) {
                    gaugeO2Instancia.update(data.nivel);
                }
                lastUpdate.oxigeno = data.fecha_hora;
                if (data.sample_id) {
                    wsO2.send(JSON.stringify({
                        type: "ack_metric",
                        sample_id: data.sample_id,
                        cliente: "web"
                    }));
                }

                const timeElement = document.getElementById('oxigeno-time');
                if (timeElement && data.fecha_hora) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
                actualizarCalidadAire();
            } catch (error) {
                console.error('❌ Error procesando datos de oxígeno:', error);
            }
        };
        
        wsO2.onerror = function(error) {
            console.error("❌ Error en WebSocket Oxígeno:", error);
            connectionStatus.oxigeno = false;
            actualizarEstadoConexion();
        };
        
        wsO2.onclose = function() {
            console.warn("⚠️ WebSocket Oxígeno desconectado");
            connectionStatus.oxigeno = false;
            actualizarEstadoConexion();
            setTimeout(() => {
                console.log("🔄 Reintentando conexión de oxígeno...");
                inicializarWebSockets();
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Error al crear WebSocket Oxígeno:", error);
    }

    // ========== WEBSOCKET PARA CO2 ==========
    try {
        wsCO2 = new WebSocket(`${protocol}//${host}/ws/co2/`);
        
        wsCO2.onopen = function() {
            console.log("✅ WebSocket CO2 conectado");
            connectionStatus.co2 = true;
            actualizarEstadoConexion();
        };
        
        wsCO2.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                if (gaugeCO2Instancia) {
                    gaugeCO2Instancia.update(data.valor);
                }
                lastUpdate.co2 = data.fecha_hora;
                if (data.sample_id) {
                    wsCO2.send(JSON.stringify({
                        type: "ack_metric",
                        sample_id: data.sample_id,
                        cliente: "web"
                    }));
                }
                const timeElement = document.getElementById('co2-time');
                if (timeElement && data.fecha_hora) {
                    timeElement.textContent = new Date(data.fecha_hora).toLocaleTimeString();
                }
                actualizarCalidadAire();
            } catch (error) {
                console.error('Error procesando datos de CO2:', error);
            }
        };
        
        wsCO2.onerror = function(error) {
            console.error("Error en WebSocket CO2:", error);
            connectionStatus.co2 = false;
            actualizarEstadoConexion();
        };
        
        wsCO2.onclose = function() {
            console.warn("WebSocket CO2 desconectado");
            connectionStatus.co2 = false;
            actualizarEstadoConexion();
            setTimeout(() => inicializarWebSockets(), 5000);
        };
    } catch (error) {
        console.error("Error al crear WebSocket CO2:", error);
    }



function actualizarEstadoConexion() {
    const connectionElement = document.getElementById('connection-status');
    if (!connectionElement) return;
    
    const totalConexiones = Object.keys(connectionStatus).length;
    const conexionesActivas = Object.values(connectionStatus).filter(v => v).length;

    if (conexionesActivas === totalConexiones) {
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>${TRANSLATIONS.all_sensors_connected || "Todos los sensores conectados"} (${conexionesActivas}/${totalConexiones})</span>`;
    } else if (conexionesActivas > 0) {
        connectionElement.className = 'connection-status connected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>${TRANSLATIONS.partially_connected_sensors || "Sensores parcialmente conectados"} (${conexionesActivas}/${totalConexiones})</span>`;
        
        const sensoresDesconectados = [];
        if (!connectionStatus.bateria) sensoresDesconectados.push(TRANSLATIONS.sensor_battery || "Batería");
        if (!connectionStatus.agua) sensoresDesconectados.push(TRANSLATIONS.sensor_water || "Agua");
        if (!connectionStatus.oxigeno) sensoresDesconectados.push(TRANSLATIONS.sensor_oxygen || "Oxígeno");
        if (!connectionStatus.co2) sensoresDesconectados.push(TRANSLATIONS.sensor_co2 || "CO2");
        
        if (sensoresDesconectados.length > 0) {
            agregarAlerta(`${TRANSLATIONS.disconnected_sensors || "Sensores desconectados"}: ${sensoresDesconectados.join(", ")}`, "warning");
        }
    } else {
        connectionElement.className = 'connection-status disconnected';
        connectionElement.innerHTML = `<i class="fas fa-circle"></i><span>${TRANSLATIONS.all_sensors_disconnected || "Todos los sensores desconectados"}</span>`;
    }
}

function actualizarCalidadAire() {
    if (!lastUpdate.oxigeno || !lastUpdate.co2) return;

    const qualityElement = document.getElementById('aire-quality');
    const timeElement = document.getElementById('aire-time');

    const o2Element = d3.select("#oxigeno-gauge").select("text:nth-child(2)");
    const co2Element = d3.select("#co2-gauge").select("text:nth-child(2)");

    if (o2Element.empty() || co2Element.empty()) return;

    const o2Text = o2Element.text();
    const co2Text = co2Element.text();

    const o2 = parseFloat(o2Text) || 21.0;
    const co2 = parseInt(co2Text) || 600;

    let calidad = TRANSLATIONS.air_quality_good || "BUENA";
    let color = "#22c55e";

    if (o2 < 19.5 || co2 > 1200) {
        calidad = TRANSLATIONS.air_quality_critical || "CRÍTICA";
        color = "#ef4444";
        agregarAlerta(TRANSLATIONS.critical_air || "Calidad del aire crítica", "critical");
    } else if (o2 < 21.0 || co2 > 800) {
        calidad = TRANSLATIONS.air_quality_moderate || "MODERADA";
        color = "#f59e0b";
    }

    if (qualityElement) {
        qualityElement.textContent = calidad;
        qualityElement.style.color = color;
    }

    const latestTime = new Date(Math.max(
        new Date(lastUpdate.oxigeno || 0),
        new Date(lastUpdate.co2 || 0)
    ));

    if (timeElement && latestTime.getTime() > 0) {
        timeElement.textContent = latestTime.toLocaleTimeString();
    }
}

function agregarAlerta(mensaje, tipo = "info") {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    const now = new Date();

    const alerta = document.createElement('div');
    alerta.className = `alert-item ${tipo}`;
    alerta.innerHTML = `
        <i class="fas fa-${tipo === 'critical' ? 'exclamation-circle' : 
                            tipo === 'warning' ? 'exclamation-triangle' : 
                            'info-circle'}"></i>
        <span>${mensaje}</span>
        <span class="alert-time">${now.toLocaleTimeString()}</span>
    `;

    container.insertBefore(alerta, container.firstChild);

    if (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }

    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 30000);
}

document.addEventListener('DOMContentLoaded', inicializarVisualizaciones);

window.addEventListener('beforeunload', function() {
    [wsBateria, wsAgua, wsO2, wsCO2].forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
});

window.addEventListener('error', function(e) {
    console.error("Error global detectado:", e.error);
});
