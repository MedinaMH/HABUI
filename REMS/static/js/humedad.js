document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== GAUGE VERTICAL (HUMEDAD %) =====================
    function gaugeHumedad(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

        const width = 300;
        const height = 520;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("border-radius", "8px");

        // Paleta de colores según el semáforo de 3 estados
        const humPalette = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO (<30% o >70%)
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (30-40% o 60-70%)
            optimo: "#69db7c",        // Verde para ÓPTIMO (40-60%)
            white: "#ffffff" 
        };

        // outer frame
        const frameX = 85;
        const frameY = 70;
        const frameW = 180;
        const frameH = 360;

        svg.append("rect")
            .attr("x", frameX)
            .attr("y", frameY)
            .attr("width", frameW)
            .attr("height", frameH)
            .attr("rx", 14)
            .attr("fill", "#0f1724")
            .attr("stroke", humPalette.white)
            .attr("stroke-width", 3);

        // fill rect
        const min = 0;
        const max = 100;
        const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
        
        // ===================== LÍNEAS DE NIVEL =====================
        for (let i = 0; i <= 100; i += 25) {
            const y = scale(i);
            
            // Línea horizontal de nivel
            svg.append("line")
                .attr("x1", frameX - 10)
                .attr("y1", y)
                .attr("x2", frameX)
                .attr("y2", y)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5);
            
            // Texto de valor
            svg.append("text")
                .attr("x", frameX - 20)
                .attr("y", y + 4)
                .attr("fill", "#ffffff")
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
            .attr("fill", humPalette.critico)
            .attr("rx", 12);

        const valueText = svg.append("text")
            .attr("x", width/2+30)
            .attr("y", frameY + frameH + 50)
            .attr("fill", humPalette.critico)
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(1) + " %");

        // Indicador de nivel
        const levelText = svg.append("text")
            .attr("x", width/2+30)
            .attr("y", frameY + frameH + 85)
            .attr("fill", humPalette.critico)
            .attr("font-size", "36px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getNivelTexto(initial));

        function colorFor(v) {
            if (v < 30 || v > 70) return humPalette.critico;        // CRÍTICO (rojo)
            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) return humPalette.advertencia; // ADVERTENCIA (amarillo)
            return humPalette.optimo;                                // ÓPTIMO (verde)
        }

        function getNivelTexto(v) {
            if (v < 30 || v > 70) return "CRÍTICO";
            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) return "ADVERTENCIA";
            return "ÓPTIMO";
        }

        function getDescripcionNivel(v) {
            if (v < 30) return "Irritación respiratoria por sequedad extrema";
            if (v < 40) return "Riesgo de sequedad respiratoria";
            if (v < 60) return "Minimiza patógenos, maximiza confort respiratorio";
            if (v <= 70) return "Riesgo de proliferación microbiana";
            return "Riesgo de crecimiento de moho e irritación respiratoria";
        }

        // Estadísticas
        const stats = {
            current: initial,
            min: initial,
            max: initial,
            history: []
        };

        // Actualizar estadísticas
        function updateStats(newVal) {
            stats.current = newVal;
            stats.min = Math.min(stats.min, newVal);
            stats.max = Math.max(stats.max, newVal);
            stats.history.push({
                value: newVal,
                timestamp: new Date().toISOString(),
                nivel: getNivelTexto(newVal),
                color: colorFor(newVal)
            });
            
            // Mantener solo los últimos 100 valores en el historial
            if (stats.history.length > 100) {
                stats.history.shift();
            }
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de Humedad desde BD para obtener el último...');
                const response = await fetch('/api/humedad/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Humedad de la BD');
                    return null;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de Humedad - campo "valor"
                    let ultimoValor = parseFloat(ultimoDato.valor);
                    const nivel = getNivelTexto(ultimoValor);
                    console.log('Último dato de Humedad encontrado:', 
                        ultimoValor.toFixed(1) + ' %', 
                        'Nivel:', nivel,
                        'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de Humedad en la BD');
                    return null;
                }
            } catch (error) {
                console.log('Error al cargar datos de Humedad:', error);
                return null;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de Humedad...`);
                const response = await fetch('/api/humedad/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Humedad de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor = parseFloat(dato.valor);
                        if (isNaN(valor)) return null;
                        
                        return {
                            id: dato.id,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            nivel: getNivelTexto(valor),
                            estado: getNivelTexto(valor).toLowerCase(),
                            color: colorFor(valor),
                            descripcion: getDescripcionNivel(valor)
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de Humedad`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de Humedad:', error);
                return [];
            }
        }

        // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
        function actualizarGauge(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (frameY + frameH) - y);
            const newColor = colorFor(newVal);

            fillRect
                .transition().duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            valueText
                .transition().duration(300)
                .text(newVal.toFixed(1) + " %")
                .attr("fill", newColor);

            levelText
                .transition().duration(300)
                .text(getNivelTexto(newVal))
                .attr("fill", newColor);
            
            // Actualizar estadísticas
            updateStats(newVal);
        }

        // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
        setTimeout(() => {
            cargarUltimoDatoBD();
        }, 500);

        // =================== RETORNO DE FUNCIONES ===================
        const gaugeObject = {
            update: function(newVal) {
                actualizarGauge(newVal);
            },
            cargarUltimoDato: cargarUltimoDatoBD,
            cargarDatosRecientes: cargarDatosRecientesBD,
            actualizar: actualizarGauge,
            obtenerColorSegunValor: colorFor,
            obtenerNivelTexto: getNivelTexto,
            obtenerDescripcionNivel: getDescripcionNivel,
            // Obtener estadísticas
            getStats: function() {
                return {
                    ...stats,
                    nivelActual: getNivelTexto(stats.current),
                    colorActual: colorFor(stats.current),
                    descripcionActual: getDescripcionNivel(stats.current)
                };
            },
            // Resetear estadísticas
            resetStats: function() {
                stats.min = stats.current;
                stats.max = stats.current;
                stats.history = [];
            }
        };

        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE HUMEDAD =====================
    function lineChartHumedad(containerId) {
        const container = d3.select(containerId);
        container.html("");

        const outerW = 1200;
        const outerH = 600;
        const margin = { top: 50, right: 40, bottom: 60, left: 80 };
        const width = outerW - margin.left - margin.right;
        const height = outerH - margin.top - margin.bottom;

        // ===================== CONFIGURACIÓN DE VENTANA TEMPORAL =====================
        // Ventana inicial: 1 minuto
        const DEFAULT_WINDOW_MS = 60 * 1000;

        // Límites de zoom
        const MIN_WINDOW_MS = 10 * 1000;              // 10 segundos
        const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;    // 24 horas

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
            .style("box-shadow", "0 4px 20px rgba(255, 107, 107, 0.15)");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ===================== TÍTULO =====================
        svg.append("text")
            .attr("x", outerW / 2)
            .attr("y", 28)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .style("letter-spacing", "0.5px")
            .text(
                typeof TRANSLATIONS !== "undefined" && TRANSLATIONS.history_humedad
                    ? TRANSLATIONS.history_humedad
                    : "HISTÓRICO DE HUMEDAD (%)"
            );

        // ===================== BOTÓN HOME =====================
        container.append("button")
            .attr("class", "btn btn-sm")
            .style("position", "absolute")
            .style("top", "12px")
            .style("right", "12px")
            .style("background", "rgba(255, 107, 107, 0.2)")
            .style("color", "#ff6b6b")
            .style("border", "1px solid #ff6b6b")
            .style("border-radius", "6px")
            .style("padding", "8px 12px")
            .style("cursor", "pointer")
            .style("z-index", "10")
            .style("transition", "all 0.3s")
            .attr("title", "Volver al último minuto")
            .html('<i class="bi bi-house-door"></i>')
            .on("mouseover", function () {
                d3.select(this)
                    .style("background", "#ff6b6b")
                    .style("color", "#0f172a")
                    .style("transform", "scale(1.05)");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .style("background", "rgba(255, 107, 107, 0.2)")
                    .style("color", "#ff6b6b")
                    .style("transform", "scale(1)");
            })
            .on("click", function () {
                goToLatest(true);

                d3.select(this)
                    .style("background", "#ff5252")
                    .style("color", "#0f172a");

                setTimeout(() => {
                    d3.select(this)
                        .style("background", "rgba(255, 107, 107, 0.2)")
                        .style("color", "#ff6b6b");
                }, 300);
            });

        // Ayuda visual discreta
        container.append("div")
            .style("position", "absolute")
            .style("bottom", "70px")
            .style("right", "14px")
            .style("font-size", "10px")
            .style("color", "#475569")
            .style("pointer-events", "none")
            .text("🖱 Rueda: zoom  |  Arrastrar: desplazar  |  Doble clic: volver al final");

        // ===================== ESCALAS =====================
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Paleta de colores para humedad según semáforo
        const humColors = {
            critico: "#ff6b6b",
            advertencia: "#ffd43b",
            optimo: "#69db7c"
        };

        const safeId = String(containerId).replace(/[^a-zA-Z0-9_-]/g, "_");
        const gradientId = `hum-gradient-${safeId}`;
        const lineGradientId = `hum-line-gradient-${safeId}`;

        // ===================== DEFS / GRADIENTES =====================
        const defs = svg.append("defs");

        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(255, 107, 107, 0.4)")
            .attr("stop-opacity", 0.5);

        gradient.append("stop")
            .attr("offset", "80%")
            .attr("stop-color", "rgba(255, 107, 107, 0.1)")
            .attr("stop-opacity", 0.2);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(255, 107, 107, 0.05)")
            .attr("stop-opacity", 0.1);

        const lineGradient = defs.append("linearGradient")
            .attr("id", lineGradientId)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

        lineGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ff6b6b");

        lineGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#ff8787");

        // ===================== GENERADORES =====================
        const line = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        const area = d3.area()
            .x(d => x(d.time))
            .y0(height)
            .y1(d => y(d.value))
            .curve(d3.curveMonotoneX);

        const zonesGroup = g.append("g")
            .attr("class", "zones-group");

        const grid = g.append("g")
            .attr("class", "grid");

        const areaPath = g.append("path")
            .attr("class", "area-hum")
            .attr("fill", `url(#${gradientId})`)
            .attr("stroke", "none");

        const path = g.append("path")
            .attr("class", "line-hum")
            .attr("fill", "none")
            .attr("stroke", `url(#${lineGradientId})`)
            .attr("stroke-width", 3.5)
            .style("filter", "drop-shadow(0 0 8px rgba(255, 107, 107, 0.5))");

        // ===================== EJES =====================
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
            .attr("y", -60)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("HUMEDAD (%)");

        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(
                typeof TRANSLATIONS !== "undefined" && TRANSLATIONS.tiempo
                    ? TRANSLATIONS.tiempo
                    : "Tiempo"
            );

        // ===================== ZONAS DE HUMEDAD =====================
        const humZonesData = [
            {
                min: 0,
                max: 30,
                color: "rgba(255, 107, 107, 0.08)",
                label: "CRÍTICO",
                emoji: "⚠️"
            },
            {
                min: 30,
                max: 40,
                color: "rgba(255, 212, 59, 0.08)",
                label: "ADVERTENCIA",
                emoji: "⚠️"
            },
            {
                min: 40,
                max: 60,
                color: "rgba(105, 219, 124, 0.08)",
                label: "ÓPTIMO",
                emoji: "✅"
            },
            {
                min: 60,
                max: 70,
                color: "rgba(255, 212, 59, 0.08)",
                label: "ADVERTENCIA",
                emoji: "⚠️"
            },
            {
                min: 70,
                max: 100,
                color: "rgba(255, 107, 107, 0.08)",
                label: "CRÍTICO",
                emoji: "⚠️"
            }
        ];

        // ===================== TOOLTIP =====================
        d3.select("body").selectAll(".tooltip-humedad").remove();

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-humedad")
            .style("position", "absolute")
            .style("background", "rgba(15, 23, 42, 0.95)")
            .style("color", "#e2e8f0")
            .style("padding", "12px 16px")
            .style("border", "2px solid #ff6b6b")
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
            .attr("fill", "#00ffcc")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(0, 255, 204, 0.8))")
            .style("opacity", 0);

        const verticalLine = g.append("line")
            .attr("class", "vertical-line")
            .attr("stroke", "rgba(255, 255, 255, 0.3)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0);

        const referenceLine = g.append("line")
            .attr("class", "reference-line")
            .attr("stroke", "rgba(255, 255, 255, 0.5)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "8,4")
            .style("opacity", 0.6);

        // ===================== FUNCIONES AUXILIARES =====================
        function clamp(value, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, value));
        }

        function getHumValue(item) {
            const value =
                item.valor ??
                item.humedad ??
                item.nivel ??
                item.value;

            return parseFloat(value);
        }

        function getHumDate(item) {
            return item.fecha_hora || item.timestamp || item.created_at || item.time;
        }

        function getLatestTime() {
            if (data.length === 0) return new Date();
            return data[data.length - 1].time;
        }

        function getEarliestTime() {
            if (data.length === 0) return new Date();
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
            const tolerance = Math.max(LIVE_EDGE_TOLERANCE_MS, currentWindowMs * 0.01);

            if (
                Math.abs(currentViewEnd.getTime() - latest.getTime()) <= tolerance ||
                currentViewEnd.getTime() >= latest.getTime()
            ) {
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

        function getTickFormatter() {
            if (currentWindowMs <= 60 * 1000) {
                return d3.timeFormat("%H:%M:%S");
            }

            if (currentWindowMs <= 60 * 60 * 1000) {
                return d3.timeFormat("%H:%M:%S");
            }

            if (currentWindowMs <= 24 * 60 * 60 * 1000) {
                return d3.timeFormat("%d/%m %H:%M");
            }

            return d3.timeFormat("%d/%m/%Y %H:%M");
        }

        function getYDomain(visibleData) {
            const baseMin = 0;
            const baseMax = 100;

            if (!visibleData || visibleData.length === 0) {
                return [baseMin, baseMax];
            }

            const minVal = d3.min(visibleData, d => d.value);
            const maxVal = d3.max(visibleData, d => d.value);

            const padding = Math.max(5, (maxVal - minVal) * 0.15);

            let yMin = Math.max(baseMin, minVal - padding);
            let yMax = Math.min(baseMax, maxVal + padding);

            if (yMax - yMin < 10) {
                const mid = (yMin + yMax) / 2;
                yMin = Math.max(baseMin, mid - 5);
                yMax = Math.min(baseMax, mid + 5);
            }

            if (yMin === yMax) {
                yMin = Math.max(baseMin, yMin - 5);
                yMax = Math.min(baseMax, yMax + 5);
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

        function getHumLevel(v) {
            if (v < 30 || v > 70) {
                return {
                    level: "CRÍTICO",
                    color: humColors.critico,
                    emoji: "⚠️",
                    estado: "critico",
                    descripcion: v < 30
                        ? "Irritación respiratoria por sequedad extrema"
                        : "Riesgo de crecimiento de moho e irritación respiratoria"
                };
            }

            if ((v >= 30 && v < 40) || (v >= 60 && v <= 70)) {
                return {
                    level: "ADVERTENCIA",
                    color: humColors.advertencia,
                    emoji: "⚠️",
                    estado: "advertencia",
                    descripcion: v < 40
                        ? "Riesgo de sequedad respiratoria"
                        : "Riesgo de proliferación microbiana"
                };
            }

            return {
                level: "ÓPTIMO",
                color: humColors.optimo,
                emoji: "✅",
                estado: "optimo",
                descripcion: "Minimiza patógenos, maximiza confort respiratorio"
            };
        }

        // ===================== REDIBUJADO =====================
        function redraw() {
            updateViewForNewData();

            const visibleData = getVisibleData();

            if (!currentViewStart || !currentViewEnd) return;

            x.domain([currentViewStart, currentViewEnd]);

            const yDomain = getYDomain(visibleData);
            y.domain(yDomain);

            // Zonas de humedad
            const humZones = zonesGroup.selectAll(".hum-zone")
                .data(humZonesData);

            humZones.enter()
                .append("rect")
                .attr("class", "hum-zone")
                .merge(humZones)
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

            humZones.exit().remove();

            // Línea de referencia: centro óptimo 50 %
            const optimoCentro = 50;

            if (optimoCentro >= yDomain[0] && optimoCentro <= yDomain[1]) {
                referenceLine
                    .attr("x1", 0)
                    .attr("y1", y(optimoCentro))
                    .attr("x2", width)
                    .attr("y2", y(optimoCentro))
                    .style("opacity", 0.6);
            } else {
                referenceLine.style("opacity", 0);
            }

            // Grid
            grid.call(
                d3.axisLeft(y)
                    .ticks(6)
                    .tickSize(-width)
                    .tickFormat("")
            )
                .attr("opacity", 0.15)
                .selectAll("line")
                .attr("stroke", "#ff6b6b");

            grid.select(".domain").remove();

            // Eje X
            xAxisG.call(
                d3.axisBottom(x)
                    .ticks(6)
                    .tickFormat(getTickFormatter())
                    .tickSizeOuter(0)
            )
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500");

            xAxisG.selectAll("path, line")
                .attr("stroke", "#ff6b6b")
                .attr("opacity", 0.5);

            // Eje Y
            yAxisG.call(
                d3.axisLeft(y)
                    .ticks(6)
                    .tickFormat(d => `${d.toFixed(1)} %`)
                    .tickSizeOuter(0)
            )
                .selectAll("text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "11px")
                .attr("font-weight", "500")
                .attr("dx", "-5px");

            yAxisG.selectAll("path, line")
                .attr("stroke", "#ff6b6b")
                .attr("opacity", 0.5);

            yAxisG.select(".domain")
                .attr("stroke", "none");

            // Línea y área
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

            // Puntos
            const showPoints = visibleData.length <= 350;
            const pointData = showPoints ? visibleData : [];

            const points = g.selectAll(".data-point")
                .data(pointData, d => d.id);

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
                .attr("fill", d => getHumLevel(d.value).color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9);

            g.selectAll(".data-point")
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    const mouseX = x(d.time);
                    const mouseY = y(d.value);
                    const levelInfo = getHumLevel(d.value);

                    focus
                        .attr("cx", mouseX)
                        .attr("cy", mouseY)
                        .attr("fill", levelInfo.color)
                        .transition()
                        .duration(200)
                        .attr("r", 8)
                        .style("opacity", 1);

                    verticalLine
                        .attr("x1", mouseX)
                        .attr("y1", 0)
                        .attr("x2", mouseX)
                        .attr("y2", height)
                        .transition()
                        .duration(200)
                        .style("opacity", 1);

                    tooltip
                        .html(`
                            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                                <div style="width: 12px; height: 12px; background: ${levelInfo.color}; border-radius: 50%; margin-right: 8px;"></div>
                                <strong style="font-size: 16px; color: ${levelInfo.color};">${d.value.toFixed(1)} %</strong>
                            </div>
                            <div style="color: #94a3b8; margin-bottom: 4px;">
                                <span style="color: ${levelInfo.color}; font-weight: 600;">
                                    ${levelInfo.emoji} ${levelInfo.level}
                                </span>
                            </div>
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
                                ${levelInfo.descripcion}
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1; border-top: 1px solid #334155; padding-top: 6px;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("border-color", levelInfo.color)
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

            // Contador
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

            // Etiqueta de zoom
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

            // Solo cuando se arrastra hacia la derecha se desactiva el tiempo real.
            // Esto permite ir a datos históricos sin que el gráfico vuelva automáticamente al último dato.
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
                console.log("Dato de humedad inválido:", value, timestampStr);
                return;
            }

            data.push({
                id: `hum-${time.getTime()}-${Math.random()}`,
                time: time,
                value: parsedValue
            });

            data.sort((a, b) => a.time - b.time);

            redraw();
        }

        // ===================== CARGA DE HISTÓRICO COMPLETO =====================
        async function fetchAllHistoricalData(initialUrl = "/api/humedad/") {
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
                const apiData = await fetchAllHistoricalData("/api/humedad/");

                if (apiData && apiData.length > 0) {
                    data = apiData
                        .map(item => {
                            const value = getHumValue(item);
                            const time = new Date(getHumDate(item));

                            return {
                                id: `db-${item.id || getHumDate(item) || Math.random()}`,
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

                    if (data.length > 0 && window.gaugeHumInstance) {
                        const lastValue = data[data.length - 1].value;
                        window.gaugeHumInstance.update(lastValue);
                    }
                } else {
                    redraw();
                }
            } catch (error) {
                console.log("No se pudieron cargar datos históricos de humedad:", error);
            }
        }

        loadHistoricalData();

        // ===================== MÉTODOS PÚBLICOS =====================
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
                g.selectAll(".hum-zone").remove();
                g.selectAll(".data-counter").remove();
                g.selectAll(".zoom-label").remove();

                focus.attr("r", 0).style("opacity", 0);
                verticalLine.style("opacity", 0);
                tooltip.style("opacity", 0);
                referenceLine.style("opacity", 0.6);
            },

            setData(newData) {
                data = newData
                    .map((d, i) => ({
                        id: `data-${i}`,
                        time: new Date(d.t || d.time || d.fecha_hora || d.timestamp),
                        value: parseFloat(d.v || d.value || d.valor || d.humedad || d.nivel)
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

    // ============== INSTANCIAS ==============
    const gauge = gaugeHumedad("#gauge-humedad", 50.0);
    const series = lineChartHumedad("#serie-humedad");

    // Guardar instancias en ventana global
    window.gaugeHumInstance = gauge;
    window.seriesHumInstance = series;

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/humedad/");

    socket.onmessage = function(e) {
        const mensaje = JSON.parse(e.data);
        const valor = mensaje.valor;
        const fecha = mensaje.fecha_hora;

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

    socket.onopen = function() {
        console.log("WebSocket Humedad conectado");
    };

    socket.onerror = function() {
        console.error("Error en WebSocket Humedad");
    };

    socket.onclose = function() {
        console.warn("WebSocket Humedad desconectado");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});