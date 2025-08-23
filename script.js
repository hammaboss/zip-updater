const video = document.getElementById("videoPlayer");
const tv = document.getElementById("tv");
const fileInput = document.getElementById("fileInput");
const linkInput = document.getElementById("linkInput");
const loadLinkBtn = document.getElementById("loadLink");
const channelList = document.getElementById("channelList");
const searchInput = document.getElementById("searchInput");
const qualitySelect = document.getElementById("qualitySelect");
const clearBtn = document.getElementById("clearChannels");
const exportBtn = document.getElementById("exportM3U");
const playBtn = document.getElementById("playBtn");
const muteBtn = document.getElementById("muteBtn");
const checkLinksBtn = document.getElementById("checkLinksBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const selectModeBtn = document.getElementById("selectModeBtn");
const loadTenBtn = document.getElementById("loadTenBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const statusEl = document.getElementById("status");
const fullscreenControls = document.getElementById("fullscreenControls");
const fsPrevBtn = document.getElementById("fsPrevBtn");
const fsNextBtn = document.getElementById("fsNextBtn");
const fsQualitySelect = document.getElementById("fsQualitySelect");
const exitFsBtn = document.getElementById("exitFsBtn");
const fsLoadNum = document.getElementById("fsLoadNum");
const fsSearchInput = document.getElementById("fsSearchInput");
const fsFillBtn = document.getElementById("fsFillBtn");

let hls;
let allChannels = [];
let currentIndex = 0;
let selectedChannels = new Set();
let selectMode = false;
let masterCache = [];
let fsControlsTimeout;

function parseM3UToArray(c) {
    const l = c.split(/\r?\n/);
    const o = [];
    const s = new Set();
    let n = "قناة غير معروفة";
    for (const r of l) {
        const t = r.trim();
        if (!t) continue;
        if (t.startsWith("#EXTINF")) {
            const m = t.match(/,(.*)$/);
            n = m ? m[1].trim() : "قناة غير معروفة";
        } else if (!t.startsWith("#")) {
            const u = t;
            if (!s.has(u)) {
                s.add(u);
                o.push({name: n, url: u});
            }
            n = "قناة غير معروفة";
        }
    }
    return o;
}

function mergeChannels(s, i) {
    const m = new Map();
    for (const e of s) m.set(e.url, e);
    for (const n of i) if (!m.has(n.url)) m.set(n.url, n);
    return Array.from(m.values());
}

function shuffle(a) {
    const t = a.slice();
    for (let i = t.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
}

async function isUrlReachable(u) {
    try {
        await fetch(u, {method: "HEAD", mode: "no-cors", cache: "no-cache", redirect: "follow"});
        return true;
    } catch {
        return false;
    }
}

function renderChannels(channels) {
    channelList.innerHTML = "";
    channels.forEach((ch, i) => {
        const div = document.createElement("div");
        div.className = "channel";
        if (selectedChannels.has(ch.url)) div.classList.add("selected");
        const num = document.createElement("div");
        num.className = "channel-number";
        num.textContent = i + 1;
        const name = document.createElement("div");
        name.className = "channel-name";
        name.textContent = ch.name;
        const moveInput = document.createElement("input");
        moveInput.type = "number";
        moveInput.className = "channel-move";
        moveInput.min = 1;
        moveInput.max = channels.length;
        moveInput.value = i + 1;
        moveInput.addEventListener("change", () => {
            const newIndex = parseInt(moveInput.value) - 1;
            if (newIndex >= 0 && newIndex < allChannels.length) {
                allChannels.splice(i, 1);
                allChannels.splice(newIndex, 0, ch);
                localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
                renderChannels(allChannels);
            }
        });
        div.appendChild(num);
        div.appendChild(name);
        div.appendChild(moveInput);
        div.addEventListener("click", () => {
            if (selectMode) {
                if (selectedChannels.has(ch.url)) {
                    selectedChannels.delete(ch.url);
                    div.classList.remove("selected");
                } else {
                    selectedChannels.add(ch.url);
                    div.classList.add("selected");
                }
            } else {
                playChannelByUrl(ch.url);
            }
        });
        channelList.appendChild(div);
    });
}

function playChannelByUrl(url) {
    const index = allChannels.findIndex(ch => ch.url === url);
    if (index !== -1) {
        playChannel(index);
    }
}

function playChannel(i) {
    if (i < 0 || i >= allChannels.length) return;
    currentIndex = i;
    const ch = allChannels[i];
    statusEl.textContent = "جاري تشغيل: " + (ch.name || ch.url);
    if (hls) {
        try {
            hls.destroy();
        } catch (e) {}
        hls = null;
    }
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(ch.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            qualitySelect.innerHTML = "";
            fsQualitySelect.innerHTML = "";
            const autoOption = document.createElement("option");
            autoOption.value = "auto";
            autoOption.text = "Auto";
            qualitySelect.appendChild(autoOption);
            fsQualitySelect.appendChild(autoOption.cloneNode(true));
            hls.levels.forEach((level, i) => {
                const o = document.createElement("option");
                o.value = i;
                o.text = level.height ? level.height + "p" : "Unknown";
                qualitySelect.appendChild(o);
                fsQualitySelect.appendChild(o.cloneNode(true));
            });
        });
        fetch(ch.url)
            .then(response => response.text())
            .then(text => {
                ch.m3u8Content = text;
            })
            .catch(error => {
                console.error("Failed to fetch M3U8 content:", error);
            });
        hls.on(Hls.Events.ERROR, function() {});
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = ch.url;
    } else video.src = ch.url;
    video.play().catch(() => {});
    updatePlayButtonIcon();
    localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
}

function updatePlayButtonIcon() {
    playBtn.innerHTML = video.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
}

qualitySelect.addEventListener("change", function() {
    if (!hls) return;
    hls.currentLevel = this.value === "auto" ? -1 : parseInt(this.value);
});

fsQualitySelect.addEventListener("change", function() {
    qualitySelect.value = this.value;
    qualitySelect.dispatchEvent(new Event('change'));
});

searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
        renderChannels(allChannels);
    } else {
        renderChannels(allChannels.filter(ch =>
            (ch.name || "").toLowerCase().includes(q) ||
            (ch.url || "").toLowerCase().includes(q) ||
            (ch.m3u8Content || "").toLowerCase().includes(q)
        ));
    }
});

