const baseModel = {
    transmission: 0.9,
    exposedToInfected: 1 / 7,
    deathRate: 0.50 / 7,
    recoveryRate: 0.50 / 7
};

const infectiousPeriodDays = 7;
const model = {
    ...baseModel,
    population: 515,
    exposed: 10,
    infected: 5
};
const cities = [
    { name: "Tokyo", population: 37115000, transmission: 0.20, fatality: 0.42 },
    { name: "Delhi", population: 34665000, transmission: 0.32, fatality: 0.60 },
    { name: "Shanghai", population: 30482000, transmission: 0.22, fatality: 0.48 },
    { name: "Dhaka", population: 24652000, transmission: 0.34, fatality: 0.65 },
    { name: "Cairo", population: 23074000, transmission: 0.31, fatality: 0.62 },
    { name: "São Paulo", population: 22990000, transmission: 0.24, fatality: 0.50 },
    { name: "Mexico City", population: 22752000, transmission: 0.27, fatality: 0.55 },
    { name: "Beijing", population: 22596000, transmission: 0.21, fatality: 0.46 },
    { name: "Mumbai", population: 22089000, transmission: 0.30, fatality: 0.58 },
    { name: "Osaka", population: 18921000, transmission: 0.19, fatality: 0.40 }
];
const populationInput = document.querySelector("#population");
const daysInput = document.querySelector("#days");
const exposedInput = document.querySelector("#exposed");
const infectedInput = document.querySelector("#infected");
const populationOutput = document.querySelector("#populationOutput");
const daysOutput = document.querySelector("#daysOutput");
const status = document.querySelector("#modelStatus");
const cityTitle = document.querySelector("#cityTitle");
const brandSubtitle = document.querySelector("#brandSubtitle");
const cityNotice = document.querySelector("#cityNotice");
const transmissionOutput = document.querySelector("#transmissionOutput");
const fatalityOutput = document.querySelector("#fatalityOutput");
const recoveryOutput = document.querySelector("#recoveryOutput");
const chart = document.querySelector("#chart");
const chartWrap = document.querySelector("#chartWrap");
const tooltip = document.querySelector("#tooltip");
const yScaleInput = document.querySelector("#yScale");
const resetZoomButton = document.querySelector("#resetZoom");
const zoomHint = document.querySelector("#zoomHint");
let lastSelectedCity = null;
let zoomRange = null;

function formatNumber(value) {
    return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

function randomIntegerDifferentFrom(min, max, current) {
    let value = Math.floor(Math.random() * (max - min + 1)) + min;
    if (value === Number(current)) {
        value = value === max ? min : value + 1;
    }
    return value;
}

function simulate() {
    const population = model.population;
    const days = Number(daysInput.value);
    let susceptible = population - model.exposed - model.infected;
    let exposed = model.exposed;
    let infected = model.infected;
    let recovered = 0;
    let dead = 0;
    const data = [];

    susceptible = Math.max(0, susceptible);

    for (let day = 0; day <= days; day++) {
        data.push({ day, susceptible, exposed, infected, recovered, dead });
        if (day === days) break;

        const total = susceptible + exposed + infected + recovered;
        const newExposed = model.transmission * susceptible * infected / Math.max(1, total);
        const newInfected = model.exposedToInfected * exposed;
        const newDeaths = model.deathRate * infected;
        const newRecovered = model.recoveryRate * infected;

        susceptible = Math.max(0, susceptible - newExposed);
        exposed = Math.max(0, exposed + newExposed - newInfected);
        infected = Math.max(0, infected + newInfected - newDeaths - newRecovered);
        recovered = Math.max(0, recovered + newRecovered);
        dead = Math.max(0, dead + newDeaths);
    }

    return data;
}

function svgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
}

