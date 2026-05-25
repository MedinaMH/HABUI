document.addEventListener("DOMContentLoaded", function () {
    d3.select("body").style("background-color", "#0b0f19");

    // ===================== GAUGE TERMÓMETRO =====================
    function gaugeTemperatura(containerId, initial) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

        const width = 300;
        const height = 520;
        const min = 0;      // °C mínimo visual
        const max = 45;     // °C máximo visual

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Paleta de colores según el semáforo de 3 estados
        const tempPalette = {
            critico: "#ff6b6b",      // Rojo para CRÍTICO (<18°C o >26°C)
            advertencia: "#ffd43b",  // Amarillo para ADVERTENCIA (18-20°C o 24-26°C)
            optimo: "#69db7c",        // Verde para ÓPTIMO (20-24°C)
            white: "#ffffff"
        };

        // Diseño tipo termómetro
        const termometroX = width/2 - 15;
        const termometroY = 15;
        const termometroH = 360;
        const bulboRadio = 35;

        // Bulbo inferior
        svg.append("circle")
            .attr("cx", width/2 + 15)
            .attr("cy", termometroY + termometroH + bulboRadio)
            .attr("r", bulboRadio)
            .attr("fill", "#0f1724")
            .attr("stroke", tempPalette.white)
            .attr("stroke-width", 4);

        // Tubo del termómetro
        svg.append("rect")
            .attr("x", termometroX)
            .attr("y", termometroY)
            .attr("width", 60)
            .attr("height", termometroH)
            .attr("rx", 15)
            .attr("fill", "#0f1724")
            .attr("stroke", tempPalette.white)
            .attr("stroke-width", 3);

        // Escala para el mercurio
        const scale = d3.scaleLinear()
            .domain([min, max])
            .range([termometroY + termometroH, termometroY]);

        // Mercurio (líquido del termómetro)
        const mercurio = svg.append("rect")
            .attr("x", termometroX + 4)
            .attr("width", 52)
            .attr("y", scale(initial))
            .attr("height", Math.max(2, (termometroY + termometroH) - scale(initial)))
            .attr("fill", tempPalette.critico)
            .attr("rx", 11);

        // Mercurio en el bulbo
        const mercurioBulbo = svg.append("circle")
            .attr("cx", width/2 + 15)
            .attr("cy", termometroY + termometroH + bulboRadio)
            .attr("r", bulboRadio - 5)
            .attr("fill", tempPalette.critico);

        // Valor numérico (justo arriba del texto del nivel)
        const valueText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 70)
            .attr("fill", tempPalette.critico)
            .attr("font-size", "40px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text(initial.toFixed(1) + " °C");

        // FUNCIÓN para determinar nivel de temperatura según el semáforo
        function getTempLevel(v) {
            if (v < 18 || v > 26) return {
                nivel: "CRÍTICO", 
                emoji: "⚠️",
                color: tempPalette.critico,
                estado: "critico"
            };
            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return {
                nivel: TRANSLATIONS.advertencia || "ADVERTENCIA", 
                emoji: "⚠️",
                color: tempPalette.advertencia,
                estado: "advertencia"
            };
            return {
                nivel: "ÓPTIMO", 
                emoji: "✅",
                color: tempPalette.optimo,
                estado: "optimo"
            };
        }

        // Función para determinar color según temperatura
        function colorFor(v) {
            const level = getTempLevel(v);
            return level.color;
        }

        // TEXTO DE NIVEL
        const levelText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 110) 
            .attr("fill", tempPalette.critico)
            .attr("font-size", "36px")  
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(getTempLevel(initial).nivel);

        // TEXTO DESCRIPTIVO 
        const descText = svg.append("text")
            .attr("x", width/2 + 15)
            .attr("y", termometroY + termometroH + bulboRadio + 125)
            .attr("fill", "#94a3b8")  // Color gris para contraste
            .attr("font-size", "14px")
            .attr("font-weight", "500")
            .attr("text-anchor", "middle")
            .text(getTempDescription(initial));

        // Función para obtener descripción según el nivel
        function getTempDescription(v) {
            if (v < 18 || v > 26) return "Riesgo fisiológico, estrés térmico";
            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) return "Leve incomodidad térmica";
            return "Zona de confort térmico humano óptimo";
        }

        // Marcas de escala
        for (let temp = min; temp <= max; temp += 5) {
            const y = scale(temp);
            svg.append("line")
                .attr("x1", termometroX - 20)
                .attr("x2", termometroX)
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", tempPalette.white)
                .attr("stroke-width", 2);
            
            svg.append("text")
                .attr("x", termometroX - 18)
                .attr("y", y + 4)
                .attr("fill", tempPalette.white)
                .attr("font-size", "28px")
                .attr("text-anchor", "end")
                .text(temp + "°");
        }

        // =================== FUNCIÓN PARA CARGAR ÚLTIMO DATO DE LA BD ===================
        async function cargarUltimoDatoBD() {
            try {
                console.log('Cargando datos de Temperatura desde BD para obtener el último...');
                const response = await fetch('/api/temperatura/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Temperatura de la BD');
                    // Si no hay datos se agrega 22°C como valor por defecto (dentro del rango óptimo)
                    actualizarGauge(22.0);
                    return 22.0;
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos) && datos.length > 0) {
                    // Tomar el primer elemento (el más reciente)
                    const ultimoDato = datos[0];
                    
                    // Extraer el valor de Temperatura
                    let ultimoValor;
                    if (ultimoDato.temperatura !== undefined) {
                        ultimoValor = parseFloat(ultimoDato.temperatura);
                    } else if (ultimoDato.valor !== undefined) {
                        ultimoValor = parseFloat(ultimoDato.valor);
                    } else {
                        // Si no encuentra temperatura ni valor, usar 22°C (óptimo)
                        console.log('Campo no encontrado, usando valor por defecto 22°C');
                        ultimoValor = 22.0;
                    }
                    
                    console.log('Último dato de Temperatura encontrado:', ultimoValor.toFixed(1) + ' °C', 
                            'Estado:', getTempLevel(ultimoValor).nivel,
                            'Fecha:', ultimoDato.fecha_hora || ultimoDato.timestamp);
                    
                    // Actualizar el gauge con el último valor de la BD
                    actualizarGauge(ultimoValor);
                    
                    return ultimoValor;
                } else {
                    console.log('No hay datos de Temperatura en la BD, usando valor por defecto 22°C');
                    // Si no hay datos, usar 22°C como valor por defecto (dentro del rango óptimo)
                    actualizarGauge(22.0);
                    return 22.0;
                }
            } catch (error) {
                console.log('Error al cargar datos de Temperatura:', error);
                // En caso de error, usar 22°C como valor por defecto (dentro del rango óptimo)
                actualizarGauge(22.0);
                return 22.0;
            }
        }

        // =================== FUNCIÓN PARA CARGAR MÚLTIPLES DATOS ===================
        async function cargarDatosRecientesBD(limite = 10) {
            try {
                console.log(`Cargando últimos ${limite} datos de Temperatura...`);
                const response = await fetch('/api/temperatura/');
                
                if (!response.ok) {
                    console.log('No se pudieron obtener datos de Temperatura de la BD');
                    return [];
                }
                
                const datos = await response.json();
                
                if (datos && Array.isArray(datos)) {
                    // Tomar los primeros 'limite' elementos (los más recientes)
                    const datosRecientes = datos.slice(0, limite);
                    
                    // Procesar y formatear datos
                    const datosFormateados = datosRecientes.map(dato => {
                        let valor;
                        // Buscar el campo de temperatura
                        if (dato.temperatura !== undefined) {
                            valor = parseFloat(dato.temperatura);
                        } else if (dato.valor !== undefined) {
                            valor = parseFloat(dato.valor);
                        } else {
                            return null;
                        }
                        
                        if (isNaN(valor)) return null;
                        
                        const nivelInfo = getTempLevel(valor);
                        
                        return {
                            id: dato.id || `temp-${Date.now()}-${Math.random()}`,
                            valor: valor,
                            fecha: dato.fecha_hora || dato.timestamp,
                            nivel: nivelInfo.nivel,
                            estado: nivelInfo.estado,
                            color: nivelInfo.color
                        };
                    }).filter(dato => dato !== null);
                    
                    console.log(`Cargados ${datosFormateados.length} datos recientes de Temperatura`);
                    return datosFormateados;
                }
                
                return [];
            } catch (error) {
                console.log('Error al cargar datos recientes de Temperatura:', error);
                return [];
            }
        }

        // =================== FUNCIÓN DE ACTUALIZACIÓN INTERNA ===================
        function actualizarGauge(newVal) {
            const y = scale(newVal);
            const h = Math.max(2, (termometroY + termometroH) - y);
            const newLevel = getTempLevel(newVal);
            const newColor = newLevel.color;

            mercurio
                .transition().duration(300)
                .attr("y", y)
                .attr("height", h)
                .attr("fill", newColor);

            mercurioBulbo
                .transition().duration(300)
                .attr("fill", newColor);

            valueText
                .transition().duration(300)
                .text(newVal.toFixed(1) + " °C")
                .attr("fill", newColor);

            // Actualizar texto del nivel
            levelText
                .transition().duration(300)
                .text(newLevel.nivel)
                .attr("fill", newColor);

            // Actualizar texto descriptivo
            descText
                .transition().duration(300)
                .text(getTempDescription(newVal))
                .attr("fill", "#94a3b8");
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
            obtenerNivelTemperatura: getTempLevel,
            // Función para obtener el nivel actual
            getNivelActual: function() {
                return getTempLevel(parseFloat(valueText.text().replace(' °C', '')));
            }
        };

        return gaugeObject;
    }

    // ===================== SERIE TEMPORAL DE TEMPERATURA =====================
    function lineChartTemperatura(containerId) {
        const container = d3.select(containerId);
        container.html(""); // Limpiar contenedor

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
            .style("box-shadow", "0 4px 20px rgba(0, 0, 0, 0.15)");

        // Título
        svg.append("text")
            .attr("x", outerW / 2)
            .attr("y", 28)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .style("letter-spacing", "0.5px")
            .text(TRANSLATIONS.history_temperatura || "HISTÓRICO DE TEMPERATURA");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

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

        // Paleta de colores para temperatura según semáforo
        const tempColors = {
            critico: "#ff6b6b",
            advertencia: "#ffd43b",
            optimo: "#69db7c"
        };

        const safeId = String(containerId).replace(/[^a-zA-Z0-9_-]/g, "_");
        const gradientId = `temp-gradient-${safeId}`;
        const lineGradientId = `temp-line-gradient-${safeId}`;

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
            .attr("class", "area-temp")
            .attr("fill", `url(#${gradientId})`)
            .attr("stroke", "none");

        const path = g.append("path")
            .attr("class", "line-temp")
            .attr("fill", "none")
            .attr("stroke", `url(#${lineGradientId})`)
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 107, 107, 0.3))");

        // Ejes
        const xAxisG = g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .style("font-size", "12px");

        const yAxisG = g.append("g")
            .attr("class", "y-axis")
            .style("font-size", "12px");

        // Etiqueta eje Y
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -60)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.temperatura || "Temperatura (°C)");

        // Etiqueta eje X
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("fill", "#ffffff")
            .attr("font-size", "22px")
            .attr("font-weight", "600")
            .attr("text-anchor", "middle")
            .text(TRANSLATIONS.tiempo || "Tiempo");

        // Zonas de temperatura en el fondo según semáforo
        const tempZonesData = [
            {
                min: 0,
                max: 18,
                color: "rgba(255, 107, 107, 0.08)",
                label: "CRÍTICO",
                emoji: "⚠️"
            },
            {
                min: 18,
                max: 20,
                color: "rgba(255, 212, 59, 0.08)",
                label: "ADVERTENCIA",
                emoji: "⚠️"
            },
            {
                min: 20,
                max: 24,
                color: "rgba(105, 219, 124, 0.08)",
                label: "ÓPTIMO",
                emoji: "✅"
            },
            {
                min: 24,
                max: 26,
                color: "rgba(255, 212, 59, 0.08)",
                label: "ADVERTENCIA",
                emoji: "⚠️"
            },
            {
                min: 26,
                max: 45,
                color: "rgba(255, 107, 107, 0.08)",
                label: "CRÍTICO",
                emoji: "⚠️"
            }
        ];

        // Tooltip
        d3.select("body").selectAll(".tooltip-temperatura").remove();

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-temperatura")
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

        // Punto focal interactivo
        const focus = g.append("circle")
            .attr("class", "focus-point")
            .attr("r", 0)
            .attr("fill", "#ffd700")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))")
            .style("opacity", 0);

        // Línea vertical guía
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

        function getTempValue(item) {
            const value =
                item.valor ??
                item.temperatura ??
                item.nivel ??
                item.value;

            return parseFloat(value);
        }

        function getTempDate(item) {
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
            const baseMax = 45;

            if (!visibleData || visibleData.length === 0) {
                return [baseMin, baseMax];
            }

            const minVal = d3.min(visibleData, d => d.value);
            const maxVal = d3.max(visibleData, d => d.value);

            const padding = Math.max(1.5, (maxVal - minVal) * 0.15);

            let yMin = Math.max(baseMin, minVal - padding);
            let yMax = Math.min(baseMax, maxVal + padding);

            if (yMax - yMin < 4) {
                const mid = (yMin + yMax) / 2;
                yMin = Math.max(baseMin, mid - 2);
                yMax = Math.min(baseMax, mid + 2);
            }

            if (yMin === yMax) {
                yMin = Math.max(baseMin, yMin - 1);
                yMax = Math.min(baseMax, yMax + 1);
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

        // Función para determinar nivel de temperatura según semáforo
        function getTempLevel(v) {
            if (v < 18 || v > 26) {
                return {
                    level: "CRÍTICO",
                    color: tempColors.critico,
                    emoji: "⚠️",
                    estado: "critico"
                };
            }

            if ((v >= 18 && v < 20) || (v >= 24 && v <= 26)) {
                return {
                    level: TRANSLATIONS.advertencia || "ADVERTENCIA",
                    color: tempColors.advertencia,
                    emoji: "⚠️",
                    estado: "advertencia"
                };
            }

            return {
                level: "ÓPTIMO",
                color: tempColors.optimo,
                emoji: "✅",
                estado: "optimo"
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

            // Zonas de temperatura
            const tempZones = zonesGroup.selectAll(".temp-zone")
                .data(tempZonesData);

            tempZones.enter()
                .append("rect")
                .attr("class", "temp-zone")
                .merge(tempZones)
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

            tempZones.exit().remove();

            // Grid horizontal
            grid.call(
                d3.axisLeft(y)
                    .ticks(6)
                    .tickSize(-width)
                    .tickFormat("")
            )
                .attr("opacity", 0.1)
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
                    .tickFormat(d => `${d.toFixed(1)}°C`)
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
                .attr("fill", d => getTempLevel(d.value).color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .style("opacity", 0.9);

            g.selectAll(".data-point")
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    const mouseX = x(d.time);
                    const mouseY = y(d.value);
                    const levelInfo = getTempLevel(d.value);

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
                                <strong style="font-size: 16px; color: ${levelInfo.color};">${d.value.toFixed(1)}°C</strong>
                            </div>
                            <div style="color: #94a3b8; margin-bottom: 4px;">
                                <span style="color: ${levelInfo.color}; font-weight: 600;">
                                    ${levelInfo.emoji} ${levelInfo.level}
                                </span>
                            </div>
                            <div style="font-size: 11px; color: #cbd5e1; border-top: 1px solid #334155; padding-top: 6px;">
                                ${d3.timeFormat("%H:%M:%S")(d.time)}<br>
                                ${d3.timeFormat("%d/%m/%Y")(d.time)}
                            </div>
                        `)
                        .style("border-color", levelInfo.color)
                        .style("left", event.pageX + 15 + "px")
                        .style("top", event.pageY - 80 + "px")
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
                console.log("Dato de temperatura inválido:", value, timestampStr);
                return;
            }

            data.push({
                id: `temp-${time.getTime()}-${Math.random()}`,
                time: time,
                value: parsedValue
            });

            data.sort((a, b) => a.time - b.time);

            redraw();
        }

        // ===================== CARGA DE HISTÓRICO COMPLETO =====================
        async function fetchAllHistoricalData(initialUrl = "/api/temperatura/") {
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
                const apiData = await fetchAllHistoricalData("/api/temperatura/");

                if (apiData && apiData.length > 0) {
                    data = apiData
                        .map(item => {
                            const value = getTempValue(item);
                            const time = new Date(getTempDate(item));

                            return {
                                id: `db-${item.id || getTempDate(item) || Math.random()}`,
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

                    if (data.length > 0 && window.gaugeTempInstance) {
                        const lastValue = data[data.length - 1].value;
                        window.gaugeTempInstance.update(lastValue);
                    }
                } else {
                    redraw();
                }
            } catch (error) {
                console.log("No se pudieron cargar datos históricos de temperatura:", error);
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
                g.selectAll(".temp-zone").remove();
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
                        time: new Date(d.t || d.time || d.fecha_hora || d.timestamp),
                        value: parseFloat(d.v || d.value || d.valor || d.temperatura || d.nivel)
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
    const gauge = gaugeTemperatura("#gauge-temperatura", 22.0);
    const series = lineChartTemperatura("#serie-temperatura");

    // Guardar instancias en ventana global si es necesario
    window.gaugeTempInstance = gauge;
    window.seriesTempInstance = series;

    // ================= WEBSOCKET =================
    const socket = new WebSocket("ws://" + window.location.host + "/ws/temperatura/");

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
        console.log("WebSocket Temperatura conectado");
    };

    socket.onerror = function() {
        console.error("Error en WebSocket Temperatura");
    };

    socket.onclose = function() {
        console.warn("WebSocket Temperatura desconectado");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };
});