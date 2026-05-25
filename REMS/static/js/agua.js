document.addEventListener("DOMContentLoaded", function () {
d3.select("body").style("background-color", "#0b0f19");

// ============================================================
// ============ TANQUE DE AGUA ====================
// ============================================================
function crearTanqueAgua(containerId, valorInicial) {
    const container = d3.select(containerId);
    container.html(""); // Limpiar contenedor

    const width = 380;
    const height = 520;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Título
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 35)
        .attr("fill", "#ffffffff")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("");

    // Dimensiones del tanque
    const tanqueWidth = 220;
    const tanqueHeight = 340;
    const tanqueX = (width - tanqueWidth) / 2;
    const tanqueY = 80;
    const tanqueCurvatura = 15;

    // --- Efectos 3D y sombras ---
    const defs = svg.append("defs");

    // Gradiente para efecto metálico del tanque
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

    // Sombra del tanque
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

    // Gradiente para el agua (realista con ondulaciones)
    const gradienteAgua = defs.append("linearGradient")
        .attr("id", "gradAgua")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

    gradienteAgua.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#1e90ff")  // Azul profundo
        .attr("stop-opacity", 0.9);

    gradienteAgua.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#00bfff")  // Azul medio
        .attr("stop-opacity", 0.8);

    gradienteAgua.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#87ceeb")  // Azul claro
        .attr("stop-opacity", 0.7);

    // --- ESTRUCTURA DEL TANQUE ---

    // Base del tanque (sombra)
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

    // Cuerpo principal del tanque
    const cuerpoTanque = svg.append("rect")
        .attr("x", tanqueX)
        .attr("y", tanqueY)
        .attr("width", tanqueWidth)
        .attr("height", tanqueHeight)
        .attr("rx", tanqueCurvatura)
        .attr("ry", tanqueCurvatura)
        .attr("fill", "url(#gradTanque)")
        .attr("stroke", "#4a6572")
        .attr("stroke-width", 3);

    // Reflejo metálico (efecto 3D)
    const reflejo = svg.append("rect")
        .attr("x", tanqueX + 5)
        .attr("y", tanqueY + 5)
        .attr("width", 40)
        .attr("height", tanqueHeight - 10)
        .attr("rx", 8)
        .attr("fill", "rgba(255, 255, 255, 0.15)")
        .attr("opacity", 0.6);

    // Tapa superior del tanque
    const tapa = svg.append("rect")
        .attr("x", tanqueX - 10)
        .attr("y", tanqueY - 15)
        .attr("width", tanqueWidth + 20)
        .attr("height", 20)
        .attr("rx", 10)
        .attr("fill", "#2c3e50")
        .attr("stroke", "#4a6572")
        .attr("stroke-width", 2);

    // Indicador de llenado (barra lateral)
    const indicadorBarra = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth + 20)
        .attr("y", tanqueY)
        .attr("width", 12)
        .attr("height", tanqueHeight)
        .attr("rx", 6)
        .attr("fill", "#1a252f")
        .attr("stroke", "#34495e")
        .attr("stroke-width", 2);

    // Nivel de agua
    const agua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("fill", "url(#gradAgua)")
        .attr("rx", tanqueCurvatura - 2)
        .attr("opacity", 0.85);

    // Superficie del agua (ondulación)
    const superficieAgua = svg.append("rect")
        .attr("x", tanqueX)
        .attr("width", tanqueWidth)
        .attr("height", 3)
        .attr("fill", "rgba(255, 255, 255, 0.4)")
        .attr("rx", 2);

    // Indicador de nivel en la barra lateral
    const indicadorNivel = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth + 22)
        .attr("width", 8)
        .attr("fill", "#00bfff")
        .attr("rx", 4);

    // --- MARCAS DE NIVEL ---
    const marcasY = [];
    for (let i = 0; i <= 100; i += 25) {
        const y = tanqueY + tanqueHeight - (i / 100) * tanqueHeight;
        marcasY.push({ y, valor: i });
        
        // Líneas grandes cada 25%
        svg.append("line")
            .attr("x1", tanqueX - 15)
            .attr("x2", tanqueX - 5)
            .attr("y1", y)
            .attr("y2", y)
            .attr("stroke", "#00bfff")
            .attr("stroke-width", 4);
        
        // Texto de porcentaje
        svg.append("text")
            .attr("x", tanqueX - 20)
            .attr("y", y + 4)
            .attr("fill", "#ffffffff")
            .attr("font-size", "20px")
            .attr("text-anchor", "end")
            .text(i + "%");
    }

    // --- DISPLAY NUMÉRICO ---
    const display = svg.append("rect")
        .attr("x", tanqueX + tanqueWidth - 180)
        .attr("y", tanqueY + tanqueHeight + 25)
        .attr("width", 150)
        .attr("height", 50)
        .attr("rx", 8)
        .attr("fill", "#1a252f")
        .attr("stroke", "#00bfff")
        .attr("stroke-width", 2);

    const textoNivel = svg.append("text")
        .attr("x", tanqueX + tanqueWidth - 100)
        .attr("y", tanqueY + tanqueHeight + 60)
        .attr("fill", "#00ffcc")
        .attr("font-size", "35px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .style("font-family", "'Courier New', monospace")
        .text("00.0%");

    const textoLabel = svg.append("text")
        .attr("x", tanqueX + tanqueWidth - 100)
        .attr("y", tanqueY + tanqueHeight + 100)
        .attr("fill", "#ffffffff")
        .attr("font-size", "25px")
        .attr("text-anchor", "middle")
        .text("");

    // --- ESCALA Y ANIMACIÓN ---
    const escala = d3.scaleLinear()
        .domain([0, 100])
        .range([tanqueY + tanqueHeight, tanqueY]);

    function actualizar(valor) {
        const porcentaje = Math.max(0, Math.min(100, valor));
        const yAgua = escala(porcentaje);
        const alturaAgua = tanqueY + tanqueHeight - yAgua;
        
        // Altura para el indicador de la barra lateral
        const yIndicador = escala(porcentaje);
        const alturaIndicador = tanqueY + tanqueHeight - yIndicador;
        
        // Animación del agua
        agua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua)
            .attr("height", alturaAgua);
        
        // Animación de la superficie del agua
        superficieAgua.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yAgua);
        
        // Animación del indicador de la barra lateral
        indicadorNivel.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("y", yIndicador)
            .attr("height", alturaIndicador);
        
        // Actualizar display numérico
        textoNivel.transition()
            .duration(400)
            .text(porcentaje.toFixed(1) + "%");
        
        // Cambiar color según nivel
        let colorAgua;
        let colorIndicador;
        
        if (porcentaje < 20) {
            colorAgua = "#ff4444";  // Rojo (crítico)
            colorIndicador = "#ff4444";
        } else if (porcentaje < 40) {
            colorAgua = "#ffaa00";  // Naranja (bajo)
            colorIndicador = "#ffaa00";
        } else if (porcentaje < 70) {
            colorAgua = "#00bfff";  // Azul (normal)
            colorIndicador = "#00bfff";
        } else {
            colorAgua = "#00cc66";  // Verde (óptimo)
            colorIndicador = "#00cc66";
        }
        
        // Actualizar gradiente del agua dinámicamente
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
        indicadorNivel.attr("fill", colorIndicador);
        
        // Efecto de burbujas cuando se llena
        if (porcentaje > 90) {
            // Crear burbujas aleatorias
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

    // Inicializar con el valor inicial
    actualizar(valorInicial);

    // =================== CARGAR ÚLTIMO DATO DE LA BD ===================
    async function cargarUltimoDatoBD() {
        try {
            console.log('Cargando datos de agua desde BD para obtener el último...');
            const response = await fetch('/api/agua/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de agua de la BD');
                return;
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos) && datos.length > 0) {
                // Tomar el primer elemento (el más reciente según tu estructura)
                const ultimoDato = datos[0];
                const ultimoNivel = parseFloat(ultimoDato.nivel);
                
                console.log('Último dato de agua encontrado:', ultimoNivel, 'ID:', ultimoDato.id, 'Fecha:', ultimoDato.fecha_hora);
                
                // Actualizar el tanque con el último valor de la BD
                actualizar(ultimoNivel);
                
                return ultimoNivel;
            } else {
                console.log('No hay datos de agua en la BD');
                return null;
            }
        } catch (error) {
            console.log('Error al cargar datos de agua:', error);
            return null;
        }
    }

    // =================== FUNCIÓN PARA OBTENER MÚLTIPLES DATOS ===================
    async function cargarDatosRecientesBD(limite = 10) {
        try {
            const response = await fetch('/api/agua/');
            
            if (!response.ok) {
                console.log('No se pudieron obtener datos de agua de la BD');
                return [];
            }
            
            const datos = await response.json();
            
            if (datos && Array.isArray(datos)) {
                // Tomar los primeros 'limite' elementos (los más recientes)
                const datosRecientes = datos.slice(0, limite);
                console.log(`Cargados ${datosRecientes.length} datos recientes de agua`);
                return datosRecientes;
            }
            
            return [];
        } catch (error) {
            console.log('Error al cargar datos recientes:', error);
            return [];
        }
    }

    // Cargar el último dato al iniciar (con un pequeño retraso para asegurar que el DOM esté listo)
    setTimeout(() => {
        cargarUltimoDatoBD();
    }, 500);

    // =================== RETORNO DE FUNCIONES ===================
    // Para mantener compatibilidad con tu código existente
    const funcionActualizar = function(valor) {
        return actualizar(valor);
    };
    
    // Añadir funciones adicionales al objeto retornado
    funcionActualizar.cargarUltimoDato = cargarUltimoDatoBD;
    funcionActualizar.cargarDatosRecientes = cargarDatosRecientesBD;
    funcionActualizar.actualizar = actualizar;
    
    return funcionActualizar;
}