fsSearchInput.addEventListener("input", () => {
    const q = fsSearchInput.value.trim().toLowerCase();
    if (!q) {
        renderChannels(allChannels);
    } else {
        renderChannels(allChannels.filter(ch =>
            (ch.name || "").toLowerCase().includes(q) ||
            (ch.url || "").toLowerCase().includes(q) ||
            (ch.m3u8Content || "").toLowerCase().includes(q)
        ));
    }
});

fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e2 => {
        const incoming = parseM3UToArray(e2.target.result);
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem("m3uChannels") || "[]");
        } catch {
            stored = [];
        }
        const combined = mergeChannels(stored, incoming);
        allChannels = combined;
        localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
        renderChannels(allChannels);
        if (allChannels.length > 0) playChannel(0);
        statusEl.textContent = "تمت إضافة قنوات من الملف. المحفوظ الآن: " + allChannels.length;
    };
    reader.readAsText(file);
    fileInput.value = "";
});

loadLinkBtn.addEventListener("click", async() => {
    const url = linkInput.value.trim();
    if (!url) return;
    try {
        statusEl.textContent = "جاري تحميل الرابط...";
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const text = await res.text();
        const incoming = parseM3UToArray(text);
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem("m3uChannels") || "[]");
        } catch {
            stored = [];
        }
        const combined = mergeChannels(stored, incoming);
        allChannels = combined;
        localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
        renderChannels(allChannels);
        if (allChannels.length > 0) playChannel(0);
        statusEl.textContent = "تمت إضافة قنوات من الرابط. المحفوظ الآن: " + allChannels.length;
    } catch {
        alert("فشل تحميل الرابط");
        statusEl.textContent = "فشل تحميل الرابط";
    }
    linkInput.value = "";
});

function clearChannels() {
    allChannels = [];
    selectedChannels.clear();
    renderChannels(allChannels);
    localStorage.removeItem("m3uChannels");
    statusEl.textContent = "تم مسح القنوات المحفوظة.";
}

clearBtn.addEventListener("click", clearChannels);