function drawChart(data) {
    const width = chartWrap.clientWidth;
    const height = chartWrap.clientHeight;
    if (!width || !height) return;

    chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    chart.replaceChildren();

    const margin = { top: 20, right: 24, bottom: 42, left: 64 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const minDay = zoomRange ? zoomRange.start : 0;
    const maxDay = zoomRange ? zoomRange.end : data[data.length - 1].day;
    const visibleData = data.filter(point => point.day >= minDay && point.day <= maxDay);
    const maxValue = Math.max(model.population, 1, ...data.flatMap(point =>
        [point.susceptible, point.exposed, point.infected, point.recovered, point.dead]
    ));
    const logScale = yScaleInput.value === "log";
    const yMax = logScale ? maxValue : Math.max(100, Math.ceil(maxValue / 100) * 100);
    const transformY = value => logScale ? Math.log10(Math.max(0, value) + 1) : value;
    const maxTransformedY = transformY(yMax) || 1;
    const x = day => margin.left + (day - minDay) / (maxDay - minDay) * plotWidth;
    const y = value => margin.top + plotHeight - transformY(value) / maxTransformedY * plotHeight;

    for (let i = 0; i <= 5; i++) {
        const transformedValue = maxTransformedY * i / 5;
        const value = logScale ? Math.pow(10, transformedValue) - 1 : yMax * i / 5;
        const yy = y(value);
        chart.appendChild(svgElement("line", {
            x1: margin.left, y1: yy, x2: width - margin.right, y2: yy,
            stroke: "#e5ecf2", "stroke-width": 1
        }));
        const label = svgElement("text", {
            x: margin.left - 12, y: yy + 4,
            "text-anchor": "end", fill: "#789", "font-size": 11
        });
        label.textContent = formatNumber(value);
        chart.appendChild(label);
    }

    const selection = svgElement("rect", {
        y: margin.top,
        height: plotHeight,
        fill: "#2e86ab",
        "fill-opacity": 0.14,
        stroke: "#2e86ab",
        "stroke-width": 1,
        visibility: "hidden",
        "pointer-events": "none"
    });
    chart.appendChild(selection);

    const tickCount = Math.max(1, Math.min(width < 600 ? 4 : 6, Math.floor(maxDay - minDay)));
    for (let i = 0; i <= tickCount; i++) {
        const day = Math.round(minDay + (maxDay - minDay) * i / tickCount);
        const xx = x(day);
        const label = svgElement("text", {
            x: xx, y: height - 14,
            "text-anchor": "middle", fill: "#789", "font-size": 11
        });
        label.textContent = `Day ${day}`;
        chart.appendChild(label);
    }

    const series = [
        { key: "susceptible", color: "#2e86ab" },
        { key: "exposed", color: "#ec7a3c" },
        { key: "infected", color: "#c94c4c" },
        { key: "recovered", color: "#63a86f" },
        { key: "dead", color: "#735a9e" }
    ];

    series.forEach(item => {
        const points = visibleData.map(point => `${x(point.day)},${y(point[item.key])}`).join(" ");
        chart.appendChild(svgElement("polyline", {
            points,
            fill: "none",
            stroke: item.color,
            "stroke-width": 2.5,
            "stroke-linejoin": "round",
            "stroke-linecap": "round"
        }));
    });

    chart.appendChild(svgElement("rect", {
        x: margin.left,
        y: margin.top,
        width: plotWidth,
        height: plotHeight,
        fill: "transparent",
        "pointer-events": "all"
    }));

    let dragStartX = null;
    const hoverLine = svgElement("line", {
        y1: margin.top,
        y2: margin.top + plotHeight,
        stroke: "#aab8c5",
        "stroke-width": 1,
        "stroke-dasharray": "4 4",
        opacity: 0
    });
    chart.appendChild(hoverLine);

    chart.onpointerdown = event => {
        const rect = chart.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        if (mouseX < margin.left || mouseX > width - margin.right) return;
        dragStartX = Math.max(margin.left, Math.min(width - margin.right, mouseX));
        selection.setAttribute("x", dragStartX);
        selection.setAttribute("width", 0);
        selection.setAttribute("visibility", "visible");
        tooltip.style.display = "none";
        chart.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    chart.onpointermove = event => {
        const rect = chart.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        if (dragStartX !== null) {
            const currentX = Math.max(margin.left, Math.min(width - margin.right, mouseX));
            selection.setAttribute("x", Math.min(dragStartX, currentX));
            selection.setAttribute("width", Math.abs(currentX - dragStartX));
            return;
        }

        if (mouseX < margin.left || mouseX > width - margin.right) return;
        const fraction = (mouseX - margin.left) / plotWidth;
        const day = Math.round(minDay + fraction * (maxDay - minDay));
        const index = Math.max(0, Math.min(data.length - 1, day));
        const point = data[index];
        const xx = x(point.day);

        hoverLine.setAttribute("x1", xx);
        hoverLine.setAttribute("x2", xx);
        hoverLine.setAttribute("opacity", 1);
        tooltip.style.display = "block";
        tooltip.innerHTML =
            `<strong>Day ${point.day}</strong><br>` +
            `Susceptible: ${formatNumber(point.susceptible)}<br>` +
            `Exposed: ${formatNumber(point.exposed)}<br>` +
            `Infected: ${formatNumber(point.infected)}<br>` +
            `Recovered: ${formatNumber(point.recovered)}<br>` +
            `Deaths: ${formatNumber(point.dead)}`;

        const tooltipX = Math.min(width - 170, Math.max(8, mouseX + 12));
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = "18px";
    };

    chart.onpointerup = event => {
        if (dragStartX === null) return;
        const rect = chart.getBoundingClientRect();
        const endX = Math.max(margin.left, Math.min(width - margin.right, event.clientX - rect.left));
        const startX = dragStartX;
        dragStartX = null;
        selection.setAttribute("visibility", "hidden");

        if (Math.abs(endX - startX) < 12) return;
        const firstDay = minDay + (Math.min(startX, endX) - margin.left) / plotWidth * (maxDay - minDay);
        const lastDay = minDay + (Math.max(startX, endX) - margin.left) / plotWidth * (maxDay - minDay);
        const start = Math.max(minDay, Math.floor(firstDay));
        const end = Math.min(maxDay, Math.ceil(lastDay));
        if (end - start < 1) return;

        zoomRange = { start, end };
        update();
    };

    chart.onpointercancel = () => {
        dragStartX = null;
        selection.setAttribute("visibility", "hidden");
    };

    chart.onpointerleave = () => {
        if (dragStartX === null) {
            hoverLine.setAttribute("opacity", 0);
            tooltip.style.display = "none";
        }
    };

    chart.ondblclick = () => {
        if (zoomRange) {
            zoomRange = null;
            update();
        }
    };

    resetZoomButton.disabled = !zoomRange;
    zoomHint.textContent = zoomRange
        ? `Zoomed to days ${zoomRange.start}–${zoomRange.end}. Drag again to zoom further.`
        : "Drag horizontally inside the graph to zoom into a time range.";

    const peak = data.reduce((best, point) => point.infected > best.infected ? point : best, data[0]);
    const finalPoint = data[data.length - 1];
    document.querySelector("#peakStat").textContent = formatNumber(peak.infected);
    document.querySelector("#deathStat").textContent = formatNumber(finalPoint.dead);
    document.querySelector("#recoveredStat").textContent = formatNumber(finalPoint.recovered);
}

function update() {
    if (Number(populationInput.value) < 1) populationInput.value = "1";
    populationInput.value = String(Math.floor(Number(populationInput.value) || 1));
    model.population = Number(populationInput.value);
    model.exposed = Math.max(0, Math.floor(Number(exposedInput.value) || 0));
    model.infected = Math.max(0, Math.floor(Number(infectedInput.value) || 0));
    populationOutput.value = formatNumber(populationInput.value);
    populationOutput.textContent = formatNumber(populationInput.value);
    transmissionOutput.textContent = `${model.transmission.toFixed(2)} / day`;
    const fatalityRatio = model.deathRate + model.recoveryRate > 0
        ? model.deathRate / (model.deathRate + model.recoveryRate)
        : 0;
    fatalityOutput.textContent = `${Math.round(fatalityRatio * 100)}%`;
    recoveryOutput.textContent = `${Math.round((1 - fatalityRatio) * 100)}%`;
    daysOutput.value = `${daysInput.value} days`;
    daysOutput.textContent = `${daysInput.value} days`;
    const forecastDays = Number(daysInput.value);
    if (zoomRange && zoomRange.start >= forecastDays) {
        zoomRange = null;
    } else if (zoomRange && zoomRange.end > forecastDays) {
        zoomRange.end = forecastDays;
    }
    drawChart(simulate());
}

function normalizeExpression(expression) {
    return expression.replace(/,/g, ".");
}

function parseCMR7(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);

    const modelMatch = text.match(/<model[\s\S]*?<\/model>/);
    if (!modelMatch) throw new Error("No model XML found in this file.");
    const xml = modelMatch[0];

    const getValue = (label, tag = "expr") => {
        const block = xml.match(new RegExp(
            `<modelobject>[\\s\\S]*?<label>${label}<\\/label>[\\s\\S]*?<${tag}>([\\s\\S]*?)<\\/${tag}>`,
            "i"
        ));
        return block ? block[1].trim() : null;
    };

    const parseNumber = expression => {
        if (!expression) return null;
        const normalized = normalizeExpression(expression);
        if (!/^[0-9.+\-*/()\s]+$/.test(normalized)) return null;
        try {
            return Function(`"use strict"; return (${normalized})`)();
        } catch {
            return null;
        }
    };

    const healthy = parseNumber(getValue("Gezond"));
    const exposed = parseNumber(getValue("Besmet"));
    const infected = parseNumber(getValue("Ziek"));
    const bk = parseNumber(getValue("BK"));
    const zk = parseNumber(getValue("ZK"));
    const sk = parseNumber(getValue("SK"));
    const bwk = parseNumber(getValue("BWK"));

    if ([healthy, exposed, infected].every(value => value !== null)) {
        const population = healthy + exposed + infected;
        populationInput.value = String(Math.round(population));
        exposedInput.value = String(Math.round(exposed));
        infectedInput.value = String(Math.round(infected));
        model.population = Math.round(population);
        model.exposed = Math.round(exposed);
        model.infected = Math.round(infected);
    }
    if (bk !== null) model.transmission = bk;
    if (zk !== null) model.exposedToInfected = zk;
    if (sk !== null) model.deathRate = sk;
    if (bwk !== null) model.recoveryRate = bwk;

    const stop = xml.match(/<stop>(.*?)<\/stop>/);
    if (stop) {
        const days = Number(stop[1]);
        if (days > 0) daysInput.value = String(Math.min(180, days));
    }
}

[populationInput, daysInput, exposedInput, infectedInput].forEach(input => {
    input.addEventListener("input", update);
});

yScaleInput.addEventListener("change", update);
resetZoomButton.addEventListener("click", () => {
    zoomRange = null;
    update();
});

function pickRandomCity() {
    let city = cities[Math.floor(Math.random() * cities.length)];
    if (city.name === lastSelectedCity) {
        const currentIndex = cities.findIndex(item => item.name === city.name);
        city = cities[(currentIndex + 1) % cities.length];
    }
    const exposed = randomIntegerDifferentFrom(2, 30, exposedInput.value);
    const infected = randomIntegerDifferentFrom(1, 8, infectedInput.value);
    lastSelectedCity = city.name;

    populationInput.value = String(city.population);
    exposedInput.value = String(exposed);
    infectedInput.value = String(infected);
    model.population = city.population;
    model.exposed = exposed;
    model.infected = infected;
    model.transmission = city.transmission;
    model.deathRate = city.fatality / infectiousPeriodDays;
    model.recoveryRate = (1 - city.fatality) / infectiousPeriodDays;
    cityTitle.textContent = city.name;
    brandSubtitle.textContent = "Ebola outbreak forecast scenario";
    cityNotice.textContent = `Selected city: ${city.name}`;
    cityNotice.hidden = false;
    document.title = `${city.name} — Ebola Forecast Model`;
    status.innerHTML =
        `<strong>${city.name} scenario loaded.</strong><br>` +
        `Approx. ${formatNumber(city.population)} metro residents; ` +
        `${exposed} exposed, ${infected} infected; transmission ${city.transmission.toFixed(2)}/day; ` +
        `fatality ${Math.round(city.fatality * 100)}%, recovery ${Math.round((1 - city.fatality) * 100)}%.`;
    update();
}

document.querySelector("#modelFile").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        await parseCMR7(await file.arrayBuffer());
        status.innerHTML = `<strong>CMR7 model imported.</strong><br>${file.name}`;
        update();
    } catch (error) {
        status.innerHTML = `<strong>Import failed.</strong><br>${error.message}`;
    }
});

window.addEventListener("resize", update);
update();
