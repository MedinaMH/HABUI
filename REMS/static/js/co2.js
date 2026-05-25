document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== VARIABLES GENERALES =====================
    let stats = {
        current: null,
        min: Infinity,
        max: -Infinity,
        history: []
    };

    // ===================== RANGOS Y COLORES CO2 =====================
    const CO2_RANGES = [
        {
            min: 400,
            max: 1000,
            color: "#4caf50",
            textColor: "#4caf50",
            quality: "ÓPTIMO",
            description: "Indicador de ventilación adecuada y confort",
            icon: "🟢"
        },
        {
            min: 1000,
            max: 2000,
            color: "#ffc107",
            textColor: "#ffc107",
            quality: "ADVERTENCIA",
            description: "Somnolencia leve, reducción cognitiva",
            icon: "🟡"
        },
        {
            min: 2000,
            max: Infinity,
            color: "#f44336",
            textColor: "#f44336",
            quality: "CRÍTICO",
            description: "Riesgo fisiológico, hipercapnia progresiva",
            icon: "🔴"
        }
    ];

    function getRangeForValue(v) {
        if (v < CO2_RANGES[0].min) {
            return {
                ...CO2_RANGES[0],
                color: "#7ecf7e",
                textColor: "#7ecf7e",
                quality: "BAJO",
                description: "Concentración por debajo del rango esperado"
            };
        }

        for (let range of CO2_RANGES) {
            if (v >= range.min && v < range.max) {
                return range;
            }
        }

        return CO2_RANGES[CO2_RANGES.length - 1];
    }

    function getCO2Value(item) {
        const value =
            item.valor ??
            item.concentracion ??
            item.nivel ??
            item.co2 ??
            item.value;

        return parseFloat(value);
    }

    function getCO2Date(item) {
        return item.fecha_hora || item.timestamp || item.created_at || item.time;
    }

    // ===================== GAUGE VERTICAL CO2 =====================
    function gaugeCO2(containerId, initial) {
        const container = d3.select(containerId);
        container.html("");

        const width = 300;
        const height = 520;
        const min = 0.0;
        const max = 3000.0;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const colorPalette = {
            green: "#10b981",
            yellow: "#fbbf24",
            red: "#ef4444",
            lightGreen: "#34d399",
            darkGreen: "#059669",
            lightRed: "#f87171",
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

        const scale = d3.scaleLinear()
            .domain([min, max])
            .range([frameY + frameH, frameY]);

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
                return "ÓPTIMO";
            } else if (valor > 1000 && valor <= 2000) {
                return "ADVERTENCIA";
            } else {
                return "¡CRÍTICO!";
            }
        }

        function getFooterQualityText(v) {
            const valor = Math.max(min, Math.min(max, v));

            if (valor >= 400 && valor <= 1000) {
                return "ÓPTIMO";
            } else if (valor > 1000 && valor <= 2000) {
                return "ADVERTENCIA";
            } else {
                return "CRÍTICO";
            }
        }

        const fillRect = svg.append("rect")
            .attr("x", frameX)
            .attr("width", frameW)
            .attr("y", scale(initial))
            .attr("height", Math.max(2, frameY + frameH - scale(initial)))
            .attr("fill", colorFor(initial))
            .attr("rx", 12);

        const valueText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", frameY + frameH + 50)
            .attr("fill", colorFor(initial))
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(0) + " ppm");

        const qualityText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", frameY + frameH + 100)
            .attr("fill", colorFor(initial))
            .attr("font-size", "36px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getQualityText(initial));

        function actualizarGauge(newVal) {
            const parsedValue = parseFloat(newVal);
            if (isNaN(parsedValue)) return null;

            const valorLimitado = Math.max(min, Math.min(max, parsedValue));
            const y = scale(valorLimitado);
            const h = Math.max(2, frameY + frameH - y);
            const newColor = colorFor(valorLimitado);
            const qualityTextValue = getQualityText(valorLimitado);

            fillRect
                .transition()
                .duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            valueText
                .transition()
                .duration(300)
                .text(valorLimitado.toFixed(0) + " ppm")
                .attr("fill", newColor);

            qualityText
                .transition()
                .duration(300)
                .text(qualityTextValue)
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
                const horaStr =
                    ahora.getHours().toString().padStart(2, "0") +
                    ":" +
                    ahora.getMinutes().toString().padStart(2, "0");

                timeElement.textContent = horaStr;
            }

            stats.current = valorLimitado;
            stats.min = Math.min(stats.min, valorLimitado);
            stats.max = Math.max(stats.max, valorLimitado);
            stats.history.push({
                value: valorLimitado,
                time: new Date()
            });

            return valorLimitado;
        }

        async function cargarUltimoDatoBD() {
            try {
                const response = await fetch("/api/co2/");

                if (!response.ok) {
                    console.log("No se pudieron obtener datos de CO₂ de la BD");
                    return null;
                }

                const datos = await response.json();

                let rows = [];

                if (Array.isArray(datos)) {
                    rows = datos;
                } else if (datos && Array.isArray(datos.results)) {
                    rows = datos.results;
                }

                if (rows.length > 0) {
                    const ultimoDato = rows[0];
                    const ultimoValor = getCO2Value(ultimoDato);

                    if (isNaN(ultimoValor)) {
                        console.log("Valor de CO₂ no válido:", ultimoDato);
                        return null;
                    }

                    actualizarGauge(ultimoValor);
                    return ultimoValor;
                }

                return null;
            } catch (error) {
                console.log("Error al cargar último dato de CO₂:", error);
                return null;
            }
        }

        async function cargarDatosRecientesBD(limite = 10) {
            try {
                const response = await fetch("/api/co2/");

                if (!response.ok) {
                    console.log("No se pudieron obtener datos recientes de CO₂");
                    return [];
                }

                const datos = await response.json();

                let rows = [];

                if (Array.isArray(datos)) {
                    rows = datos;
                } else if (datos && Array.isArray(datos.results)) {
                    rows = datos.results;
                }

                const datosRecientes = rows.slice(0, limite);

                return datosRecientes
                    .map(dato => {
                        const valor = getCO2Value(dato);

                        if (isNaN(valor)) return null;

                        let calidad;

                        if (valor >= 400 && valor <= 1000) {
                            calidad = "ÓPTIMO";
                        } else if (valor > 1000 && valor <= 2000) {
                            calidad = "ADVERTENCIA";
                        } else {
                            calidad = "CRÍTICO";
                        }

                        return {
                            id: dato.id,
                            valor: valor,
                            fecha: getCO2Date(dato),
                            calidad: calidad
                        };
                    })
                    .filter(dato => dato !== null);
            } catch (error) {
                console.log("Error al cargar datos recientes de CO₂:", error);
                return [];
            }
        }

        setTimeout(() => {
            cargarUltimoDatoBD();
        }, 500);

        return {
            update(newVal) {
                const valorActualizado = actualizarGauge(newVal);

                if (valorActualizado === null) {
                    return null;
                }

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
            obtenerRangos() {
                return {
                    optimo: {
                        min: 400,
                        max: 1000,
                        color: colorPalette.green,
                        estado: "ÓPTIMO"
                    },
                    advertencia: {
                        min: 1000,
                        max: 2000,
                        color: colorPalette.yellow,
                        estado: "ADVERTENCIA"
                    },
                    critico: {
                        min: 2000,
                        max: 3000,
                        color: colorPalette.red,
                        estado: "CRÍTICO"
                    }
                };
            }
        };
    }

    // ===================== GRÁFICA LINEAL CO2 =====================
    function lineChartCO2(containerId) {
        const container = d3.select(containerId);
        container.html("");

        const outerW = 1200;
        const outerH = 600;
        const margin = {
            top: 50,
            right: 40,
            bottom: 60,
            left: 80
        };

        const width = outerW - margin.left - margin.right;
        const height = outerH - margin.top - margin.bottom;

        // Ventana inicial de 1 minuto
        const DEFAULT_WINDOW_MS = 60 * 1000;

        // Zoom mínimo y máximo
        const MIN_WINDOW_MS = 10 * 1000;
        const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

        const ZOOM_FACTOR = 0.18;
        const LIVE_EDGE_TOLERANCE_MS = 1500;
        const DRAG_DIRECTION_THRESHOLD_PX = 2;

        let data = [];
        let currentViewStart = null;
        let currentViewEnd = null;
        let currentWindowMs = DEFAULT_WINDOW_MS;
        let autoFollowLatest = true;

        let isDragging = false;
        let dragStartX = 0;
        let dragStartViewStart = null;
        let dragStartViewEnd = null;

        const svg = container.append("svg")
            .attr("width", outerW)
            .attr("height", outerH)
            .style("background", "#0f172a")
            .style("border", "3px solid #ffffff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 4px 20px rgba(76, 175, 80, 0.15)");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        svg.append("text")
            .attr("x", outerW / 2)
            .attr("y", 28)
            .attr("fill", "#ffffff")
            .attr("font-size", "20px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .style("letter-spacing", "0.5px")
            .text(TRANSLATIONS.history_co2 || "HISTÓRICO DE CO₂ (ppm)");

        // ===================== BOTÓN DE INICIO =====================
        const homeButton = container.append("button")
            .attr("class", "btn btn-sm")
            .style("position", "absolute")
            .style("top", "12px")
            .style("right", "12px")
            .style("background", "rgba(76, 175, 80, 0.2)")
            .style("color", "#4caf50")
            .style("border", "1px solid #4caf50")
            .style("border-radius", "6px")
            .style("padding", "8px 12px")
            .style("cursor", "pointer")
            .style("z-index", "10")
            .style("transition", "all 0.3s")
            .attr("title", "Volver al último minuto")
            .html('<i class="bi bi-house-door"></i>')
            .on("mouseover", function () {
                d3.select(this)
                    .style("background", "#4caf50")
                    .style("color", "#0f172a")
                    .style("transform", "scale(1.05)");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .style("background", "rgba(76, 175, 80, 0.2)")
                    .style("color", "#4caf50")
                    .style("transform", "scale(1)");
            })
            .on("click", function () {
                goToLatest(true);

                d3.select(this)
                    .style("background", "#45a049")
                    .style("color", "#0f172a");

                setTimeout(() => {
                    d3.select(this)
                        .style("background", "rgba(76, 175, 80, 0.2)")
                        .style("color", "#4caf50");
                }, 300);
            });

        // ===================== ESCALAS =====================
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        const defs = svg.append("defs");

        const gradient = defs.append("linearGradient")
            .attr("id", "co2-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(76, 175, 80, 0.4)")
            .attr("stop-opacity", 0.5);

        gradient.append("stop")
            .attr("offset", "80%")
            .attr("stop-color", "rgba(76, 175, 80, 0.1)")
            .attr("stop-opacity", 0.2);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(76, 175, 80, 0.05)")
            .attr("stop-opacity", 0.1);

        const lineGradient = defs.append("linearGradient")
            .attr("id", "co2-line-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

        lineGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#4caf50");

        lineGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#45a049");

        const line = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        const area = d3.area()
            .x(d => x(d.time))
            .y0(height)
            .y1(d => y(d.value))
            .curve(d3.curveMonotoneX);

        const grid = g.append("g")
            .attr("class", "grid");

        const zonesGroup = g.append("g")
            .attr("class", "zones-group");

        const referenceLines = g.append("g")
            .attr("class", "reference-lines");

        const areaPath = g.append("path")
            .attr("class", "area-co2")
            .attr("fill", "url(#co2-gradient)")
            .attr("stroke", "none");

        const path = g.append("path")
            .attr("class", "line-co2")
            .attr("fill", "none")
            .attr("stroke", "url(#co2-line-gradient)")
            .attr("stroke-width", 3.5)
            .style("filter", "drop-shadow(0 0 8px rgba(76, 175, 80, 0.5))");

        const xAxisG = g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .style("font-size", "12px");

        const yAxisG = g.append("g")
            .attr("class", "y-axis")
            .style("font-size", "12px");

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -62)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("CO₂ (ppm)");

        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.tiempo || "Tiempo");

        const co2ZonesData = [
            {
                min: 400,
                max: 1000,
                color: "rgba(76, 175, 80, 0.1)",
                label: "ÓPTIMO",
                description: "400 - 1000 ppm"
            },
            {
                min: 1000,
                max: 2000,
                color: "rgba(255, 193, 7, 0.1)",
                label: "ADVERTENCIA",
                description: "1000 - 2000 ppm"
            },
            {
                min: 2000,
                max: 3000,
                color: "rgba(244, 67, 54, 0.1)",
                label: "CRÍTICO",
                description: "> 2000 ppm"
            }
        ];

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-co2")
            .style("position", "absolute")
            .style("background", "rgba(15, 23, 42, 0.95)")
            .style("color", "#e2e8f0")
            .style("padding", "12px 16px")
            .style("border", "2px solid #4caf50")
            .style("border-radius", "10px")
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("box-shadow", "0 8px 24px rgba(0, 0, 0, 0.3)")
            .style("backdrop-filter", "blur(4px)")
            .style("z-index", "9999");

        const focus = g.append("circle")
            .attr("class", "focus-point")
            .attr("r", 0)
            .attr("fill", "#4caf50")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(76, 175, 80, 0.8))")
            .style("opacity", 0);

        const verticalLine = g.append("line")
            .attr("class", "vertical-line")
            .attr("stroke", "rgba(255, 255, 255, 0.3)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0);

        // ===================== FUNCIONES AUXILIARES =====================
        function clamp(value, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, value));
        }

        function getLatestTime() {
            if (data.length === 0) {
                return new Date();
            }

            return data[data.length - 1].time;
        }

        function getEarliestTime() {
            if (data.length === 0) {
                return new Date();
            }

            return data[0].time;
        }

        function ensureViewInitialized() {
            if (currentViewStart && currentViewEnd) return;

            const latest = getLatestTime();

            currentViewEnd = new Date(latest);
            currentViewStart = new Date(latest.getTime() - currentWindowMs);
        }

        function getVisibleData() {
            ensureViewInitialized();

            return data.filter(d => {
                return d.time >= currentViewStart && d.time <= currentViewEnd;
            });
        }

        function setHistoricalMode() {
            autoFollowLatest = false;
        }

        function setLiveMode() {
            autoFollowLatest = true;
        }

        function goToLatest(resetToOneMinute = false) {
            if (resetToOneMinute) {
                currentWindowMs = DEFAULT_WINDOW_MS;
            }

            const latest = getLatestTime();

            currentViewEnd = new Date(latest);
            currentViewStart = new Date(latest.getTime() - currentWindowMs);

            setLiveMode();
            redraw();
        }

        function clampViewToDataRange() {
            if (data.length === 0 || !currentViewStart || !currentViewEnd) return;

            const earliest = getEarliestTime();
            const latest = getLatestTime();
            const viewMs = currentViewEnd.getTime() - currentViewStart.getTime();

            if (currentViewStart.getTime() < earliest.getTime()) {
                currentViewStart = new Date(earliest);
                currentViewEnd = new Date(earliest.getTime() + viewMs);
            }

            if (currentViewEnd.getTime() > latest.getTime()) {
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - viewMs);
            }

            currentWindowMs = currentViewEnd.getTime() - currentViewStart.getTime();
        }

        function maybeReactivateLiveFromPan() {
            if (data.length === 0 || !currentViewEnd) return;

            const latest = getLatestTime();

            if (Math.abs(currentViewEnd.getTime() - latest.getTime()) <= LIVE_EDGE_TOLERANCE_MS) {
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - currentWindowMs);
                setLiveMode();
            }
        }

        function updateViewForNewData() {
            if (!currentViewStart || !currentViewEnd) {
                goToLatest(false);
                return;
            }

            if (autoFollowLatest) {
                const latest = getLatestTime();
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - currentWindowMs);
            }
        }

        function getYDomain(visibleData) {
            const baseMin = 0;
            const baseMax = 3000;

            if (!visibleData || visibleData.length === 0) {
                return [baseMin, baseMax];
            }

            const minVal = d3.min(visibleData, d => d.value);
            const maxVal = d3.max(visibleData, d => d.value);

            const padding = Math.max(50, (maxVal - minVal) * 0.15);

            let yMin = Math.max(baseMin, minVal - padding);
            let yMax = Math.min(baseMax, maxVal + padding);

            if (yMax - yMin < 300) {
                const mid = (yMin + yMax) / 2;
                yMin = Math.max(baseMin, mid - 150);
                yMax = Math.min(baseMax, mid + 150);
            }

            if (yMin === yMax) {
                yMin = Math.max(baseMin, yMin - 100);
                yMax = Math.min(baseMax, yMax + 100);
            }

            return [yMin, yMax];
        }

        function formatWindowLabel(ms) {
            if (ms < 60000) {
                return `${Math.round(ms / 1000)}s`;
            }

            if (ms < 3600000) {
                return `${(ms / 60000).toFixed(1)} min`;
            }

            if (ms < 86400000) {
                return `${(ms / 3600000).toFixed(1)} h`;
            }

            return `${(ms / 86400000).toFixed(1)} d`;
        }

        // ===================== REDIBUJADO =====================
        function redraw() {
            updateViewForNewData();

            const visibleData = getVisibleData();

            if (!currentViewStart || !currentViewEnd) return;

            x.domain([currentViewStart, currentViewEnd]);

            const yDomain = getYDomain(visibleData);
            y.domain(yDomain);

            // Zonas de CO2
            const co2Zones = zonesGroup.selectAll(".co2-zone")
                .data(co2ZonesData);

            co2Zones.enter()
                .append("rect")
                .attr("class", "co2-zone")
                .merge(co2Zones)
                .attr("x", 0)
                .attr("width", width)
                .attr("y", d => y(Math.min(d.max, yDomain[1])))
                .attr("height", d => {
                    const zoneMin = Math.max(d.min, yDomain[0]);
                    const zoneMax = Math.min(d.max, yDomain[1]);

                    if (zoneMax <= yDomain[0] || zoneMin >= yDomain[1]) {
                        return 0;
                    }

                    return Math.max(0, y(zoneMin) - y(zoneMax));
                })
                .attr("fill", d => d.color)
                .attr("rx", 2);

            co2Zones.exit().remove();

            const linesData = [
                {
                    value: 400,
                    label: "Mínimo óptimo",
                    color: "rgba(76, 175, 80, 0.5)"
                },
                {
                    value: 1000,
                    label: "Límite advertencia",
                    color: "rgba(255, 193, 7, 0.5)"
                },
                {
                    value: 2000,
                    label: "Límite crítico",
                    color: "rgba(244, 67, 54, 0.5)"
                }
            ];

            const filteredLinesData = linesData.filter(d => {
                return d.value >= yDomain[0] && d.value <= yDomain[1];
            });

            const referenceLine = referenceLines.selectAll(".reference-line")
                .data(filteredLinesData);

            referenceLine.enter()
                .append("line")
                .attr("class", "reference-line")
                .merge(referenceLine)
                .attr("x1", 0)
                .attr("y1", d => y(d.value))
                .attr("x2", width)
                .attr("y2", d => y(d.value))
                .attr("stroke", d => d.color)
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "8,4")
                .style("opacity", 0.5);

            referenceLine.exit().remove();

            grid.call(
                d3.axisLeft(y)
                    .ticks(6)
                    .tickSize(-width)
                    .tickFormat("")
            )
                .attr("opacity", 0.15)
                .selectAll("line")
                .attr("stroke", "#4caf50");

            grid.select(".domain").remove();

            xAxisG.call(
                d3.axisBottom(x)
                    .ticks(6)
                    .tickFormat(d3.timeFormat("%H:%M:%S"))
                    .tickSizeOuter(0)
            )
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500");

            xAxisG.selectAll("path, line")
                .attr("stroke", "#4caf50")
                .attr("opacity", 0.5);

            yAxisG.call(
                d3.axisLeft(y)
                    .ticks(6)
                    .tickFormat(d => `${Math.round(d)} ppm`)
                    .tickSizeOuter(0)
            )
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500")
                .attr("dx", "-5px");

            yAxisG.selectAll("path, line")
                .attr("stroke", "#4caf50")
                .attr("opacity", 0.5);

            yAxisG.select(".domain")
                .attr("stroke", "none");

            if (visibleData.length > 0) {
                path.datum(visibleData)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr("d", line);

                areaPath.datum(visibleData)
                    .transition()
                    .duration(250)
                    .ease(d3.easeCubicOut)
                    .attr("d", area);
            } else {
                path.datum([])
                    .attr("d", line);

                areaPath.datum([])
                    .attr("d", area);
            }

            const points = g.selectAll(".data-point")
                .data(visibleData, d => d.id);

            points.enter()
                .append("circle")
                .attr("class", "data-point")
                .attr("r", 0)
                .merge(points)
                .attr("cx", d => x(d.time))
                .attr("cy", d => y(d.value))
                .transition()
                .duration(150)
                .attr("r", 4)
                .attr("fill", d => getRangeForValue(d.value).color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9);

            g.selectAll(".data-point")
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    const range = getRangeForValue(d.value);

                    focus
                        .attr("cx", x(d.time))
                        .attr("cy", y(d.value))
                        .attr("fill", range.color)
                        .transition()
                        .duration(200)
                        .attr("r", 8)
                        .style("opacity", 1);

                    verticalLine
                        .attr("x1", x(d.time))
                        .attr("y1", 0)
                        .attr("x2", x(d.time))
                        .attr("y2", height)
                        .transition()
                        .duration(200)
                        .style("opacity", 1);

                    tooltip
                        .html(`
                            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                <div style="font-size: 18px; margin-right: 8px;">${range.icon}</div>
                                <strong style="font-size: 16px; color: ${range.textColor};">${Math.round(d.value)} ppm</strong>
                            </div>
                            <div style="color: ${range.textColor}; margin-bottom: 4px; font-weight: 600;">
                                ${range.quality}
                            </div>
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
                                ${range.description}
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1; border-top: 1px solid #334155; padding-top: 6px;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("border-color", range.color)
                        .style("left", event.pageX + 15 + "px")
                        .style("top", event.pageY - 100 + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                })
                .on("mouseout", function () {
                    focus.transition()
                        .duration(200)
                        .attr("r", 0)
                        .style("opacity", 0);

                    verticalLine.transition()
                        .duration(200)
                        .style("opacity", 0);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });

            points.exit()
                .transition()
                .duration(150)
                .attr("r", 0)
                .remove();

            g.selectAll(".data-counter").remove();

            const visibleText = `${visibleData.length}/${data.length}`;
            const modeText = autoFollowLatest ? "EN VIVO" : "HISTÓRICO";

            g.append("text")
                .attr("class", "data-counter")
                .attr("x", width - 10)
                .attr("y", 20)
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .attr("text-anchor", "end")
                .text(`${visibleText} · ${modeText}`);

            g.selectAll(".zoom-label").remove();

            g.append("text")
                .attr("class", "zoom-label")
                .attr("x", 10)
                .attr("y", 20)
                .attr("fill", "#475569")
                .attr("font-size", "10px")
                .text(`Ventana: ${formatWindowLabel(currentWindowMs)}`);
        }

        // ===================== DESPLAZAMIENTO HORIZONTAL =====================
        svg.on("mousedown", function (event) {
            if (!currentViewStart || !currentViewEnd) return;

            isDragging = true;
            dragStartX = event.clientX;
            dragStartViewStart = new Date(currentViewStart);
            dragStartViewEnd = new Date(currentViewEnd);

            svg.style("cursor", "grabbing");
        });

        svg.on("mousemove", function (event) {
            if (!isDragging || !dragStartViewStart || !dragStartViewEnd) return;

            const dx = event.clientX - dragStartX;

            // Solo cuando se arrastra hacia la derecha se desactiva el tiempo real
            if (dx > DRAG_DIRECTION_THRESHOLD_PX) {
                setHistoricalMode();
            }

            const msPerPixel =
                (dragStartViewEnd.getTime() - dragStartViewStart.getTime()) / width;

            const deltaMs = dx * msPerPixel;

            currentViewStart = new Date(dragStartViewStart.getTime() - deltaMs);
            currentViewEnd = new Date(dragStartViewEnd.getTime() - deltaMs);

            clampViewToDataRange();
            maybeReactivateLiveFromPan();
            redraw();
        });

        svg.on("mouseup", function () {
            isDragging = false;
            maybeReactivateLiveFromPan();
            svg.style("cursor", "grab");
            redraw();
        });

        svg.on("mouseleave", function () {
            isDragging = false;
            svg.style("cursor", "default");
        });

        svg.style("cursor", "grab");

        // ===================== DOBLE CLIC =====================
        svg.on("dblclick", function () {
            goToLatest(false);
        });

        // ===================== ZOOM CON RUEDA =====================
        svg.node().addEventListener(
            "wheel",
            function (event) {
                event.preventDefault();

                ensureViewInitialized();

                const rect = svg.node().getBoundingClientRect();
                const rawX = event.clientX - rect.left - margin.left;
                const mouseX = clamp(rawX, 0, width);
                const mouseXRel = mouseX / width;

                const oldMs =
                    currentViewEnd.getTime() - currentViewStart.getTime();

                const dir = event.deltaY > 0 ? 1 : -1;

                let newMs = Math.round(oldMs * (1 + dir * ZOOM_FACTOR));
                newMs = clamp(newMs, MIN_WINDOW_MS, MAX_WINDOW_MS);

                if (newMs === oldMs) return;

                currentWindowMs = newMs;

                const anchorMs =
                    currentViewStart.getTime() + mouseXRel * oldMs;

                currentViewStart = new Date(anchorMs - mouseXRel * newMs);
                currentViewEnd = new Date(currentViewStart.getTime() + newMs);

                setHistoricalMode();
                clampViewToDataRange();
                maybeReactivateLiveFromPan();
                redraw();
            },
            { passive: false }
        );

        // ===================== AGREGAR NUEVO DATO =====================
        function addData(value, timestampStr) {
            const parsedValue = parseFloat(value);
            const time = timestampStr ? new Date(timestampStr) : new Date();

            if (isNaN(parsedValue) || isNaN(time.getTime())) {
                console.log("Dato CO₂ inválido:", value, timestampStr);
                return;
            }

            data.push({
                id: `data-${time.getTime()}-${Math.random()}`,
                time: time,
                value: parsedValue
            });

            data.sort((a, b) => a.time - b.time);

            redraw();
        }

        // ===================== CARGA DE HISTÓRICO COMPLETO =====================
        async function fetchAllHistoricalData(initialUrl = "/api/co2/") {
            let allRows = [];
            let nextUrl = initialUrl;
            let safety = 0;

            while (nextUrl && safety < 200) {
                const response = await fetch(nextUrl);

                if (!response.ok) {
                    throw new Error(`Error HTTP ${response.status} al consultar ${nextUrl}`);
                }

                const payload = await response.json();

                if (Array.isArray(payload)) {
                    allRows = allRows.concat(payload);
                    nextUrl = null;
                } else if (payload && Array.isArray(payload.results)) {
                    allRows = allRows.concat(payload.results);
                    nextUrl = payload.next || null;
                } else {
                    nextUrl = null;
                }

                safety += 1;
            }

            return allRows;
        }

        async function loadHistoricalData() {
            try {
                const apiData = await fetchAllHistoricalData("/api/co2/");

                if (apiData && apiData.length > 0) {
                    data = apiData
                        .map(item => {
                            const value = getCO2Value(item);
                            const time = new Date(getCO2Date(item));

                            return {
                                id: `db-${item.id || getCO2Date(item) || Math.random()}`,
                                time: time,
                                value: value
                            };
                        })
                        .filter(item => {
                            return !isNaN(item.time.getTime()) && !isNaN(item.value);
                        })
                        .sort((a, b) => a.time - b.time);

                    autoFollowLatest = true;

                    const latest = getLatestTime();
                    currentViewEnd = new Date(latest);
                    currentViewStart = new Date(latest.getTime() - currentWindowMs);

                    redraw();

                    if (data.length > 0) {
                        const lastValue = data[data.length - 1].value;

                        if (window.gaugeInstance) {
                            window.gaugeInstance.update(lastValue);
                        }

                        if (window.co2GaugeInstance) {
                            window.co2GaugeInstance.update(lastValue);
                        }
                    }
                } else {
                    redraw();
                }
            } catch (error) {
                console.log("No se pudieron cargar datos históricos de CO₂:", error);
            }
        }

        loadHistoricalData();

        return {
            push(value, timestampStr) {
                addData(value, timestampStr);
            },

            reset() {
                data = [];
                currentViewStart = null;
                currentViewEnd = null;
                currentWindowMs = DEFAULT_WINDOW_MS;
                autoFollowLatest = true;

                path.datum([]).attr("d", line);
                areaPath.datum([]).attr("d", area);

                g.selectAll(".data-point").remove();
                g.selectAll(".co2-zone").remove();
                g.selectAll(".data-counter").remove();
                g.selectAll(".zoom-label").remove();
                g.selectAll(".reference-line").remove();

                focus.attr("r", 0).style("opacity", 0);
                verticalLine.style("opacity", 0);
                tooltip.style("opacity", 0);
            },

            setData(newData) {
                data = newData
                    .map((d, i) => ({
                        id: `data-${i}`,
                        time: new Date(d.t || d.time || d.fecha_hora),
                        value: parseFloat(d.v || d.value || d.valor || d.concentracion || d.nivel)
                    }))
                    .filter(d => !isNaN(d.time.getTime()) && !isNaN(d.value))
                    .sort((a, b) => a.time - b.time);

                autoFollowLatest = true;

                const latest = getLatestTime();
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - currentWindowMs);

                redraw();
            },

            goHome() {
                goToLatest(true);
            },

            loadData() {
                loadHistoricalData();
            },

            setWindowMinutes(minutes) {
                currentWindowMs = clamp(
                    minutes * 60000,
                    MIN_WINDOW_MS,
                    MAX_WINDOW_MS
                );

                goToLatest(false);
            }
        };
    }

    // ===================== INSTANCIAS =====================
    const gauge = gaugeCO2("#gauge-co2", 600);
    const series = lineChartCO2("#serie-co2");

    window.gaugeInstance = gauge;
    window.seriesInstance = series;
    window.co2GaugeInstance = gauge;
    window.co2SeriesInstance = series;

    // ===================== WEBSOCKET CO2 =====================
    const socketProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(socketProtocol + window.location.host + "/ws/co2/");

    socket.onmessage = function (e) {
        const mensaje = JSON.parse(e.data);

        const valor =
            mensaje.valor ??
            mensaje.concentracion ??
            mensaje.nivel ??
            mensaje.co2 ??
            mensaje.value;

        const fecha =
            mensaje.fecha_hora ||
            mensaje.timestamp ||
            mensaje.created_at ||
            mensaje.time;

        if (valor === undefined || valor === null || isNaN(parseFloat(valor))) {
            console.log("Mensaje CO₂ recibido sin valor numérico válido:", mensaje);
            return;
        }

        gauge.update(valor);
        series.push(valor, fecha);

        if (mensaje.sample_id) {
            socket.send(JSON.stringify({
                type: "ack_metric",
                sample_id: mensaje.sample_id,
                cliente: "web"
            }));
        }
    };

    socket.onopen = function () {
        console.log("WebSocket CO₂ conectado");
    };

    socket.onerror = function (error) {
        console.error("Error en WebSocket CO₂:", error);
    };

    socket.onclose = function () {
        console.warn("WebSocket CO₂ desconectado");

        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});