// ============================================================
// =========== SERIE TEMPORAL ========================
// ============================================================
function crearSerieTemporalAgua() {
    const container = d3.select("#serie-temporal");
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
        .style("box-shadow", "0 4px 20px rgba(0, 191, 255, 0.15)");

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
            typeof TRANSLATIONS !== "undefined" && TRANSLATIONS.level_history
                ? TRANSLATIONS.level_history
                : "HISTÓRICO DE NIVELES DE AGUA (%)"
        );

    // ===================== BOTÓN HOME =====================
    container.append("button")
        .attr("class", "btn btn-sm")
        .style("position", "absolute")
        .style("top", "12px")
        .style("right", "12px")
        .style("background", "rgba(0, 191, 255, 0.2)")
        .style("color", "#00bfff")
        .style("border", "1px solid #00bfff")
        .style("border-radius", "6px")
        .style("padding", "8px 12px")
        .style("cursor", "pointer")
        .style("z-index", "10")
        .style("transition", "all 0.3s")
        .attr("title", "Volver al último minuto")
        .html('<i class="bi bi-house-door"></i>')
        .on("mouseover", function () {
            d3.select(this)
                .style("background", "#00bfff")
                .style("color", "#0f172a")
                .style("transform", "scale(1.05)");
        })
        .on("mouseout", function () {
            d3.select(this)
                .style("background", "rgba(0, 191, 255, 0.2)")
                .style("color", "#00bfff")
                .style("transform", "scale(1)");
        })
        .on("click", function () {
            goToLatest(true);

            d3.select(this)
                .style("background", "#0099cc")
                .style("color", "#0f172a");

            setTimeout(() => {
                d3.select(this)
                    .style("background", "rgba(0, 191, 255, 0.2)")
                    .style("color", "#00bfff");
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

    const waterColors = {
        critico: "#ff4444",
        bajo: "#ffaa00",
        normal: "#00bfff",
        optimo: "#00cc66"
    };

    const gradientId = "water-gradient-temporal";
    const lineGradientId = "water-line-gradient-temporal";

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
        .attr("stop-color", "rgba(0, 191, 255, 0.4)")
        .attr("stop-opacity", 0.5);

    gradient.append("stop")
        .attr("offset", "80%")
        .attr("stop-color", "rgba(0, 191, 255, 0.1)")
        .attr("stop-opacity", 0.2);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "rgba(0, 191, 255, 0.05)")
        .attr("stop-opacity", 0.1);

    const lineGradient = defs.append("linearGradient")
        .attr("id", lineGradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    lineGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#00bfff");

    lineGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0066cc");

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
        .attr("class", "area-water")
        .attr("fill", `url(#${gradientId})`)
        .attr("stroke", "none");

    const path = g.append("path")
        .attr("class", "line-water")
        .attr("fill", "none")
        .attr("stroke", `url(#${lineGradientId})`)
        .attr("stroke-width", 3.5)
        .style("filter", "drop-shadow(0 0 8px rgba(0, 191, 255, 0.5))");

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
        .attr("y", -50)
        .attr("fill", "#ffffff")
        .attr("font-size", "22px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text(
            typeof TRANSLATIONS !== "undefined" && TRANSLATIONS.nivel
                ? TRANSLATIONS.nivel
                : "Nivel (%)"
        );

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

    // ===================== ZONAS DE NIVEL DE AGUA =====================
    const waterZonesData = [
        {
            min: 0,
            max: 20,
            color: "rgba(244, 67, 54, 0.08)",
            label: "CRÍTICO"
        },
        {
            min: 20,
            max: 40,
            color: "rgba(255, 193, 7, 0.08)",
            label: "BAJO"
        },
        {
            min: 40,
            max: 70,
            color: "rgba(33, 150, 243, 0.08)",
            label: "NORMAL"
        },
        {
            min: 70,
            max: 100,
            color: "rgba(76, 175, 80, 0.08)",
            label: "ÓPTIMO"
        }
    ];

    // ===================== TOOLTIP =====================
    d3.select("body").selectAll(".tooltip-water").remove();

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-water")
        .style("position", "absolute")
        .style("background", "rgba(15, 23, 42, 0.95)")
        .style("color", "#e2e8f0")
        .style("padding", "12px 16px")
        .style("border", "2px solid #00bfff")
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

    // Línea de referencia: nivel óptimo recomendado 70 %
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

    function getWaterValue(item) {
        const value =
            item.nivel ??
            item.valor ??
            item.agua ??
            item.value;

        return parseFloat(value);
    }

    function getWaterDate(item) {
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
            ensureViewInitialized();
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

    function getWaterLevel(v) {
        if (v < 20) {
            return {
                level: "CRÍTICO",
                color: waterColors.critico,
                emoji: "🔴",
                descripcion: "¡Nivel crítico! Reponer agua urgentemente"
            };
        }

        if (v < 40) {
            return {
                level: "BAJO",
                color: waterColors.bajo,
                emoji: "🟡",
                descripcion: "Nivel bajo, se recomienda planificar reposición"
            };
        }

        if (v < 70) {
            return {
                level: "NORMAL",
                color: waterColors.normal,
                emoji: "🔵",
                descripcion: "Nivel operativo normal"
            };
        }

        return {
            level: "ÓPTIMO",
            color: waterColors.optimo,
            emoji: "🟢",
            descripcion: "Nivel óptimo de disponibilidad"
        };
    }

    // ===================== REDIBUJADO =====================
    function redraw() {
        updateViewForNewData();

        const visibleData = getVisibleData();

        if (!currentViewStart || !currentViewEnd) return;

        x.domain([currentViewStart, currentViewEnd]);
        y.domain([0, 100]);

        // Zonas de nivel de agua
        const waterZones = zonesGroup.selectAll(".water-zone")
            .data(waterZonesData);

        waterZones.enter()
            .append("rect")
            .attr("class", "water-zone")
            .merge(waterZones)
            .attr("x", 0)
            .attr("width", width)
            .attr("y", d => y(d.max))
            .attr("height", d => y(d.min) - y(d.max))
            .attr("fill", d => d.color)
            .attr("rx", 2);

        waterZones.exit().remove();

        // Línea de referencia 70 %
        const recommendedLevel = 70;

        referenceLine
            .attr("x1", 0)
            .attr("y1", y(recommendedLevel))
            .attr("x2", width)
            .attr("y2", y(recommendedLevel))
            .style("opacity", 0.6);

        // Grid
        grid.call(
            d3.axisLeft(y)
                .ticks(6)
                .tickSize(-width)
                .tickFormat("")
        )
            .attr("opacity", 0.15)
            .selectAll("line")
            .attr("stroke", "#00bfff");

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
            .attr("stroke", "#00bfff")
            .attr("opacity", 0.5);

        // Eje Y
        yAxisG.call(
            d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => `${d}%`)
                .tickSizeOuter(0)
        )
            .selectAll("text")
            .attr("fill", "#94a3b8")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("dx", "-5px");

        yAxisG.selectAll("path, line")
            .attr("stroke", "#00bfff")
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
            .attr("fill", d => getWaterLevel(d.value).color)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .style("opacity", 0.9);

        g.selectAll(".data-point")
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                const levelInfo = getWaterLevel(d.value);

                focus
                    .attr("cx", x(d.time))
                    .attr("cy", y(d.value))
                    .attr("fill", levelInfo.color)
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
                            <div style="width: 12px; height: 12px; background: ${levelInfo.color}; border-radius: 50%; margin-right: 8px;"></div>
                            <strong style="font-size: 16px; color: #00bfff;">${d.value.toFixed(1)}%</strong>
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
            console.log("Dato de agua inválido:", value, timestampStr);
            return;
        }

        const valueClamped = clamp(parsedValue, 0, 100);

        data.push({
            id: `agua-${time.getTime()}-${Math.random()}`,
            time: time,
            value: valueClamped
        });

        data.sort((a, b) => a.time - b.time);

        redraw();
    }

    // ===================== CARGA DE HISTÓRICO COMPLETO =====================
    async function fetchAllHistoricalData(initialUrl = "/api/agua/") {
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
            const apiData = await fetchAllHistoricalData("/api/agua/");

            if (apiData && apiData.length > 0) {
                data = apiData
                    .map(item => {
                        const value = getWaterValue(item);
                        const time = new Date(getWaterDate(item));

                        return {
                            id: `db-${item.id || getWaterDate(item) || Math.random()}`,
                            time: time,
                            value: clamp(value, 0, 100)
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

                // Actualizar tanque con el último valor histórico
                if (data.length > 0 && typeof actualizarTanque === "function") {
                    const lastValue = data[data.length - 1].value;
                    actualizarTanque(lastValue);
                }

                console.log(`Datos de agua cargados: ${data.length} puntos`);
            } else {
                redraw();
            }
        } catch (error) {
            console.log("No se pudieron cargar datos históricos de agua:", error);
        }
    }

    loadHistoricalData();

    // ===================== FUNCIÓN DE ACTUALIZACIÓN COMPATIBLE =====================
    function actualizarSerie(nivel) {
        addData(nivel);
    }

    // ===================== MÉTODOS PÚBLICOS =====================
    return {
        actualizarSerie: actualizarSerie,

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
            g.selectAll(".water-zone").remove();
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
                    value: clamp(parseFloat(d.v || d.value || d.valor || d.nivel || d.agua), 0, 100)
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
const actualizarTanque = crearTanqueAgua("#grafico-tanque", 0);
const actualizarSerieTemporal = crearSerieTemporalAgua();

// ============================================================
// ====================== WEBSOCKET AGUA ======================
// ============================================================

    const socket = new WebSocket("ws://" + window.location.host + "/ws/agua/");

    socket.onmessage = function(e) {
        const mensaje = JSON.parse(e.data);
        const valor = parseFloat(mensaje.nivel);
        const fecha = mensaje.fecha_hora;

        // Actualizar el tanque usando la instancia existente
        if (typeof actualizarTanque === 'function') {
            actualizarTanque(valor);
        }

        // Actualizar la serie temporal
        if (actualizarSerieTemporal && typeof actualizarSerieTemporal.push === 'function') {
            actualizarSerieTemporal.push(valor, fecha);
        } else if (typeof actualizarSerieTemporal === 'function') {
            actualizarSerieTemporal(valor);
        }

        // Enviar ACK para completar metricas
        if (mensaje.sample_id) {
            socket.send(JSON.stringify({
                type: "ack_metric",
                sample_id: mensaje.sample_id,
                cliente: "web"
            }));

            console.log("ACK agua enviado para:", mensaje.sample_id);
        }

        console.log('Datos WebSocket agua recibidos:', { valor, fecha, sample_id: mensaje.sample_id });
    };

    socket.onopen = function() {
        console.log("WebSocket Tanque de Agua conectado");
    };

    socket.onerror = function(error) {
        console.error("Error en conexion WebSocket agua:", error);
    };

    socket.onclose = function() {
        console.warn("Conexion WebSocket agua cerrada");
        setTimeout(() => {
            location.reload();
        }, 3000);
    };
});