exportBtn.addEventListener("click", () => {
    let m3u = "#EXTM3U\n";
    allChannels.forEach(ch => {
        m3u += `#EXTINF:-1,${ch.name}\n${ch.url}\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([m3u], {type: "audio/x-mpegurl"}));
    a.download = "channels.m3u";
    a.click();
});

playBtn.addEventListener("click", () => {
    if (video.paused) video.play();
    else video.pause();
    updatePlayButtonIcon();
});
video.addEventListener("play", updatePlayButtonIcon);
video.addEventListener("pause", updatePlayButtonIcon);

muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    muteBtn.innerHTML = video.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
});

checkLinksBtn.addEventListener("click", async() => {
    statusEl.textContent = "جاري فحص القنوات...";
    for (let i = 0; i < allChannels.length; i++) {
        const ch = allChannels[i];
        const div = channelList.children[i];
        const nameDiv = div ? div.querySelector(".channel-name") : null;
        try {
            await fetch(ch.url, {method: 'HEAD', mode: 'no-cors'});
            if (nameDiv) nameDiv.style.color = "white";
        } catch {
            if (nameDiv) nameDiv.style.color = "red";
        }
    }
    statusEl.textContent = "انتهى فحص القنوات.";
});

deleteSelectedBtn.addEventListener("click", () => {
    if (selectedChannels.size === 0) return;
    allChannels = allChannels.filter(ch => !selectedChannels.has(ch.url));
    selectedChannels.clear();
    renderChannels(allChannels);
    localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
    statusEl.textContent = "تم حذف القنوات المحددة. المحفوظ الآن: " + allChannels.length;
});

selectModeBtn.addEventListener("click", () => {
    selectMode = !selectMode;
    selectModeBtn.style.background = selectMode ? "#4caf50" : "#03a9f4";
    if (!selectMode) selectedChannels.clear();
    renderChannels(allChannels);
});

prevBtn.addEventListener("click", () => {
    if (allChannels.length === 0) return;
    const idx = (currentIndex - 1 + allChannels.length) % allChannels.length;
    playChannel(idx);
});

nextBtn.addEventListener("click", () => {
    if (allChannels.length === 0) return;
    const idx = (currentIndex + 1) % allChannels.length;
    playChannel(idx);
});

fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        tv.requestFullscreen();
        tv.classList.add("fullscreen");
        showFsControls();
    } else {
        document.exitFullscreen();
        tv.classList.remove("fullscreen");
        hideFsControls();
    }
});

exitFsBtn.addEventListener("click", () => {
    document.exitFullscreen();
    tv.classList.remove("fullscreen");
    hideFsControls();
});

fsPrevBtn.addEventListener("click", () => prevBtn.click());
fsNextBtn.addEventListener("click", () => nextBtn.click());

fsFillBtn.addEventListener("click", () => {
    if (video.style.objectFit === "fill") {
        video.style.objectFit = "contain";
    } else {
        video.style.objectFit = "fill";
    }
});

function showFsControls() {
    fullscreenControls.classList.remove("hide");
    if (fsControlsTimeout) clearTimeout(fsControlsTimeout);
    fsControlsTimeout = setTimeout(() => {
        fullscreenControls.classList.add("hide");
    }, 5000);
}

function hideFsControls() {
    fullscreenControls.classList.add("hide");
    if (fsControlsTimeout) clearTimeout(fsControlsTimeout);
}

video.addEventListener("click", () => {
    if (tv.classList.contains("fullscreen")) {
        showFsControls();
    }
});

async function loadTenFromIptvOrg() {
    try {
        statusEl.textContent = "جاري تحميل القوائم من iptv-org...";
        const masterUrl = "https://iptv-org.github.io/iptv/index.m3u";
        const res = await fetch(masterUrl);
        if (!res.ok) throw new Error();
        const text = await res.text();
        if (masterCache.length === 0) {
            masterCache = parseM3UToArray(text).filter(ch => /\.m3u8?(\?|$)/i.test(ch.url));
        }
        const shuffled = shuffle(masterCache);
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem("m3uChannels") || "[]");
        } catch {
            stored = [];
        }
        const storedUrls = new Set(stored.map(ch => ch.url));
        const newOnes = [];
        for (const ch of shuffled) {
            if (newOnes.length >= 10) break;
            if (storedUrls.has(ch.url)) continue;
            const ok = await isUrlReachable(ch.url);
            if (ok) {
                newOnes.push(ch);
                storedUrls.add(ch.url);
            }
        }
        allChannels = mergeChannels(stored, newOnes);
        localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
        renderChannels(allChannels);
        statusEl.textContent = "المحفوظ الآن: " + allChannels.length + " (تمت الإضافة: " + newOnes.length + ")";
        if (allChannels.length > 0) playChannel(0);
    } catch {
        statusEl.textContent = "تعذر تحميل القنوات الجديدة";
    }
}
loadTenBtn.addEventListener("click", () => {
    loadTenFromIptvOrg();
});

window.addEventListener("load", async () => {
    try {
        const stored = JSON.parse(localStorage.getItem("m3uChannels") || "[]");
        allChannels = Array.isArray(stored) ? stored : [];
    } catch {
        allChannels = [];
    }
    renderChannels(allChannels);

    const searchQuery = prompt("أدخل اسم القناة للبحث (سيتم البحث في 10 قنوات عشوائية):");

    if (searchQuery) {
        statusEl.textContent = "جاري البحث عن قنوات مطابقة...";
        try {
            const masterUrl = "https://iptv-org.github.io/iptv/index.m3u";
            const res = await fetch(masterUrl);
            if (!res.ok) throw new Error();
            const text = await res.text();

            if (masterCache.length === 0) {
                masterCache = parseM3UToArray(text).filter(ch => /\.m3u8?(\?|$)/i.test(ch.url));
            }

            const shuffled = shuffle(masterCache);
            const foundChannels = shuffled.filter(ch =>
                ch.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            let newOnes = [];
            const storedUrls = new Set(allChannels.map(ch => ch.url));

            for (const ch of foundChannels) {
                if (newOnes.length >= 10) break;
                if (!storedUrls.has(ch.url)) {
                    newOnes.push(ch);
                }
            }
            
            const reachableNewOnes = [];
            for (const ch of newOnes) {
                const ok = await isUrlReachable(ch.url);
                if (ok) {
                    reachableNewOnes.push(ch);
                }
            }

            allChannels = mergeChannels(allChannels, reachableNewOnes);
            localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
            renderChannels(allChannels);

            if (reachableNewOnes.length > 0) {
                statusEl.textContent = `تم إضافة ${reachableNewOnes.length} قناة مطابقة لـ "${searchQuery}". المحفوظ الآن: ${allChannels.length}`;
            } else {
                statusEl.textContent = `لم يتم العثور على قنوات مطابقة لـ "${searchQuery}".`;
            }

        } catch (error) {
            console.error("Failed to fetch or search channels:", error);
            statusEl.textContent = "فشل في البحث عن القنوات.";
        }
    }

    if (allChannels.length > 0) {
        playChannel(0);
        statusEl.textContent = `جاهز. المحفوظ الآن: ${allChannels.length}`;
    } else {
        statusEl.textContent = "جاهز";
    }
});

fsLoadNum.addEventListener("change", async() => {
    const num = parseInt(fsLoadNum.value);
    if (!num || num < 1) return;
    try {
        statusEl.textContent = "جاري تحميل " + num + " قناة عشوائية...";
        const masterUrl = "https://iptv-org.github.io/iptv/index.m3u";
        const res = await fetch(masterUrl);
        if (!res.ok) throw new Error();
        const text = await res.text();
        if (masterCache.length === 0) {
            masterCache = parseM3UToArray(text).filter(ch => /\.m3u8?(\?|$)/i.test(ch.url));
        }
        const shuffled = shuffle(masterCache);
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem("m3uChannels") || "[]");
        } catch {
            stored = [];
        }
        const storedUrls = new Set(stored.map(ch => ch.url));
        const newOnes = [];
        for (const ch of shuffled) {
            if (newOnes.length >= num) break;
            if (storedUrls.has(ch.url)) continue;
            const ok = await isUrlReachable(ch.url);
            if (ok) {
                newOnes.push(ch);
                storedUrls.add(ch.url);
            }
        }
        allChannels = mergeChannels(stored, newOnes);
        localStorage.setItem("m3uChannels", JSON.stringify(allChannels));
        renderChannels(allChannels);
        statusEl.textContent = "المحفوظ الآن: " + allChannels.length + " (تمت الإضافة: " + newOnes.length + ")";
        if (allChannels.length > 0) playChannel(0);
    } catch {
        statusEl.textContent = "تعذر تحميل القنوات الجديدة";
    }
});
