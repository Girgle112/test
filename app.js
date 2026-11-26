const baseModel = {
    transmission: 0.9,
    exposedToInfected: 1 / 7,
    deathRate: 0.70 / 7,
    recoveryRate: 0.30 / 7
};

const model = {
    ...baseModel,
    population: 515,
    exposed: 10,
    infected: 5
};
const cities = [
    { name: "Tokyo", population: 37115000 },
    { name: "Delhi", population: 34665000 },
    { name: "Shanghai", population: 30482000 },
    { name: "Dhaka", population: 24652000 },
    { name: "Cairo", population: 23074000 },
    { name: "São Paulo", population: 22990000 },
    { name: "Mexico City", population: 22752000 },
    { name: "Beijing", population: 22596000 },
    { name: "Mumbai", population: 22089000 },
    { name: "Osaka", population: 18921000 }
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
const chart = document.querySelector("#chart");
const chartWrap = document.querySelector("#chartWrap");
const tooltip = document.querySelector("#tooltip");
let lastSelectedCity = null;

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
    const maxValue = Math.max(100, ...data.flatMap(point =>
        [point.susceptible, point.exposed, point.infected, point.recovered]
    ));
    const yMax = Math.ceil(maxValue / 100) * 100;
    const x = day => margin.left + day / data[data.length - 1].day * plotWidth;
    const y = value => margin.top + plotHeight - value / yMax * plotHeight;

    for (let i = 0; i <= 5; i++) {
        const value = yMax * i / 5;
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

    const tickCount = width < 600 ? 4 : 6;
    for (let i = 0; i <= tickCount; i++) {
        const day = Math.round(data[data.length - 1].day * i / tickCount);
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
        { key: "recovered", color: "#63a86f" }
    ];

    series.forEach(item => {
        const points = data.map(point => `${x(point.day)},${y(point[item.key])}`).join(" ");
        chart.appendChild(svgElement("polyline", {
            points,
            fill: "none",
            stroke: item.color,
            "stroke-width": 2.5,
            "stroke-linejoin": "round",
            "stroke-linecap": "round"
        }));
    });

    const hoverLine = svgElement("line", {
        y1: margin.top,
        y2: margin.top + plotHeight,
        stroke: "#aab8c5",
        "stroke-width": 1,
        "stroke-dasharray": "4 4",
        opacity: 0
    });
    chart.appendChild(hoverLine);

    chart.onmousemove = event => {
        const rect = chart.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const day = Math.round((mouseX - margin.left) / plotWidth * data[data.length - 1].day);
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
            `Recovered: ${formatNumber(point.recovered)}`;

        const tooltipX = Math.min(width - 170, Math.max(8, mouseX + 12));
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = "18px";
    };

    chart.onmouseleave = () => {
        hoverLine.setAttribute("opacity", 0);
        tooltip.style.display = "none";
    };

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
    daysOutput.value = `${daysInput.value} days`;
    daysOutput.textContent = `${daysInput.value} days`;
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
    cityTitle.textContent = city.name;
    brandSubtitle.textContent = "Ebola outbreak forecast scenario";
    cityNotice.textContent = `Selected city: ${city.name}`;
    cityNotice.hidden = false;
    document.title = `${city.name} — Ebola Forecast Model`;
    status.innerHTML =
        `<strong>${city.name} scenario loaded.</strong><br>` +
        `Approx. ${formatNumber(city.population)} metro residents; ` +
        `${exposed} exposed and ${infected} infected (illustrative starting values).`;
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
