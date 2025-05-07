(() => {
  const maxIncrements = 6;

  function generateDurationsList(base30m, base1h, halfHourIncrement, count) {
    const result = [];
    result.push({ label: "10 Menit", price: 0 });
    for (let i = 1; i <= count; i++) {
      let label = "";
      let hours = Math.floor(i / 2);
      let minutes = (i % 2) * 30;
      if (hours > 0) label += hours + (hours === 1 ? " Jam " : " Jam ");
      if (minutes > 0) label += minutes + " Menit";
      if (label === "") label = "0 Menit";
      let price = 0;
      if (i === 1) price = base30m;
      else if (i === 2) price = base1h;
      else price = base1h + (i - 2) * halfHourIncrement;
      price = Math.ceil(price / 1000) * 1000;
      result.push({ label, price });
    }
    return result;
  }

  const ps3Durations = generateDurationsList(5000, 9000, 4500, maxIncrements);
  const ps4Durations = generateDurationsList(7000, 13000, 6500, maxIncrements);

  const parts = {
    "part-TV1": "ps3",
    "part-TV2": "ps3",
    "part-TV3": "ps3",
    "part-TV4": "ps3",
    "part-TV5": "ps3",
    "part-TV6": "ps3",
    "part-PS4": "ps4",
  };

  let countdowns = {};
  let paused = {};
  let timerInterval = null;

  let billingHistory = {
    TV1: [],
    TV2: [],
    TV3: [],
    TV4: [],
    TV5: [],
    TV6: [],
    PS4: [],
  };

  function formatRupiah(num) {
    return "Rp" + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m.toString().padStart(2, "0") + ":" + s.toString().padStart(2, "0");
  }

  function labelToMinutes(label) {
    if (label === "10 Menit") return 10;
    const hrMatch = label.match(/(\d+)\s*Jam/);
    const mnMatch = label.match(/(\d+)\s*Menit/);
    let total = 0;
    if (hrMatch) total += parseInt(hrMatch[1]) * 60;
    if (mnMatch) total += parseInt(mnMatch[1]);
    return total;
  }

  function initSelects() {
    Object.keys(parts).forEach((partId) => {
      const container = document.getElementById(partId);
      const select = container.querySelector("select");
      select.innerHTML = "";
      const durations = parts[partId] === "ps3" ? ps3Durations : ps4Durations;
      durations.forEach((dur) => {
        const option = document.createElement("option");
        option.value = dur.label;
        option.textContent =
          dur.price > 0
            ? `${dur.label} (${formatRupiah(dur.price)})`
            : dur.label;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        container.querySelector(".timer-display").textContent = "";
      });
    });
  }

  function updateTimers() {
    const now = Date.now();
    let anyActive = false;
    Object.keys(parts).forEach((partId) => {
      const container = document.getElementById(partId);
      const timerDisplay = container.querySelector(".timer-display");
      const key = partId.replace("part-", "");
      if (!billingHistory[key] || billingHistory[key].length === 0) {
        timerDisplay.textContent = "";
        return;
      }
      if (paused[partId]) {
        timerDisplay.textContent = "Paused";
        anyActive = true;
        return;
      }
      const endTime = countdowns[partId];
      if (endTime && endTime > now) {
        const secondsLeft = Math.floor((endTime - now) / 1000);
        timerDisplay.textContent = "Time left: " + formatTime(secondsLeft);
        anyActive = true;
      } else if (endTime) {
        timerDisplay.textContent = "Time's up! ⏰";
        delete countdowns[partId];
        billingHistory[key].shift();
        renderReceipt();
      } else {
        timerDisplay.textContent = "";
      }
    });
    if (!anyActive && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimerInterval() {
    if (timerInterval) return;
    timerInterval = setInterval(updateTimers, 1000);
  }

  function renderReceipt() {
    const receiptArea = document.getElementById("receiptArea");
    receiptArea.innerHTML = "";
    const activeDevices = Object.entries(billingHistory).filter(
      ([, bills]) => bills.length > 0
    );
    if (activeDevices.length === 0) {
      receiptArea.textContent = "No active bills.";
      return;
    }
    activeDevices.forEach(([device, bills]) => {
      const section = document.createElement("div");
      section.className = "receipt-section";
      const header = document.createElement("div");
      header.className = "receipt-section-header";
      header.textContent = device;
      const lines = document.createElement("pre");
      lines.className = "receipt-lines";
      lines.textContent = bills
        .map(
          (b, i) =>
            `#${i + 1}: Duration: ${b.duration} | Price: ${formatRupiah(
              b.price
            )}`
        )
        .join("\n");
      section.appendChild(header);
      section.appendChild(lines);
      receiptArea.appendChild(section);
    });
    const totalSum = activeDevices.reduce(
      (acc, [, bills]) => acc + bills.reduce((a, b) => a + b.price, 0),
      0
    );
    const totalDiv = document.createElement("div");
    totalDiv.className = "total-overall";
    totalDiv.textContent = "TOTAL: " + formatRupiah(totalSum);
    receiptArea.appendChild(totalDiv);
  }

  function generateBillForPart(partId) {
    const partType = parts[partId];
    const container = document.getElementById(partId);
    const select = container.querySelector("select");
    const selectedLabel = select.value;
    if (!selectedLabel) {
      alert(
        `Please select duration for ${
          container.querySelector("h3").textContent
        }!`
      );
      select.focus();
      return null;
    }
    const durations = partType === "ps3" ? ps3Durations : ps4Durations;
    const dur = durations.find((d) => d.label === selectedLabel);
    if (!dur) {
      alert("Invalid duration selected");
      select.focus();
      return null;
    }
    const price = dur.price;
    const minutes = labelToMinutes(dur.label);
    countdowns[partId] = Date.now() + minutes * 60000;
    delete paused[partId];
    const key = partId.replace("part-", "");
    billingHistory[key].push({ duration: dur.label, price: price });
    updateTimers();
    startTimerInterval();
    return {
      device: container.querySelector("h3").textContent,
      duration: dur.label,
      price,
    };
  }

  Object.keys(parts).forEach((partId) => {
    const container = document.getElementById(partId);
    const generateBtn = container.querySelector(".btn-generate");
    const pauseBtn = container.querySelector(".btn-pause");
    const unpauseBtn = container.querySelector(".btn-unpause");
    const cancelBtn = container.querySelector(".btn-cancel");

    generateBtn.addEventListener("click", () => {
      const bill = generateBillForPart(partId);
      if (!bill) return;
      pauseBtn.disabled = false;
      cancelBtn.disabled = false;
      unpauseBtn.disabled = true;
      renderReceipt();
    });

    pauseBtn.addEventListener("click", () => {
      if (!countdowns[partId]) return;
      if (paused[partId]) return;
      const remaining = countdowns[partId] - Date.now();
      if (remaining <= 0) return;
      paused[partId] = remaining;
      delete countdowns[partId];
      updateTimers();
      pauseBtn.disabled = true;
      unpauseBtn.disabled = false;
    });

    unpauseBtn.addEventListener("click", () => {
      if (!paused[partId]) return;
      countdowns[partId] = Date.now() + paused[partId];
      delete paused[partId];
      updateTimers();
      startTimerInterval();
      pauseBtn.disabled = false;
      unpauseBtn.disabled = true;
    });

    cancelBtn.addEventListener("click", () => {
      delete countdowns[partId];
      delete paused[partId];
      updateTimers();
      const key = partId.replace("part-", "");
      if (billingHistory[key] && billingHistory[key].length > 0) {
        billingHistory[key].pop();
      }
      renderReceipt();
      pauseBtn.disabled = billingHistory[key].length === 0;
      unpauseBtn.disabled = true;
      cancelBtn.disabled = billingHistory[key].length === 0;
    });

    pauseBtn.disabled = true;
    unpauseBtn.disabled = true;
    cancelBtn.disabled = true;
  });

  initSelects();
  updateTimers();
  renderReceipt();
})();
