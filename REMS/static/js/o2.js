document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== GAUGE VERTICAL (Oxígeno %) =====================
    function gaugeO2(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

        const width = 300;
        const height = 520;
        const min = 0.0;
        const max = 100.0;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Paleta de colores actualizada según los nuevos rangos
        const colorPalette = {
            // Para niveles óptimos (19.5 - 23.5%)
            green: "#10b981",     // Verde
            // Para advertencia (17.0 - 19.4% o 23.6 - 25.0%)
            yellow: "#fbbf24",    // Amarillo
            // Para crítico (< 17.0% o > 25.0%)
            red: "#ef4444",       // Rojo
            // Colores adicionales
            lightGreen: "#34d399",
            darkGreen: "#059669",
            lightRed: "#f87171",
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
            .attr("fill", "#0f172a")
            .attr("stroke", colorPalette.white)
            .attr("stroke-width", 3);

        // fill rect
        const scale = d3.scaleLinear().domain([min, max]).range([frameY + frameH, frameY]);
        
        // ===================== LÍNEAS DE NIVEL NUMÉRICAS =====================
        for (let i = 0; i <= 100; i += 25) {
            const y = scale(i);
            
            // Línea horizontal de nivel
            svg.append("line")
                .attr("x1", frameX - 10)
                .attr("y1", y)
                .attr("x2", frameX)
                .attr("y2", y)
                .attr("stroke", colorPalette.white)
                .attr("stroke-width", 1.5);
            
            // Texto de valor
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
            .attr("x", width/2)
            .attr("y", frameY + frameH + 50)
            .attr("fill", colorFor(initial))
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(2) + " %");

        // Indicador de calidad
        const qualityText = svg.append("text")
            .attr("x", width/2)
            .attr("y", frameY + frameH + 85)
            .attr("fill", colorFor(initial))
            .attr("font-size", "36px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getQualityText(initial));

        // color overlay depending on new ranges
        function colorFor(v) {
            if (v >= 19.5 && v <= 23.5) return colorPalette.green;    // Óptimo (verde)
            if ((v >= 17.0 && v <= 19.4) || (v >= 23.6 && v <= 25.0)) return colorPalette.yellow; // Advertencia (amarillo)
            return colorPalette.red;                                  // Crítico (rojo)
        }

        function getQualityText(v) {
            if (v >= 19.5 && v <= 23.5) return TRANSLATIONS.nivel_optimo || "NIVEL ÓPTIMO";
            if ((v >= 17.0 && v <= 19.4) || (v >= 23.6 && v <= 25.0)) return "ADVERTENCIA";
            return "¡CRÍTICO!";
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de oxígeno desde BD para obtener el último...');
                const response = await fetch('/api/o2/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de oxígeno de la BD');
                    return null;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de oxígeno
                    let ultimoValor;
                    ultimoValor = parseFloat(ultimoDato.nivel);
                    
                    console.log('Último dato de oxígeno encontrado:', ultimoValor.toFixed(2) + '%', 
                            'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de oxígeno en la BD');
                    return null;
                }
            } catch (error) {
                console.log('Error al cargar datos de oxígeno:', error);
                return null;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de oxígeno...`);
                const response = await fetch('/api/o2/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de oxígeno de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor;
                        
                        valor = parseFloat(dato.nivel);
                        
                        if (isNaN(valor)) return null;
                        
                        // Determinar calidad según nuevos rangos
                        let calidad;
                        if (valor >= 19.5 && valor <= 23.5) {
                            calidad = "ÓPTIMO";
                        } else if ((valor >= 17.0 && valor <= 19.4) || (valor >= 23.6 && valor <= 25.0)) {
                            calidad = "ADVERTENCIA";
                        } else {
                            calidad = "CRÍTICO";
                        }
                        
                        return {
                            id: dato.id,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            calidad: calidad
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de oxígeno`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de oxígeno:', error);
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
                .text(newVal.toFixed(2) + " %")
                .attr("fill", newColor);

            qualityText
                .transition().duration(300)
                .text(getQualityText(newVal))
                .attr("fill", newColor);

            if (window.o2AlertSystem) {
                o2AlertSystem.checkLevel(newVal);
            }
        }

        // =================== CARGAR ÚLTIMO DATO AL INICIAR ===================
        // Cargar el último dato al iniciar (con un pequeño retraso para asegurar que el DOM esté listo)
        setTimeout(() => {
            cargarUltimoDatoBD();
        }, 500);

        // =================== RETORNO DE FUNCIONES ===================
        // Crear objeto de retorno con todas las funciones
        const gaugeObject = {
            update: function(newVal) {
                actualizarGauge(newVal);
            },
            cargarUltimoDato: cargarUltimoDatoBD,
            cargarDatosRecientes: cargarDatosRecientesBD,
            actualizar: actualizarGauge,
            obtenerColorSegunValor: colorFor,
            obtenerTextoCalidad: getQualityText
        };

        // Guardar instancia globalmente
        window.o2GaugeInstance = gaugeObject;
        
        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE OXÍGENO =====================
    function lineChartO2(containerId) {
        const container = d3.select(containerId);
        container.html("");
        container.style("position", "relative");

        const outerW = 1200, outerH = 600;
        const margin = { top: 50, right: 40, bottom: 60, left: 70 };
        const width = outerW - margin.left - margin.right;
        const height = outerH - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("width", outerW)
            .attr("height", outerH)
            .style("background", "#0f172a")
            .style("border", "3px solid #ffffff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 4px 20px rgba(0, 255, 136, 0.15)");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ===================== CONFIGURACIÓN =====================
        const DEFAULT_WINDOW_MS = 60 * 1000;               // 1 minuto
        const MIN_WINDOW_MS = 5 * 1000;                   // 5 segundos
        const MAX_WINDOW_MS = 30 * 24 * 3600 * 1000;      // 30 días
        const ZOOM_FACTOR = 0.15;
        const LIVE_EDGE_TOLERANCE_MS = 1500;
        const DRAG_DIRECTION_THRESHOLD_PX = 5;

        let data = [];

        let currentWindowMs = DEFAULT_WINDOW_MS;
        let currentViewStart = null;
        let currentViewEnd = null;
        let autoFollowLatest = true;

        let isDragging = false;
        let dragStartX = 0;
        let dragStartViewStart = null;
        let dragStartViewEnd = null;

        const safeId = String(containerId).replace(/[^a-zA-Z0-9_-]/g, "_");
        const gradientId = `o2-gradient-${safeId}`;
        const lineGradientId = `o2-line-gradient-${safeId}`;
        const clipId = `o2-clip-${safeId}`;

        // ===================== TÍTULO =====================
        svg.append("text")
            .attr("x", outerW / 2)
            .attr("y", 28)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .style("letter-spacing", "0.5px")
            .text(TRANSLATIONS.hist_o2 || "HISTÓRICO DE OXÍGENO (%)");

        // ===================== BOTÓN HOME =====================
        container.append("button")
            .attr("class", "btn btn-sm")
            .style("position", "absolute")
            .style("top", "12px")
            .style("right", "12px")
            .style("background", "rgba(0, 255, 136, 0.2)")
            .style("color", "#00ff88")
            .style("border", "1px solid #00ff88")
            .style("border-radius", "6px")
            .style("padding", "8px 12px")
            .style("cursor", "pointer")
            .style("z-index", "10")
            .style("transition", "all 0.3s")
            .html('<i class="bi bi-house-door"></i>')
            .on("mouseover", function () {
                d3.select(this)
                    .style("background", "#00ff88")
                    .style("color", "#0f172a")
                    .style("transform", "scale(1.05)");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .style("background", "rgba(0, 255, 136, 0.2)")
                    .style("color", "#00ff88")
                    .style("transform", "scale(1)");
            })
            .on("click", function () {
                goToLatest(true);

                d3.select(this)
                    .style("background", "#00cc6a")
                    .style("color", "#0f172a");

                setTimeout(() => {
                    d3.select(this)
                        .style("background", "rgba(0, 255, 136, 0.2)")
                        .style("color", "#00ff88");
                }, 300);
            });

        // Hint
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

        // ===================== DEFS / GRADIENTES =====================
        const defs = svg.append("defs");

        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(0,255,136,0.4)")
            .attr("stop-opacity", 0.5);

        gradient.append("stop")
            .attr("offset", "80%")
            .attr("stop-color", "rgba(0,255,136,0.1)");

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(0,255,136,0.05)");

        const lineGradient = defs.append("linearGradient")
            .attr("id", lineGradientId)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        lineGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#00ff88");

        lineGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#00e5ff");

        defs.append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("width", width)
            .attr("height", height);

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

        // ===================== ELEMENTOS BASE =====================
        const grid = g.append("g")
            .attr("class", "grid");

        const areaPath = g.append("path")
            .attr("class", "area-o2")
            .attr("fill", `url(#${gradientId})`)
            .attr("stroke", "none")
            .attr("clip-path", `url(#${clipId})`);

        const path = g.append("path")
            .attr("class", "line-o2")
            .attr("fill", "none")
            .attr("stroke", `url(#${lineGradientId})`)
            .attr("stroke-width", 3.5)
            .attr("clip-path", `url(#${clipId})`)
            .style("filter", "drop-shadow(0 0 8px rgba(0,255,136,0.5))");

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
            .attr("y", -50)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text("O₂ (%)");

        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.tiempo || "Tiempo");

        // ===================== ZONAS DE OXÍGENO =====================
        const o2ZonesData = [
            { min: 0,    max: 17.0, color: "rgba(239,68,68,0.08)"  },
            { min: 17.0, max: 19.4, color: "rgba(251,191,36,0.08)" },
            { min: 19.5, max: 23.5, color: "rgba(16,185,129,0.08)" },
            { min: 23.6, max: 25.0, color: "rgba(251,191,36,0.08)" },
            { min: 25.0, max: 100,  color: "rgba(239,68,68,0.08)"  }
        ];

        // ===================== TOOLTIP =====================
        d3.select("body").selectAll(".tooltip-o2").remove();

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-o2")
            .style("position", "absolute")
            .style("background", "rgba(15,23,42,0.95)")
            .style("color", "#e2e8f0")
            .style("padding", "12px 16px")
            .style("border", "2px solid #00ff88")
            .style("border-radius", "10px")
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("box-shadow", "0 8px 24px rgba(0,0,0,0.3)")
            .style("backdrop-filter", "blur(4px)")
            .style("z-index", "9999");

        const focus = g.append("circle")
            .attr("r", 0)
            .attr("fill", "#00ffcc")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(0,255,204,0.8))")
            .style("opacity", 0);

        const verticalLine = g.append("line")
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0);

        // ===================== HELPERS =====================
        function getColorForValue(v) {
            if (v >= 19.5 && v <= 23.5) return "#10b981";
            if ((v >= 17.0 && v <= 19.4) || (v >= 23.6 && v <= 25.0)) return "#fbbf24";
            return "#ef4444";
        }

        function getLabelForValue(v) {
            if (v >= 19.5 && v <= 23.5) return "ÓPTIMO";
            if ((v >= 17.0 && v <= 19.4) || (v >= 23.6 && v <= 25.0)) return "ADVERTENCIA";
            return "CRÍTICO";
        }

        function getLatestTime() {
            return data.length ? data[data.length - 1].time : new Date();
        }

        function getEarliestTime() {
            return data.length ? data[0].time : new Date();
        }

        function ensureViewInitialized() {
            if (!currentViewStart || !currentViewEnd) {
                const latest = getLatestTime();
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - currentWindowMs);
            }
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function clampViewToDataRange() {
            if (data.length === 0) return;

            let minData = getEarliestTime().getTime();
            let maxData = getLatestTime().getTime();
            let winSize = currentViewEnd.getTime() - currentViewStart.getTime();

            if (winSize <= 0) {
                winSize = currentWindowMs;
                currentViewEnd = new Date(currentViewStart.getTime() + winSize);
            }

            if ((maxData - minData) <= winSize) {
                currentViewStart = new Date(minData);
                currentViewEnd = new Date(minData + winSize);
                return;
            }

            if (currentViewStart.getTime() < minData) {
                currentViewStart = new Date(minData);
                currentViewEnd = new Date(minData + winSize);
            }

            if (currentViewEnd.getTime() > maxData) {
                currentViewEnd = new Date(maxData);
                currentViewStart = new Date(maxData - winSize);
            }
        }

        function getVisibleData() {
            ensureViewInitialized();
            return data.filter(d => d.time >= currentViewStart && d.time <= currentViewEnd);
        }

        function getTickFormatter() {
            if (currentWindowMs <= 60 * 1000) return d3.timeFormat("%H:%M:%S");
            if (currentWindowMs <= 3600 * 1000) return d3.timeFormat("%H:%M:%S");
            if (currentWindowMs <= 24 * 3600 * 1000) return d3.timeFormat("%d/%m %H:%M");
            return d3.timeFormat("%d/%m/%Y %H:%M");
        }

        function setHistoricalMode() {
            autoFollowLatest = false;
        }

        function goToLatest(resetToDefaultWindow = false) {
            if (resetToDefaultWindow) {
                currentWindowMs = DEFAULT_WINDOW_MS;
            }

            autoFollowLatest = true;

            const latest = getLatestTime();
            currentViewEnd = new Date(latest);
            currentViewStart = new Date(latest.getTime() - currentWindowMs);

            redraw();
        }

        function maybeReactivateLiveFromPan() {
            if (!data.length || !currentViewEnd) return false;

            const latestMs = getLatestTime().getTime();
            const viewEndMs = currentViewEnd.getTime();
            const tolerance = Math.max(LIVE_EDGE_TOLERANCE_MS, currentWindowMs * 0.01);

            const reachedLiveEdge =
                Math.abs(latestMs - viewEndMs) <= tolerance || viewEndMs >= latestMs;

            if (reachedLiveEdge) {
                autoFollowLatest = true;
                currentViewEnd = new Date(latestMs);
                currentViewStart = new Date(latestMs - currentWindowMs);
                return true;
            }

            return false;
        }

        function renderPoints(visibleData) {
            const showPoints = visibleData.length <= 350;
            const pointData = showPoints ? visibleData : [];

            const points = g.selectAll(".data-point").data(pointData, d => d.id);

            points.enter()
                .append("circle")
                .attr("class", "data-point")
                .merge(points)
                .attr("cx", d => x(d.time))
                .attr("cy", d => y(d.value))
                .attr("r", 4)
                .attr("fill", d => getColorForValue(d.value))
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    focus
                        .attr("cx", x(d.time))
                        .attr("cy", y(d.value))
                        .transition().duration(120)
                        .attr("r", 8)
                        .style("opacity", 1);

                    verticalLine
                        .attr("x1", x(d.time))
                        .attr("y1", 0)
                        .attr("x2", x(d.time))
                        .attr("y2", height)
                        .transition().duration(120)
                        .style("opacity", 1);

                    const nt = getLabelForValue(d.value);
                    const nc = getColorForValue(d.value);

                    tooltip
                        .html(`
                            <div style="display:flex;align-items:center;margin-bottom:6px;">
                                <div style="width:12px;height:12px;background:${nc};border-radius:50%;margin-right:8px;"></div>
                                <strong style="font-size:16px;color:#00ff88;">${d.value.toFixed(1)}%</strong>
                            </div>
                            <div style="color:#94a3b8;margin-bottom:4px;">
                                <span style="color:${nc};font-weight:600;">${nt}</span>
                                <span style="margin-left:8px;font-size:11px;">${nt==="ÓPTIMO"?"⭐":nt==="ADVERTENCIA"?"⚠️":"🚨"}</span>
                            </div>
                            <div style="font-size:11px;color:#cbd5e1;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 80) + "px")
                        .transition().duration(120)
                        .style("opacity", 1);
                })
                .on("mouseout", function () {
                    focus.transition().duration(120).attr("r", 0).style("opacity", 0);
                    verticalLine.transition().duration(120).style("opacity", 0);
                    tooltip.transition().duration(120).style("opacity", 0);
                });

            points.exit()
                .transition()
                .duration(120)
                .attr("r", 0)
                .remove();
        }

        // ===================== REDRAW =====================
        function redraw() {
            ensureViewInitialized();

            if (autoFollowLatest && data.length > 0) {
                const latest = getLatestTime();
                currentViewEnd = new Date(latest);
                currentViewStart = new Date(latest.getTime() - currentWindowMs);
            } else {
                clampViewToDataRange();
            }

            x.domain([currentViewStart, currentViewEnd]);

            const visibleData = getVisibleData();
            const ySource = visibleData.length ? visibleData : data;

            if (!ySource.length) {
                y.domain([15, 26]);
            } else {
                y.domain([
                    Math.min(15.0, d3.min(ySource, d => d.value) - 1.0),
                    Math.max(26.0, d3.max(ySource, d => d.value) + 1.0)
                ]);
            }

            const zones = g.selectAll(".o2-zone").data(o2ZonesData);

            zones.enter()
                .append("rect")
                .attr("class", "o2-zone")
                .merge(zones)
                .attr("x", 0)
                .attr("width", width)
                .attr("y", d => y(d.max))
                .attr("height", d => Math.max(0, y(d.min) - y(d.max)))
                .attr("fill", d => d.color)
                .attr("rx", 2);

            zones.exit().remove();

            grid.call(
                d3.axisLeft(y)
                    .ticks(8)
                    .tickSize(-width)
                    .tickFormat("")
            )
            .attr("opacity", 0.15)
            .selectAll("line")
            .attr("stroke", "#00ff88");

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
                .attr("stroke", "#00ff88")
                .attr("opacity", 0.5);

            yAxisG.call(
                d3.axisLeft(y)
                    .ticks(8)
                    .tickFormat(d => d.toFixed(1) + "%")
                    .tickSizeOuter(0)
            )
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("dx", "-5px");

            yAxisG.selectAll("path, line")
                .attr("stroke", "#00ff88")
                .attr("opacity", 0.5);

            yAxisG.select(".domain").attr("stroke", "none");

            if (isDragging) {
                path.datum(visibleData).attr("d", line);
                areaPath.datum(visibleData).attr("d", area);
            } else {
                path.datum(visibleData)
                    .transition()
                    .duration(180)
                    .ease(d3.easeLinear)
                    .attr("d", line);

                areaPath.datum(visibleData)
                    .transition()
                    .duration(180)
                    .ease(d3.easeLinear)
                    .attr("d", area);
            }

            renderPoints(visibleData);

            g.selectAll(".data-counter").remove();
            g.append("text")
                .attr("class", "data-counter")
                .attr("x", width - 10)
                .attr("y", 20)
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .attr("text-anchor", "end")
                .text(`${visibleData.length} visibles / ${data.length} totales`);

            g.selectAll(".zoom-label").remove();
            const wl = currentWindowMs < 60000
                ? `${Math.round(currentWindowMs / 1000)}s`
                : currentWindowMs < 3600000
                    ? `${(currentWindowMs / 60000).toFixed(1)}min`
                    : currentWindowMs < 24 * 3600000
                        ? `${(currentWindowMs / 3600000).toFixed(1)}h`
                        : `${(currentWindowMs / (24 * 3600000)).toFixed(1)}d`;

            g.append("text")
                .attr("class", "zoom-label")
                .attr("x", 10)
                .attr("y", 20)
                .attr("fill", "#475569")
                .attr("font-size", "10px")
                .text(`Ventana: ${wl}`);
        }

        // ===================== DRAG =====================
        svg.on("mousedown", function (event) {
            if (!currentViewStart || !currentViewEnd) return;

            isDragging = true;
            dragStartX = event.clientX;
            dragStartViewStart = new Date(currentViewStart);
            dragStartViewEnd = new Date(currentViewEnd);

            // NO desactivar aquí tiempo real.
            // Solo se desactiva si realmente se arrastra hacia la derecha.
            svg.style("cursor", "grabbing");
        });

        svg.on("mousemove", function (event) {
            if (!isDragging || !dragStartViewStart || !dragStartViewEnd) return;

            const dx = event.clientX - dragStartX;

            // Solo si se arrastra hacia la derecha entra a histórico
            // equivale a ir hacia datos más antiguos.
            if (dx > DRAG_DIRECTION_THRESHOLD_PX) {
                setHistoricalMode();
            }

            const msPerPixel = (dragStartViewEnd.getTime() - dragStartViewStart.getTime()) / width;
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

        svg.on("dblclick", function () {
            goToLatest(false);
        });

        svg.style("cursor", "grab");

        // ===================== ZOOM CON RUEDA =====================
        svg.node().addEventListener("wheel", function (event) {
            event.preventDefault();
            ensureViewInitialized();

            const rect = svg.node().getBoundingClientRect();
            const rawX = event.clientX - rect.left - margin.left;
            const mouseX = clamp(rawX, 0, width);
            const mouseXRel = mouseX / width;

            const oldMs = currentViewEnd.getTime() - currentViewStart.getTime();
            const dir = event.deltaY > 0 ? 1 : -1;
            let newMs = Math.round(oldMs * (1 + dir * ZOOM_FACTOR));
            newMs = clamp(newMs, MIN_WINDOW_MS, MAX_WINDOW_MS);

            if (newMs === oldMs) return;

            currentWindowMs = newMs;

            const anchorMs = currentViewStart.getTime() + mouseXRel * oldMs;
            currentViewStart = new Date(anchorMs - mouseXRel * newMs);
            currentViewEnd = new Date(currentViewStart.getTime() + newMs);

            setHistoricalMode();
            clampViewToDataRange();
            redraw();
        }, { passive: false });

        // ===================== AGREGAR DATO =====================
        function addData(value, timestampStr) {
            const time = timestampStr ? new Date(timestampStr) : new Date();
            const parsedValue = parseFloat(value);

            if (isNaN(time.getTime()) || isNaN(parsedValue)) return;

            data.push({
                id: `data-${time.getTime()}-${Math.random()}`,
                time,
                value: parsedValue
            });

            data.sort((a, b) => a.time - b.time);

            redraw();
        }

        // ===================== HISTÓRICO COMPLETO =====================
        async function fetchAllHistoricalData(initialUrl = "/api/o2/") {
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
                const apiData = await fetchAllHistoricalData("/api/o2/");

                if (apiData && apiData.length > 0) {
                    data = apiData
                        .map(item => ({
                            id: `db-${item.id || item.fecha_hora || item.timestamp || Math.random()}`,
                            time: new Date(item.fecha_hora || item.timestamp),
                            value: parseFloat(item.nivel)
                        }))
                        .filter(d => !isNaN(d.time.getTime()) && !isNaN(d.value))
                        .sort((a, b) => a.time - b.time);

                    autoFollowLatest = true;

                    const latest = getLatestTime();
                    currentViewEnd = new Date(latest);
                    currentViewStart = new Date(latest.getTime() - currentWindowMs);

                    redraw();

                    if (window.o2GaugeInstance && data.length > 0) {
                        window.o2GaugeInstance.update(data[data.length - 1].value);
                    }
                } else {
                    redraw();
                }
            } catch (error) {
                console.log("No se pudieron cargar datos históricos de oxígeno:", error);
            }
        }

        // ===================== INICIO =====================
        loadHistoricalData();

        return {
            push(value, timestampStr) {
                addData(value, timestampStr);
            },
            reset() {
                data = [];
                currentViewStart = null;
                currentViewEnd = null;
                autoFollowLatest = true;

                path.datum([]).attr("d", line);
                areaPath.datum([]).attr("d", area);

                g.selectAll(".data-point").remove();
                g.selectAll(".o2-zone").remove();
                g.selectAll(".data-counter").remove();
                g.selectAll(".zoom-label").remove();

                focus.attr("r", 0).style("opacity", 0);
                verticalLine.style("opacity", 0);
                tooltip.style("opacity", 0);
            },
            setData(newData) {
                data = newData
                    .map((d, i) => ({
                        id: `data-${i}`,
                        time: new Date(d.t),
                        value: d.v
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
                currentWindowMs = clamp(minutes * 60000, MIN_WINDOW_MS, MAX_WINDOW_MS);
                goToLatest(false);
            }
        };
    }
    // ============== INSTANCIAS ==============
    const gauge = gaugeO2("#gauge-o2", 20.5);
    const series = lineChartO2("#serie-o2");

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/oxigeno/");

    socket.onmessage = function(e) {
        const mensaje = JSON.parse(e.data);
        const valor = mensaje.nivel;
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
    
    socket.onopen = function(e) {
        console.log("WebSocket O₂ conectado");
    };

    socket.onerror = function(e) {
        console.error("Error en WebSocket O₂");
    };

    socket.onclose = function(e) {
        console.warn("WebSocket O₂ desconectado");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});