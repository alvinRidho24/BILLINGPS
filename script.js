// Konfigurasi harga tetap
const hargaPS3 = {
  10: 0,
  30: 5000,
  60: 9000,
  90: 14000,
  120: 18000,
  150: 23000,
  180: 27000,
};

const hargaPS4 = {
  10: 0,
  30: 7000,
  60: 13000,
  90: 20000,
  120: 26000,
  150: 33000,
  180: 39000,
};

// Data billing
let dataBilling = JSON.parse(localStorage.getItem("billingData")) || {
  aktif: {},
  riwayat: {},
  total: 0,
};

const perangkat = ["TV1", "TV2", "TV3", "TV4", "TV5", "TV6", "PS4"];

// Format Rupiah
function formatRupiah(angka) {
  return "Rp" + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Format waktu
function formatWaktu(detik) {
  const menit = Math.floor(detik / 60);
  const detikSisa = detik % 60;
  return `${menit.toString().padStart(2, "0")}:${detikSisa
    .toString()
    .padStart(2, "0")}`;
}

// Update timer
function updateTimer() {
  const sekarang = Math.floor(Date.now() / 1000);

  perangkat.forEach((device) => {
    const timerDisplay = document.querySelector(`#${device} .timer-display`);
    const aktif = dataBilling.aktif[device];

    if (aktif) {
      if (aktif.dijeda) {
        timerDisplay.textContent = "Dijeda";
        timerDisplay.classList.remove("timer-warning");
        return;
      }

      const sisaWaktu = aktif.waktuSelesai - sekarang;

      if (sisaWaktu < 60) {
        timerDisplay.classList.add("timer-warning");
      } else {
        timerDisplay.classList.remove("timer-warning");
      }

      if (sisaWaktu > 0) {
        timerDisplay.textContent = `Sisa: ${formatWaktu(sisaWaktu)}`;
      } else {
        selesaikanSesi(device);
      }
    } else {
      timerDisplay.textContent = "";
      timerDisplay.classList.remove("timer-warning");
    }
  });

  localStorage.setItem("billingData", JSON.stringify(dataBilling));
}

// Selesaikan sesi
function selesaikanSesi(device) {
  if (!dataBilling.riwayat[device]) dataBilling.riwayat[device] = [];

  const durasiAwalMenit = dataBilling.aktif[device].durasi / 60;
  const jenis = device === "PS4" ? "PS4" : "PS3";
  const hargaPerangkat = jenis === "PS4" ? hargaPS4 : hargaPS3;
  const harga = hargaPerangkat[durasiAwalMenit];

  dataBilling.riwayat[device].push({
    durasi: dataBilling.aktif[device].durasi,
    harga: harga,
    waktuMulai: dataBilling.aktif[device].waktuMulai,
    waktuSelesai: Math.floor(Date.now() / 1000),
  });

  delete dataBilling.aktif[device];

  const timerDisplay = document.querySelector(`#${device} .timer-display`);
  timerDisplay.textContent = "Waktu Habis";

  setTimeout(() => {
    timerDisplay.textContent = "";
    updateTombol(device);
    updateStruk();
  }, 3000);
}

// Update tombol
function updateTombol(device) {
  const aktif = dataBilling.aktif[device];
  const dijeda = aktif && aktif.dijeda;

  const startBtn = document.querySelector(`#${device} .btn-start`);
  const pauseBtn = document.querySelector(`#${device} .btn-pause`);
  const resumeBtn = document.querySelector(`#${device} .btn-resume`);
  const stopBtn = document.querySelector(`#${device} .btn-stop`);
  const cancelBtn = document.querySelector(`#${device} .btn-cancel`);

  startBtn.disabled = !!aktif;
  pauseBtn.disabled = !aktif || dijeda;
  resumeBtn.disabled = !dijeda;
  stopBtn.disabled = !aktif;
  cancelBtn.disabled = !aktif;
}

// Update struk
function updateStruk() {
  const receiptContent = document.getElementById("receipt-content");
  receiptContent.innerHTML = "";

  let total = 0;
  let adaTransaksi = false;

  perangkat.forEach((device) => {
    if (dataBilling.riwayat[device] && dataBilling.riwayat[device].length > 0) {
      adaTransaksi = true;

      const deviceContainer = document.createElement("div");
      deviceContainer.className = "device-transactions";

      const deviceHeader = document.createElement("div");
      deviceHeader.className = "device-header";
      deviceHeader.textContent = device;
      deviceContainer.appendChild(deviceHeader);

      const transaksiList = document.createElement("div");
      transaksiList.className = "transaksi-list";

      dataBilling.riwayat[device].forEach((transaksi, index) => {
        const transaksiItem = document.createElement("div");
        transaksiItem.className = "transaksi-item";

        const durasiMenit = Math.ceil(transaksi.durasi / 60);
        const waktu = new Date(
          transaksi.waktuSelesai * 1000
        ).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        transaksiItem.innerHTML = `
          <div class="transaksi-number">${index + 1}.</div>
          <div class="transaksi-duration">${durasiMenit} Menit</div>
          <div class="transaksi-time">(${waktu})</div>
          <div class="transaksi-price">${formatRupiah(transaksi.harga)}</div>
        `;

        transaksiList.appendChild(transaksiItem);
        total += transaksi.harga;
      });

      deviceContainer.appendChild(transaksiList);
      receiptContent.appendChild(deviceContainer);
    }
  });

  if (!adaTransaksi) {
    receiptContent.innerHTML =
      '<div class="no-transaction">Belum ada transaksi</div>';
  }

  document.getElementById("total-amount").textContent = `Total: ${formatRupiah(
    total
  )}`;
  dataBilling.total = total;
}

// Setup event listeners
function setupEventListeners() {
  perangkat.forEach((device) => {
    const jenis = device === "PS4" ? "PS4" : "PS3";
    const hargaPerangkat = jenis === "PS4" ? hargaPS4 : hargaPS3;

    // Tombol Mulai
    document
      .querySelector(`#${device} .btn-start`)
      .addEventListener("click", () => {
        const select = document.querySelector(`#${device} select`);
        const durasiMenit = parseInt(select.value);
        const harga = hargaPerangkat[durasiMenit];

        dataBilling.aktif[device] = {
          durasi: durasiMenit * 60,
          harga: harga,
          waktuMulai: Math.floor(Date.now() / 1000),
          waktuSelesai: Math.floor(Date.now() / 1000) + durasiMenit * 60,
          dijeda: false,
        };

        updateTimer();
        updateTombol(device);
        updateStruk();
      });

    // Tombol Jeda
    document
      .querySelector(`#${device} .btn-pause`)
      .addEventListener("click", () => {
        if (dataBilling.aktif[device]) {
          dataBilling.aktif[device].dijeda = true;
          dataBilling.aktif[device].sisaDijeda =
            dataBilling.aktif[device].waktuSelesai -
            Math.floor(Date.now() / 1000);
          updateTombol(device);
          updateTimer();
        }
      });

    // Tombol Lanjut
    document
      .querySelector(`#${device} .btn-resume`)
      .addEventListener("click", () => {
        if (dataBilling.aktif[device] && dataBilling.aktif[device].dijeda) {
          dataBilling.aktif[device].dijeda = false;
          dataBilling.aktif[device].waktuSelesai =
            Math.floor(Date.now() / 1000) +
            dataBilling.aktif[device].sisaDijeda;
          updateTombol(device);
          updateTimer();
        }
      });

    // Tombol Stop
    document
      .querySelector(`#${device} .btn-stop`)
      .addEventListener("click", () => {
        if (dataBilling.aktif[device]) {
          const durasiAwalMenit = dataBilling.aktif[device].durasi / 60;
          const hargaDibayar = hargaPerangkat[durasiAwalMenit];

          if (!dataBilling.riwayat[device]) dataBilling.riwayat[device] = [];
          dataBilling.riwayat[device].push({
            durasi: dataBilling.aktif[device].durasi,
            harga: hargaDibayar,
            waktuMulai: dataBilling.aktif[device].waktuMulai,
            waktuSelesai: Math.floor(Date.now() / 1000),
          });

          delete dataBilling.aktif[device];

          const timerDisplay = document.querySelector(
            `#${device} .timer-display`
          );
          timerDisplay.textContent = "Dihentikan";
          setTimeout(() => {
            timerDisplay.textContent = "";
            updateTombol(device);
            updateStruk();
          }, 2000);
        }
      });

    // Tombol Cancel
    document
      .querySelector(`#${device} .btn-cancel`)
      .addEventListener("click", () => {
        if (dataBilling.aktif[device]) {
          delete dataBilling.aktif[device];

          const timerDisplay = document.querySelector(
            `#${device} .timer-display`
          );
          timerDisplay.textContent = "Dibatalkan";
          setTimeout(() => {
            timerDisplay.textContent = "";
            updateTombol(device);
          }, 2000);
        }
      });
  });

  // Tombol Reset
  document.querySelector(".btn-reset").addEventListener("click", function () {
    if (
      confirm(
        "Apakah Anda yakin ingin mereset semua transaksi? Semua data akan hilang."
      )
    ) {
      dataBilling = {
        aktif: {},
        riwayat: {},
        total: 0,
      };

      perangkat.forEach((device) => {
        const timerDisplay = document.querySelector(
          `#${device} .timer-display`
        );
        timerDisplay.textContent = "";
      });

      localStorage.setItem("billingData", JSON.stringify(dataBilling));

      perangkat.forEach((device) => {
        updateTombol(device);
      });
      updateStruk();
    }
  });

  // Tombol Dark Mode
  const darkModeToggle = document.createElement("button");
  darkModeToggle.className = "btn btn-theme-toggle";
  darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Mode Gelap';
  darkModeToggle.addEventListener("click", toggleDarkMode);
  document.querySelector(".container").prepend(darkModeToggle);
}

// Toggle Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode")
  );

  const toggleBtn = document.querySelector(".btn-theme-toggle");
  if (document.body.classList.contains("dark-mode")) {
    toggleBtn.innerHTML = '<i class="fas fa-sun"></i> Mode Terang';
  } else {
    toggleBtn.innerHTML = '<i class="fas fa-moon"></i> Mode Gelap';
  }
}

// Inisialisasi
function init() {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }

  setupEventListeners();
  setInterval(updateTimer, 1000);
  updateStruk();

  perangkat.forEach((device) => {
    updateTombol(device);
  });
}

document.addEventListener("DOMContentLoaded", init);
